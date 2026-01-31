from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.member import Member


class MemberService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_members(self, workspace_id: UUID) -> List[Member]:
        return []

    async def get_membership(self, user_id: UUID, workspace_id: UUID) -> Member | None:
        return None
