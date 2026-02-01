from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime


from ..models.enums import Priority, EpicStatus
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .task import TaskResponse


class EpicBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    status: EpicStatus = EpicStatus.TODO
    estimated_hours: Optional[float] = None
    sequence_order: Optional[int] = None


class EpicCreate(EpicBase):
    project_id: str


class EpicUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[Priority] = None
    status: Optional[EpicStatus] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    sequence_order: Optional[int] = None


class EpicResponse(EpicBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    project_id: str
    actual_hours: float
    created_at: datetime
    updated_at: Optional[datetime] = None


class EpicWithTasks(EpicResponse):
    """Epic with its tasks included"""
    tasks: List[dict] = []  # Will be populated with TaskResponse dicts