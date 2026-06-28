import logging
import math
from typing import List, Dict, Any, Optional
from app.db import get_builder_profiles_collection
from app.models.schemas import FilterParams

logger = logging.getLogger("devtinder.vector")

class VectorService:
    def __init__(self):
        self.vector_index_name = "vector_index"

    def _build_filter_query(self, filters: Optional[FilterParams], current_user_id: str) -> Dict[str, Any]:
        """
        Builds the standard MongoDB query filters.
        """
        query: Dict[str, Any] = {"userId": {"$ne": current_user_id}} # Exclude current user
        
        if not filters:
            return query
            
        if filters.domain:
            query["domains"] = {"$in": [filters.domain]}
        if filters.location:
            query["location"] = {"$regex": filters.location, "$options": "i"}
        if filters.remote is not None:
            query["remote"] = filters.remote
        if filters.experience:
            query["experienceLevel"] = filters.experience
        if filters.builderType:
            query["builderType"] = filters.builderType
        if filters.startupStage:
            query["startupStage"] = filters.startupStage
        if filters.commitment:
            query["commitment"] = filters.commitment
        if filters.techStack:
            query["topTechnologies"] = {"$in": [filters.techStack]}
        if filters.lookingFor:
            query["lookingFor"] = {"$in": [filters.lookingFor]}
            
        return query

    async def search_similar_builders(
        self, 
        current_user_id: str, 
        query_vector: List[float], 
        filters: Optional[FilterParams] = None, 
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Queries database for similar developer profiles using Atlas Vector Search with fallback to Python-based cosine similarity.
        """
        coll = get_builder_profiles_collection()
        mongo_filter = self._build_filter_query(filters, current_user_id)
        
        # 1. Try MongoDB Atlas Vector Search ($vectorSearch stage)
        pipeline = [
            {
                "$vectorSearch": {
                    "index": self.vector_index_name,
                    "path": "embedding",
                    "queryVector": query_vector,
                    "numCandidates": limit * 2,
                    "limit": limit
                }
            }
        ]
        
        # Add match stage for standard filters
        if mongo_filter:
            pipeline.append({"$match": mongo_filter})
            
        try:
            logger.info("Executing Atlas Vector Search...")
            cursor = coll.aggregate(pipeline)
            results = []
            async for doc in cursor:
                # Add vector score from search
                doc["vector_score"] = doc.get("score") or doc.get("vector_score") or 0.8
                results.append(doc)
            return results
        except Exception as e:
            logger.warning(
                f"Atlas Vector Search failed or index not ready: {e}. "
                "Falling back to local database query with Python cosine similarity."
            )
            return await self._local_vector_search_fallback(current_user_id, query_vector, mongo_filter, limit)

    async def _local_vector_search_fallback(
        self, 
        current_user_id: str, 
        query_vector: List[float], 
        mongo_filter: Dict[str, Any], 
        limit: int
    ) -> List[Dict[str, Any]]:
        """
        Fallback search for databases that don't support $vectorSearch (like local MongoDB).
        """
        coll = get_builder_profiles_collection()
        results = []
        
        # Fetch all matching candidates from standard query
        cursor = coll.find(mongo_filter)
        async for doc in cursor:
            candidate_vector = doc.get("embedding")
            if not candidate_vector or len(candidate_vector) != len(query_vector):
                continue
                
            # Cosine similarity calculation
            score = self.cosine_similarity(query_vector, candidate_vector)
            doc["vector_score"] = score
            results.append(doc)
            
        # Sort by similarity descending
        results.sort(key=lambda x: x["vector_score"], reverse=True)
        return results[:limit]

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        """
        Compute standard cosine similarity between two float vectors.
        """
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
            
        dot = sum(a * b for a, b in zip(v1, v2))
        norm_a = math.sqrt(sum(a * a for a in v1))
        norm_b = math.sqrt(sum(b * b for b in v2))
        
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
            
        return dot / (norm_a * norm_b)

vector_service = VectorService()
