from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID


class CommentBase(BaseModel):
    content: str


class CommentCreate(CommentBase):
    task_id: UUID
    user_id: UUID


class CommentUpdate(BaseModel):
    content: Optional[str] = None


class CommentResponse(CommentBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    task_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None