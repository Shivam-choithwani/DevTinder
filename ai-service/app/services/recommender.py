import logging
import math
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timedelta, timezone
from app.db import (
    get_builder_profiles_collection,
    get_swipes_collection,
    get_users_collection
)
from app.models.schemas import BuilderProfile, FilterParams, CompatibilityResponse
from app.services.vector_service import vector_service
from app.services.ai_service import ai_service

logger = logging.getLogger("devtinder.recommender")

# Dictionary representing mapping from broad developer/need roles to tech stack and skills keywords
ROLE_SKILLS_MAPPING = {
    "frontend": {"react", "next.js", "typescript", "javascript", "css", "html", "vue", "angular", "tailwind", "frontend", "svelte", "ui/ux", "designer"},
    "designer": {"ui", "ux", "ui/ux", "design", "figma", "adobe", "sketch", "designer", "graphic"},
    "backend": {"python", "fastapi", "django", "flask", "go", "rust", "node", "express", "java", "spring", "c++", "c#", "mongodb", "postgres", "sql", "backend", "api", "database"},
    "ai": {"python", "fastapi", "langchain", "pytorch", "tensorflow", "keras", "openai", "gemini", "llm", "rag", "agents", "machine learning", "deep learning", "ai", "specialist"},
    "mobile": {"swift", "kotlin", "java", "react native", "flutter", "ios", "android", "mobile"}
}

def get_naive_utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

