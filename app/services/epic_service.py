from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from ....models.epic import Epic
from ....schemas.epic import EpicCreate, EpicUpdate


class EpicService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_project(self, project_id: UUID):
        return []

    async def get_by_id(self, epic_id: UUID) -> Optional[Epic]:
        return None

    async def create(self, project_id: UUID, data: EpicCreate) -> Epic:
        raise NotImplementedError

    async def update(self, epic_id: UUID, data: EpicUpdate) -> Optional[Epic]:
        return None

    async def delete(self, epic_id: UUID) -> bool:
        return True
