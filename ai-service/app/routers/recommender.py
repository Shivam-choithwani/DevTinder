import logging
from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from datetime import datetime
from app.models.schemas import (
    RecommendationRequest, 
    RecommendationResponseItem, 
    SwipeRecord, 
    CompatibilityResponse,
    FilterParams
)
from app.services.recommender import recommender_service
from app.db import (
    get_swipes_collection, 
    get_matches_collection, 
    get_builder_profiles_collection
)

router = APIRouter(prefix="/recommender", tags=["recommender"])
logger = logging.getLogger("devtinder.router.recommender")

@router.post("/feed", response_model=List[RecommendationResponseItem])
async def get_feed(request: RecommendationRequest):
    """
    Retrieves a customized list of recommended builder profiles for a given user,
    applying hard filters, vector similarity, and compatibility scoring.
    """
    try:
        recommendations = await recommender_service.get_recommendations(
            user_id=request.userId,
            filters=request.filters,
            limit=request.limit,
            skip=request.skip
        )
        return recommendations
    except Exception as e:
        logger.error(f"Error serving feed for user {request.userId}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error compiling recommendations feed: {str(e)}"
        )

@router.post("/swipe", status_code=status.HTTP_201_CREATED)
async def record_swipe(swipe: SwipeRecord):
    """
    Log a user swipe action (LIKE or PASS) and check for mutual matches.
    """
    swipes_coll = get_swipes_collection()
    
    # Save the swipe
    await swipes_coll.update_one(
        {"userId": swipe.userId, "targetUserId": swipe.targetUserId},
        {"$set": {
            "action": swipe.action.upper(),
            "timestamp": datetime.utcnow()
        }},
        upsert=True
    )
    
    match_created = False
    # If LIKE, check for mutual LIKE (match)
    if swipe.action.upper() == "LIKE":
        reverse_swipe = await swipes_coll.find_one({
            "userId": swipe.targetUserId,
            "targetUserId": swipe.userId,
            "action": "LIKE"
        })
        if reverse_swipe:
            matches_coll = get_matches_collection()
            # Save mutual match
            await matches_coll.update_one(
                {
                    "$or": [
                        {"userIds": [swipe.userId, swipe.targetUserId]},
                        {"userIds": [swipe.targetUserId, swipe.userId]}
                    ]
                },
                {"$set": {
                    "userIds": [swipe.userId, swipe.targetUserId],
                    "timestamp": datetime.utcnow()
                }},
                upsert=True
            )
            match_created = True
            logger.info(f"Mutual match created between {swipe.userId} and {swipe.targetUserId}!")
            
    return {
        "status": "success",
        "action": swipe.action,
        "isMatch": match_created
    }

@router.get("/compatibility", response_model=CompatibilityResponse)
async def get_compatibility(userId: str = Query(...), targetUserId: str = Query(...)):
    """
    Gets detailed mathematical compatibility score breakdown and AI text reasoning for 2 users.
    """
    profiles_coll = get_builder_profiles_collection()
    
    # Fetch profiles
    profile_a = await profiles_coll.find_one({"userId": userId})
    profile_b = await profiles_coll.find_one({"userId": targetUserId})
    
    if not profile_a or not profile_b:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both builder profiles do not exist."
        )
        
    p_a = BuilderProfile(**profile_a)
    p_b = BuilderProfile(**profile_b)
    
    # Check vector similarity
    from app.services.vector_service import vector_service
    vec_sim = 0.7
    if p_a.embedding and p_b.embedding:
        vec_sim = vector_service.cosine_similarity(p_a.embedding, p_b.embedding)
        
    comp = recommender_service.calculate_compatibility(p_a, p_b, vec_sim)
    
    from app.services.ai_service import ai_service
    reason = await ai_service.generate_matching_reason(p_a, p_b)
    
    return CompatibilityResponse(
        userId=userId,
        targetUserId=targetUserId,
        compatibilityScore=comp["score"],
        breakdown=comp["breakdown"],
        reason=reason
    )
