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


class AppwriteTokenRequest(BaseModel):
    """Request to verify Appwrite JWT and get FastAPI tokens"""
    appwrite_token: str


class AppwriteTokenResponse(BaseModel):
    """Response with user info from Appwrite token"""
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