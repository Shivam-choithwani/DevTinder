import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks, status
from datetime import datetime
from app.models.schemas import BuilderProfile, UserIntent, BuilderProfileUpdate
from app.services.github_service import github_service
from app.services.ai_service import ai_service
from app.db import (
    get_builder_profiles_collection, 
    get_github_profiles_collection
)

router = APIRouter(prefix="/profile", tags=["profile"])
logger = logging.getLogger("devtinder.router.profile")

@router.post("/generate/{userId}", response_model=BuilderProfile)
async def generate_profile(userId: str, intent: UserIntent):
    """
    Generate builder profile based on a GitHub username and user intent.
    This parses the GitHub metadata, generates structural fields via Gemini 2.5 Flash,
    calculates embedding, and stores the profile in MongoDB.
    """
    # Verify if user has a profile or if we need to fetch from their Github setup
    # In a full flow, the userId might already have a githubUsername in the users/profiles collection.
    # For independent backend testing, we will expect the user's userId to be their github username, 
    # or query user setup. To be safe, if the userId contains github letters, we'll use it as github username,
    # or look it up. Let's assume the userId represents the Github Username for easy testing, or allow it.
    github_username = userId
    
    logger.info(f"Generating profile for user {userId} using GitHub profile {github_username}")
    
    # Scrape GitHub
    git_data = await github_service.scrape_github_profile(github_username)
    if not git_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"GitHub profile for user '{github_username}' could not be retrieved."
        )
        
    # Save raw github profile metadata
    github_coll = get_github_profiles_collection()
    await github_coll.update_one(
        {"userId": userId},
        {"$set": {**git_data, "updatedAt": datetime.utcnow()}},
        upsert=True
    )
    
    # Generate Builder Profile using Gemini
    profile = await ai_service.generate_builder_profile(userId, git_data, intent)
    
    # Save generated profile to DB
    profile_coll = get_builder_profiles_collection()
    await profile_coll.update_one(
        {"userId": userId},
        {"$set": profile.model_dump()},
        upsert=True
    )
    
    return profile

@router.get("/{userId}", response_model=BuilderProfile)
async def get_profile(userId: str):
    """
    Retrieve user's builder profile.
    """
    profile_coll = get_builder_profiles_collection()
    doc = await profile_coll.find_one({"userId": userId})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Builder profile not found for user {userId}. Generate one first."
        )
    return BuilderProfile(**doc)

@router.put("/{userId}", response_model=BuilderProfile)
async def update_profile(userId: str, update_data: BuilderProfileUpdate):
    """
    Allows the user to manually correct/overwrite the AI-generated builder profile.
    Automatically regenerates embedding based on updated details.
    """
    profile_coll = get_builder_profiles_collection()
    existing_doc = await profile_coll.find_one({"userId": userId})
    if not existing_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Builder profile not found for user {userId}."
        )
        
    # Merge existing data and update data
    profile_dict = BuilderProfile(**existing_doc).model_dump()
    for field, val in update_data.model_dump(exclude_unset=True).items():
        profile_dict[field] = val
        
    updated_profile = BuilderProfile(**profile_dict)
    updated_profile.updatedAt = datetime.utcnow()
    
    # Regenerate embedding with new edits
    summary = ai_service._create_profile_summary_text(updated_profile)
    updated_profile.embedding = await ai_service.generate_embedding(summary)
    
    # Save back to database
    await profile_coll.update_one(
        {"userId": userId},
        {"$set": updated_profile.model_dump()},
        upsert=True
    )
    
    return updated_profile