class RecommenderService:
    async def get_user_plan_and_swipes(self, user_id: str) -> Tuple[str, int, bool]:
        """
        Retrieves user plan (free/pro) and swiped count in the last 24 hours.
        Returns (plan_name, swipe_count_last_24h, can_swipe)
        """
        users_coll = get_users_collection()
        user = await users_coll.find_one({"_id": user_id}) or await users_coll.find_one({"userId": user_id})
        
        plan = "free"
        if user:
            plan = user.get("plan", "free").lower()
            
        swipes_coll = get_swipes_collection()
        time_threshold = get_naive_utc_now() - timedelta(hours=24)
        
        swipe_count = await swipes_coll.count_documents({
            "userId": user_id,
            "timestamp": {"$gte": time_threshold}
        })
        
        can_swipe = True
        if plan == "free" and swipe_count >= 20:
            can_swipe = False
            
        return plan, swipe_count, can_swipe

    async def calculate_preference_vector(self, user_id: str, base_embedding: List[float]) -> List[float]:
        """
        Calculates user preference vector based on recent LIKE history.
        Combines profile base embedding with recent likes (centroid).
        """
        swipes_coll = get_swipes_collection()
        profiles_coll = get_builder_profiles_collection()
        
        # Get last 15 LIKEd userIds
        cursor = swipes_coll.find({
            "userId": user_id,
            "action": "LIKE"
        }).sort("timestamp", -1).limit(15)
        
        liked_user_ids = []
        async for swipe in cursor:
            liked_user_ids.append(swipe["targetUserId"])
            
        if not liked_user_ids:
            return base_embedding # Default to base profile embedding if no history exists

        # Fetch liked profile embeddings
        liked_profiles_cursor = profiles_coll.find({
            "userId": {"$in": liked_user_ids},
            "embedding": {"$exists": True}
        })
        
        liked_embeddings = []
        async for profile in liked_profiles_cursor:
            emb = profile.get("embedding")
            if emb and len(emb) == len(base_embedding):
                liked_embeddings.append(emb)
                
        if not liked_embeddings:
            return base_embedding
            
        # Calculate centroid of liked profiles
        dims = len(base_embedding)
        centroid = [0.0] * dims
        for emb in liked_embeddings:
            for i in range(dims):
                centroid[i] += emb[i]
                
        for i in range(dims):
            centroid[i] /= len(liked_embeddings)
            
        # Blend: 60% original profile, 40% preferences history
        blended = [0.0] * dims
        for i in range(dims):
            blended[i] = 0.6 * base_embedding[i] + 0.4 * centroid[i]
            
        # Normalize the vector
        magnitude = math.sqrt(sum(x * x for x in blended))
        if magnitude > 0:
            blended = [x / magnitude for x in blended]
            
        return blended

    def _count_active_filters(self, filters: Optional[FilterParams]) -> int:
        if not filters:
            return 0
        attrs = [
            filters.domain, filters.location, filters.remote, filters.experience,
            filters.builderType, filters.techStack, filters.lookingFor,
            filters.startupStage, filters.commitment
        ]
        return sum(1 for attr in attrs if attr is not None)

    async def get_recommendations(
        self, 
        user_id: str, 
        filters: Optional[FilterParams] = None, 
        limit: int = 20, 
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Generate ranked recommendations pipeline for a given user.
        """
        # 1. Enforce Subscription Limitations
        plan, swipe_count, can_swipe = await self.get_user_plan_and_swipes(user_id)
        
        # Free plan restricts to 2 active filters maximum
        active_filter_count = self._count_active_filters(filters)
        adjusted_filters = filters
        if plan == "free" and active_filter_count > 2 and filters:
            logger.warning(f"Free user {user_id} requested {active_filter_count} filters. Limiting to first 2.")
            # Prune filters down to 2
            counter = 0
            pruned_dict = {}
            for k, v in filters.model_dump().items():
                if v is not None:
                    if counter < 2:
                        pruned_dict[k] = v
                        counter += 1
                    else:
                        pruned_dict[k] = None
            adjusted_filters = FilterParams(**pruned_dict)

        # 2. Get User's own Profile
        profiles_coll = get_builder_profiles_collection()
        user_profile_doc = await profiles_coll.find_one({"userId": user_id})
        if not user_profile_doc:
            logger.warning(f"No profile found for user {user_id} to base recommendations on.")
            return []
            
        user_profile = BuilderProfile(**user_profile_doc)
        if not user_profile.embedding:
            logger.warning(f"User profile {user_id} lacks vector embedding. Cannot run recommendation feed.")
            return []

        # 3. Exclude already swiped profiles
        swipes_coll = get_swipes_collection()
        swiped_cursor = swipes_coll.find({"userId": user_id})
        swiped_target_ids = set()
        async for swipe in swiped_cursor:
            swiped_target_ids.add(swipe["targetUserId"])
            
        # Calculate preference vector incorporating likes history
        preference_vector = await self.calculate_preference_vector(user_id, user_profile.embedding)

        # 4. Fetch Candidate Pool via Vector Similarity search + Hard Filters
        candidates = await vector_service.search_similar_builders(
            current_user_id=user_id,
            query_vector=preference_vector,
            filters=adjusted_filters,
            limit=100 # Retrieve larger pool to rank
        )

        # Filter out already swiped candidates
        candidates = [c for c in candidates if c["userId"] not in swiped_target_ids]

        # 5. Compute compatibility details & ranks
        ranked_feed = []
        for cand_doc in candidates:
            cand = BuilderProfile(**cand_doc)
            comp_details = self.calculate_compatibility(user_profile, cand, cand_doc.get("vector_score", 0.7))
            
            ranked_feed.append({
                "userId": cand.userId,
                "profile": cand,
                "compatibilityScore": comp_details["score"],
                "compatibilityReason": "", # will generate dynamically/lazily
                "subscriptionPlan": plan,
                "canSwipe": can_swipe
            })

        # Sort by final recommendation score descending
        ranked_feed.sort(key=lambda x: x["compatibilityScore"], reverse=True)
        paginated_feed = ranked_feed[skip : skip + limit]

        # Generate LLM Matching Reason for top candidates (limit LLM calls to reduce latency & API costs)
        for item in paginated_feed[:5]:
            item["compatibilityReason"] = await ai_service.generate_matching_reason(
                user_profile, item["profile"]
            )
            
        # Add basic reasoning for remaining items in page
        for item in paginated_feed[5:]:
            item["compatibilityReason"] = f"Aligned on {', '.join(set(user_profile.domains) & set(item['profile'].domains)) or 'General tech stack'}."

        return paginated_feed

    def calculate_compatibility(
        self, 
        user_a: BuilderProfile, 
        user_b: BuilderProfile, 
        vector_similarity: float
    ) -> Dict[str, Any]:
        """
        Evaluate candidate match score based on the 5-part compatibility formula.
        Score = 0.35 * ProjectSimilarity + 0.25 * ComplementarySkills + 0.20 * LookingForMatch + 0.10 * PreferenceHistory + 0.10 * Activity
        """
        # 1. Project Similarity (35%)
        project_similarity_score = max(0.0, vector_similarity) * 100.0

        # 2. Complementary Skills (25%)
        # Does B satisfy A's needs? Does A satisfy B's needs?
        skills_a = set(s.lower() for s in user_a.topTechnologies + user_a.skills)
        skills_b = set(s.lower() for s in user_b.topTechnologies + user_b.skills)
        
        needs_a = set(n.lower() for n in user_a.needs)
        needs_b = set(n.lower() for n in user_b.needs)
        
        def matches_any_need(need: str, candidate_skills: set) -> bool:
            need_lower = need.lower()
            if need_lower in candidate_skills:
                return True
            for skill in candidate_skills:
                if skill in need_lower or need_lower in skill:
                    return True
            # Mapping category check
            for category, mapped_skills in ROLE_SKILLS_MAPPING.items():
                if category in need_lower:
                    if mapped_skills.intersection(candidate_skills):
                        return True
            return False

        a_match_count = 0
        for need in needs_a:
            if matches_any_need(need, skills_b):
                a_match_count += 1
        a_match_ratio = a_match_count / len(needs_a) if needs_a else 1.0
            
        b_match_count = 0
        for need in needs_b:
            if matches_any_need(need, skills_a):
                b_match_count += 1
        b_match_ratio = b_match_count / len(needs_b) if needs_b else 1.0
            
        complementary_score = 0.5 * (a_match_ratio + b_match_ratio) * 100.0

        # 3. Looking For Match (20%)
        # Alignment of Builder Type / archetypes with looking for roles
        look_a = set(l.lower() for l in user_a.lookingFor)
        look_b = set(l.lower() for l in user_b.lookingFor)
        
        type_a = user_a.builderType.lower()
        type_b = user_b.builderType.lower()
        
        a_looking_match = 0.0
        if type_b in look_a or any(role in type_b for role in look_a):
            a_looking_match = 1.0
            
        b_looking_match = 0.0
        if type_a in look_b or any(role in type_a for role in look_b):
            b_looking_match = 1.0
            
        looking_for_score = 0.5 * (a_looking_match + b_looking_match) * 100.0

        # 4. Preference History (10%)
        pref_history_score = project_similarity_score

        # 5. Activity Score (10%)
        time_diff = get_naive_utc_now() - user_b.updatedAt
        if time_diff <= timedelta(days=1):
            activity_score = 100.0
        elif time_diff <= timedelta(days=7):
            activity_score = 80.0
        elif time_diff <= timedelta(days=30):
            activity_score = 50.0
        else:
            activity_score = 20.0

        # Final Compatibility Score calculation
        final_score = (
            0.35 * project_similarity_score +
            0.25 * complementary_score +
            0.20 * looking_for_score +
            0.10 * pref_history_score +
            0.10 * activity_score
        )

        return {
            "score": round(final_score, 1),
            "breakdown": {
                "projectSimilarity": round(project_similarity_score, 1),
                "complementarySkills": round(complementary_score, 1),
                "lookingForMatch": round(looking_for_score, 1),
                "preferenceHistory": round(pref_history_score, 1),
                "activityScore": round(activity_score, 1)
            }
        }

recommender_service = RecommenderService()

