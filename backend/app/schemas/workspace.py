from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, TYPE_CHECKING
from datetime import datetime


from ..models.enums import MemberRole

# if TYPE_CHECKING:
#     from .user import UserResponse
from .user import UserResponse


class MemberBase(BaseModel):
    role: MemberRole = MemberRole.MEMBER


class MemberCreate(MemberBase):
    user_id: str
    workspace_id: str


class MemberUpdate(BaseModel):
    role: Optional[MemberRole] = None


class MemberResponse(MemberBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    user_id: str
    workspace_id: str
    joined_at: datetime
    user: Optional["UserResponse"] = None


class WorkspaceBase(BaseModel):
    name: str
    invite_code: Optional[str] = None


class WorkspaceCreateRequest(WorkspaceBase):
    pass


class WorkspaceCreate(WorkspaceBase):
    owner_id: str
    supabase_id: Optional[str] = None


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    invite_code: Optional[str] = None


class WorkspaceResponse(WorkspaceBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    owner_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class WorkspaceWithMembers(WorkspaceResponse):
    """Workspace with its members included"""
    members: list[MemberResponse] = []