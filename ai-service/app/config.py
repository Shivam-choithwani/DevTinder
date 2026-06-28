import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # MongoDB Atlas Connection
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "devtinder"
    
    # Gemini API settings
    GEMINI_API_KEY: str = ""
    
    # GitHub Integration
    GITHUB_TOKEN: str = ""
    
    # App config
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
