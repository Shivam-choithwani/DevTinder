from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class UserIntent(BaseModel):
    whatToBuild: str = Field(..., description="What the user wants to build next")
    lookingFor: List[str] = Field(default_factory=list, description="Roles/Skills they are looking for (e.g., Designer, Frontend, Backend)")
    commitment: str = Field("Part Time", description="Commitment level (Weekend, Part Time, Full Time)")
    startupStage: str = Field("Idea", description="Current stage of the startup (Idea, MVP, Beta, Revenue)")

class BuilderProfile(BaseModel):
    userId: str
    builderType: str = Field(..., description="Developer builder archetype (e.g. AI Founder, Indie Hacker)")
    domains: List[str] = Field(default_factory=list, description="Target industries/domains (e.g. AI, DevTools)")
    topTechnologies: List[str] = Field(default_factory=list, description="Main languages/frameworks used")
    skills: List[str] = Field(default_factory=list, description="Comprehensive skills list")
    strengths: List[str] = Field(default_factory=list, description="Primary technical strengths")
    needs: List[str] = Field(default_factory=list, description="Cofounder/collaboration needs")
    lookingFor: List[str] = Field(default_factory=list, description="Roles looking to recruit")
    experienceLevel: str = Field("Intermediate", description="Experience tier (Junior, Intermediate, Senior, Expert)")
    commitment: str = Field("Part Time")
    startupStage: str = Field("Idea")
    location: Optional[str] = None
    remote: bool = True
    embedding: Optional[List[float]] = None
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class BuilderProfileUpdate(BaseModel):
    builderType: Optional[str] = None
    domains: Optional[List[str]] = None
    topTechnologies: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    strengths: Optional[List[str]] = None
    needs: Optional[List[str]] = None
    lookingFor: Optional[List[str]] = None
    experienceLevel: Optional[str] = None
    commitment: Optional[str] = None
    startupStage: Optional[str] = None
    location: Optional[str] = None
    remote: Optional[bool] = None

class SwipeRecord(BaseModel):
    userId: str
    targetUserId: str
    action: str = Field(..., description="LIKE or PASS")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class FilterParams(BaseModel):
    domain: Optional[str] = None
    location: Optional[str] = None
    remote: Optional[bool] = None
    experience: Optional[str] = None
    builderType: Optional[str] = None
    techStack: Optional[str] = None
    lookingFor: Optional[str] = None
    startupStage: Optional[str] = None
    commitment: Optional[str] = None

class RecommendationRequest(BaseModel):
    userId: str
    filters: Optional[FilterParams] = None
    limit: int = 20
    skip: int = 0

class RecommendationResponseItem(BaseModel):
    userId: str
    profile: BuilderProfile
    compatibilityScore: float
    compatibilityReason: str
    subscriptionPlan: str  # Free or Pro
    canSwipe: bool

class CompatibilityResponse(BaseModel):
    userId: str
    targetUserId: str
    compatibilityScore: float
    breakdown: Dict[str, float]
    reason: str
