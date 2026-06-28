import logging
import json
import random
from typing import Dict, List, Any, Optional
from google import genai
from google.genai import types
from app.config import settings
from app.models.schemas import BuilderProfile, UserIntent

logger = logging.getLogger("devtinder.ai")

class AIService:
    def __init__(self):
        self.enabled = bool(settings.GEMINI_API_KEY)
        if self.enabled:
            try:
                self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.info("Gemini API Client initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {e}. Switching to fallback mode.")
                self.enabled = False
        else:
            logger.warning("GEMINI_API_KEY not provided. Running in OFFLINE/MOCK fallback mode.")

    async def generate_builder_profile(self, userId: str, github_data: Dict[str, Any], user_intent: UserIntent) -> BuilderProfile:
        """
        Generates a BuilderProfile using Gemini 2.5 Flash based on GitHub metadata and UserIntent.
        """
        if not self.enabled:
            return self._generate_mock_profile(userId, github_data, user_intent)

        # Prepare payload
        prompt = f"""
You are an expert AI recruiter matching technical cofounders for hackathons and startups.
Analyze the following developer's GitHub metadata and their stated intent.

GitHub Metadata:
{json.dumps(github_data, indent=2)}

User Intent:
{user_intent.model_dump_json(indent=2)}

Generate a structured Builder Profile in JSON format containing:
- builderType: A short archetype representing this developer (e.g., "AI SaaS Founder", "Indie Hacker", "Full Stack Engineer", "Mobile Builder", "Backend Architect"). Choose a premium, descriptive name.
- domains: A list of 2-4 industry sectors or engineering domains (e.g., "AI", "Developer Tools", "SaaS", "E-commerce", "Fintech", "Web3").
- topTechnologies: A list of 3-5 primary technologies they use (e.g. Python, React, Next.js, FastAPI, LangChain, Rust, Go).
- skills: A list of 5-8 programming languages, frameworks, or databases they specialize in.
- strengths: A list of 2-4 technical strengths (e.g., "Scalable backend", "Machine learning", "API Design", "UX/UI").
- needs: A list of 2-4 skills or roles they are looking for in a collaborator (e.g., "Frontend", "UI/UX Design", "Marketing", "Mobile App Dev").
- lookingFor: A list of roles they want to recruit.
- experienceLevel: One of "Junior", "Intermediate", "Senior", "Expert".
- commitment: One of "Weekend", "Part Time", "Full Time".
- startupStage: One of "Idea", "MVP", "Beta", "Revenue".

Output MUST be a valid JSON object matching the exact keys specified. Do not wrap the JSON output in markdown ```json blocks.
"""
        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2
                )
            )
            profile_data = json.loads(response.text.strip())
            
            # Formulate Pydantic BuilderProfile
            profile = BuilderProfile(
                userId=userId,
                builderType=profile_data.get("builderType", "Full Stack Developer"),
                domains=profile_data.get("domains", ["SaaS"]),
                topTechnologies=profile_data.get("topTechnologies", []),
                skills=profile_data.get("skills", []),
                strengths=profile_data.get("strengths", []),
                needs=profile_data.get("needs", []),
                lookingFor=profile_data.get("lookingFor", []),
                experienceLevel=profile_data.get("experienceLevel", "Intermediate"),
                commitment=profile_data.get("commitment", user_intent.commitment),
                startupStage=profile_data.get("startupStage", user_intent.startupStage),
                location=github_data.get("location")
            )
            
            # Generate embedding
            summary = self._create_profile_summary_text(profile)
            profile.embedding = await self.generate_embedding(summary)
            return profile
        except Exception as e:
            logger.error(f"Error calling Gemini to generate profile: {e}. Falling back to mock generator.")
            return self._generate_mock_profile(userId, github_data, user_intent)

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate a 768-dimension vector embedding using text-embedding-004.
        """
        if not self.enabled:
            # Generate a reproducible mock embedding vector (length 768) based on hash of text
            random.seed(hash(text))
            return [random.uniform(-1.0, 1.0) for _ in range(768)]

        try:
            response = self.client.models.embed_content(
                model="text-embedding-004",
                contents=text
            )
            # Fetch embedding values
            embedding_val = response.embeddings[0].values
            return embedding_val
        except Exception as e:
            logger.error(f"Error generating embedding: {e}. Returning mock embedding.")
            random.seed(hash(text))
            return [random.uniform(-1.0, 1.0) for _ in range(768)]

    async def generate_matching_reason(self, user_profile: BuilderProfile, target_profile: BuilderProfile) -> str:
        """
        Generate a localized matching explanation between two profiles.
        """
        if not self.enabled:
            return f"Both profiles match on domains: {', '.join(set(user_profile.domains) & set(target_profile.domains)) or 'General Software'}. They complement each other's tech stacks."

        prompt = f"""
