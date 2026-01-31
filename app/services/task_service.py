from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from ....models.task import Task
from ....schemas.task import TaskCreate, TaskUpdate


class TaskService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_project(self, project_id: UUID) -> List[Task]:
        return []

    async def get_by_id(self, task_id: UUID) -> Optional[Task]:
        return None

    async def create(self, project_id: UUID, data: TaskCreate, user_id: UUID) -> Task:
        raise NotImplementedError

    async def update(self, task_id: UUID, data: TaskUpdate) -> Optional[Task]:
        return None

    async def delete(self, task_id: UUID) -> bool:
        return True

    async def assign(self, task_id: UUID, user_id: UUID):
        return {"assigned_to": str(user_id)}

    async def bulk_update(self, payload: List[TaskUpdate]):
        return {"updated": len(payload)}
