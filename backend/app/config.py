import os
from typing import Optional
from dotenv import load_dotenv
load_dotenv()

class Settings:
    """Application settings"""
    
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    DB_USER: str = os.getenv("DB_USER", "")
    
    # Supabase Configuration
    SUPABASE_JWT_SECRET: Optional[str] = os.getenv("SUPABASE_JWT_SECRET", "")
    SUPABASE_ISSUER: Optional[str] = os.getenv("SUPABASE_ISSUER", "https://your-project.supabase.co")
    
    # Debug settings
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "")

    @property
    def database_url(self) -> str:
        """Get database URL for proper async usage"""
        return self.DATABASE_URL or ""

# Create global settings instance
settings = Settings()