You are an AI matchmaking assistant. Analyze the compatibility between two startup builders.

User A (Requester):
- Builder Type: {user_profile.builderType}
- Domains: {", ".join(user_profile.domains)}
- Top Technologies: {", ".join(user_profile.topTechnologies)}
- Strengths: {", ".join(user_profile.strengths)}
- Needs: {", ".join(user_profile.needs)}
- Startup Stage: {user_profile.startupStage}

User B (Candidate):
- Builder Type: {target_profile.builderType}
- Domains: {", ".join(target_profile.domains)}
- Top Technologies: {", ".join(target_profile.topTechnologies)}
- Strengths: {", ".join(target_profile.strengths)}
- Needs: {", ".join(target_profile.needs)}
- Startup Stage: {target_profile.startupStage}

Write a short, compelling compatibility explanation (max 2 sentences) explaining why User A and User B are a great fit. Highlight complementary skills, shared domains, and how their needs align.
Example: Both build AI SaaS products. You need a frontend cofounder. They specialize in React and UI/UX.
"""
        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=100
                )
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Error generating matching reason: {e}")
            return f"Matching Builder Type: {target_profile.builderType}. Specializes in: {', '.join(target_profile.topTechnologies[:2])}."

    def _create_profile_summary_text(self, profile: BuilderProfile) -> str:
        """
        Create a cohesive text representation of a profile for vector search indexing.
        """
        return (
            f"Builder Type: {profile.builderType}. "
            f"Domains: {', '.join(profile.domains)}. "
            f"Top Tech: {', '.join(profile.topTechnologies)}. "
            f"Skills: {', '.join(profile.skills)}. "
            f"Strengths: {', '.join(profile.strengths)}. "
            f"Needs: {', '.join(profile.needs)}. "
            f"Looking For: {', '.join(profile.lookingFor)}. "
            f"Experience: {profile.experienceLevel}. "
            f"Startup Stage: {profile.startupStage}."
        )

    def _generate_mock_profile(self, userId: str, github_data: Dict[str, Any], user_intent: UserIntent) -> BuilderProfile:
        """
        Offline rule-based profile builder to ensure the API works without Gemini Keys.
        """
        logger.info("Generating Mock Profile using offline rule-based heuristics.")
        
        # Heuristical analysis of github languages
        git_langs = list(github_data.get("languages", {}).keys())
        top_tech = git_langs[:3] if git_langs else ["JavaScript", "Python"]
        if "Python" in git_langs or "FastAPI" in github_data.get("dependencies", []):
            builder_type = "AI SaaS Founder"
            domains = ["AI", "Developer Tools", "SaaS"]
            strengths = ["Backend Development", "AI Integration"]
            needs = ["Frontend Developer", "Designer"]
        else:
            builder_type = "Full Stack Engineer"
            domains = ["SaaS", "E-commerce"]
            strengths = ["Frontend Development", "API Design"]
            needs = ["Backend Architect", "Marketer"]

        for req_role in user_intent.lookingFor:
            if req_role not in needs:
                needs.insert(0, req_role)

        profile = BuilderProfile(
            userId=userId,
            builderType=builder_type,
            domains=domains,
            topTechnologies=top_tech,
            skills=git_langs + github_data.get("dependencies", [])[:5],
            strengths=strengths,
            needs=needs,
            lookingFor=user_intent.lookingFor,
            experienceLevel="Senior" if github_data.get("public_repos", 0) > 15 else "Intermediate",
            commitment=user_intent.commitment,
            startupStage=user_intent.startupStage,
            location=github_data.get("location") or "Remote"
        )
        
        # Sync mock embedding
        summary = self._create_profile_summary_text(profile)
        random.seed(hash(summary))
        profile.embedding = [random.uniform(-1.0, 1.0) for _ in range(768)]
        return profile

ai_service = AIService()
