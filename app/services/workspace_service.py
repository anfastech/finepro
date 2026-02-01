from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.workspace import Workspace
from ..models.member import Member
from ..models.user import User


class WorkspaceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_user_workspaces(self, user_id: UUID) -> List[Workspace]:
        q = (
            select(Workspace)
            .outerjoin(Member, Workspace.id == Member.workspace_id)
            .where((Workspace.owner_id == user_id) | (Member.user_id == user_id))
        )
        res = await self.db.execute(q)
        return res.scalars().all()

    async def get_by_id(self, workspace_id: UUID) -> Optional[Workspace]:
        q = select(Workspace).where(Workspace.id == workspace_id)
        res = await self.db.execute(q)
        return res.scalar_one_or_none()

    async def create(self, owner_id: UUID, name: str, supabase_id: Optional[str] = None) -> Workspace:
        ws = Workspace(name=name, owner_id=owner_id, supabase_id=supabase_id)
        self.db.add(ws)
        await self.db.commit()
        await self.db.refresh(ws)
        return ws

    async def update(self, workspace_id: UUID, data) -> Optional[Workspace]:
        ws = await self.get_by_id(workspace_id)
        if not ws:
            return None
        for k, v in data.items():
            setattr(ws, k, v)
        await self.db.commit()
        await self.db.refresh(ws)
        return ws

    async def delete(self, workspace_id: UUID) -> bool:
        ws = await self.get_by_id(workspace_id)
        if not ws:
            return False
        await self.db.delete(ws)
        await self.db.commit()
        return True
