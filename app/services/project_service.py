from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from ....models.project import Project
from ....schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_workspace(self, workspace_id: UUID) -> List[Project]:
        q = select(Project).where(Project.workspace_id == workspace_id)
        res = await self.db.execute(q)
        return res.scalars().all()

    async def get_by_id(self, project_id: UUID) -> Optional[Project]:
        q = select(Project).where(Project.id == project_id)
        res = await self.db.execute(q)
        return res.scalar_one_or_none()

    async def create(self, workspace_id: UUID, data: ProjectCreate, user_id: UUID) -> Project:
        proj = Project(
            workspace_id=workspace_id,
            name=data.name,
            description=getattr(data, 'description', None),
            tech_stack=getattr(data, 'tech_stack', {} ) or {},
            status=getattr(data, 'status', 'planning'),
            created_by=user_id
        )
        self.db.add(proj)
        await self.db.commit()
        await self.db.refresh(proj)
        return proj

    async def update(self, project_id: UUID, data: ProjectUpdate) -> Optional[Project]:
        proj = await self.get_by_id(project_id)
        if not proj:
            return None
        update_data = data.dict(exclude_unset=True)
        for k, v in update_data.items():
            setattr(proj, k, v)
        await self.db.commit()
        await self.db.refresh(proj)
        return proj

    async def delete(self, project_id: UUID) -> bool:
        proj = await self.get_by_id(project_id)
        if not proj:
            return False
        await self.db.delete(proj)
        await self.db.commit()
        return True
