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
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
    SUPABASE_ISSUER: str = os.getenv("SUPABASE_ISSUER", "")
    
    # JWT settings for our app
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Debug settings
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "")

    @property
    def supabase_url(self) -> str:
        """Get Supabase URL"""
        return self.SUPABASE_URL or ""
    
    @property
    def supabase_service_role_key(self) -> str:
        """Get Supabase service role key"""
        return self.SUPABASE_SERVICE_ROLE_KEY or ""
    
    @property
    def supabase_anon_key(self) -> str:
        """Get Supabase anon key"""
        return self.SUPABASE_ANON_KEY or ""
    
    @property
    def database_url(self) -> str:
        """Get database URL for proper async usage"""
        return self.DATABASE_URL or ""

# Create global settings instance
settings = Settings()
