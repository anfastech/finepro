from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID

from ..models.enums import UserRole


class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.DEVELOPER
    skills: Dict[str, Any] = {}
    availability: Dict[str, Any] = {}
    workload_percentage: int = 0
    preferences: Dict[str, Any] = {}
    whatsapp_number: Optional[str] = None
    notification_settings: Dict[str, Any] = {}


class UserCreate(UserBase):
    supabase_id: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    skills: Optional[Dict[str, Any]] = None
    availability: Optional[Dict[str, Any]] = None
    preferences: Optional[Dict[str, Any]] = None
    whatsapp_number: Optional[str] = None
    notification_settings: Optional[Dict[str, Any]] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    supabase_id: str
    last_sync: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None


class UserInDB(UserResponse):
    """Schema for user stored in database"""
    pass