from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None


class SupabaseTokenRequest(BaseModel):
    """Request to verify Supabase JWT and get FastAPI tokens"""
    supabase_token: str


class SupabaseTokenResponse(BaseModel):
    """Response with user info from Supabase token"""
    user_id: str
    email: str
    name: str
    message: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class CommonResponse(BaseModel):
    """Common response wrapper"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


class HealthCheck(BaseModel):
    """Health check response"""
    status: str
    database: str
    version: str = "1.0.0"
    timestamp: datetime


class AuthExchangeResponse(Token):
    """Response for auth exchange with onboarding info"""
    onboarding_required: bool
    redirect_url: str