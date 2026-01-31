from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID

from ..models.enums import ProjectStatus
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .epic import EpicResponse


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    tech_stack: Dict[str, Any] = {}
    status: ProjectStatus = ProjectStatus.PLANNING
    ai_generated: bool = False
    complexity_score: Optional[float] = None
    start_date: Optional[datetime] = None
    target_end_date: Optional[datetime] = None


class ProjectCreateRequest(ProjectBase):
    pass  # Only needs fields from ProjectBase (name, description, etc.)


class ProjectCreate(ProjectBase):
    workspace_id: UUID
    created_by: UUID


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tech_stack: Optional[Dict[str, Any]] = None
    status: Optional[ProjectStatus] = None
    ai_generated: Optional[bool] = None
    complexity_score: Optional[float] = None
    start_date: Optional[datetime] = None
    target_end_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None


class ProjectResponse(ProjectBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    workspace_id: UUID
    created_by: UUID
    actual_end_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class ProjectWithEpics(ProjectResponse):
    """Project with its epics included"""
    epics: List[dict] = []  # Will be populated with EpicResponse dicts