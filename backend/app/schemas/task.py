from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID

from ..models.enums import Priority, TaskType, TaskStatus
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .comment import CommentResponse


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    task_type: TaskType = TaskType.BACKEND
    status: TaskStatus = TaskStatus.TODO
    priority: Priority = Priority.MEDIUM
    estimated_hours: Optional[float] = None
    due_date: Optional[datetime] = None
    dependencies: List[UUID] = []
    tags: List[str] = []
    ai_confidence: Optional[float] = None
    additional_data: Dict[str, Any] = {}
    position: Optional[int] = None



class TaskCreateRequest(TaskBase):
    epic_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    # created_by is inferred from current_user


class TaskCreate(TaskBase):
    epic_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    created_by: UUID


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[TaskType] = None
    status: Optional[TaskStatus] = None
    priority: Optional[Priority] = None
    assigned_to: Optional[UUID] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    dependencies: Optional[List[UUID]] = None
    tags: Optional[List[str]] = None
    ai_confidence: Optional[float] = None
    additional_data: Optional[Dict[str, Any]] = None
    position: Optional[int] = None


class TaskResponse(TaskBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    epic_id: Optional[UUID]
    assigned_to: Optional[UUID]
    created_by: UUID
    actual_hours: float
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class TaskWithComments(TaskResponse):
    """Task with its comments included"""
    comments: List[dict] = []  # Will be populated with CommentResponse dicts


class BulkTaskUpdateItem(BaseModel):
    id: UUID
    position: int
    status: TaskStatus


class BulkTaskUpdate(BaseModel):
    tasks: List[BulkTaskUpdateItem]