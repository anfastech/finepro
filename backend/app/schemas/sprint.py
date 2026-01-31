from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from ..models.enums import SprintStatus
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .task import TaskResponse


class SprintBase(BaseModel):
    name: str
    start_date: datetime
    end_date: datetime
    status: SprintStatus = SprintStatus.PLANNING


class SprintCreate(SprintBase):
    project_id: UUID


class SprintUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[SprintStatus] = None


class SprintResponse(SprintBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    project_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None


class SprintWithTasks(SprintResponse):
    """Sprint with its tasks included"""
    tasks: List[dict] = []  # Will be populated with TaskResponse dicts