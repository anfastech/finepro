"""
Project Service - Business logic for project operations
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from typing import Optional, List
from uuid import UUID

from app.models.project import Project
from app.models.member import Member
from app.models.enums import ProjectStatus, ActionType, EntityType
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.activity_service import ActivityService


class ProjectService:
    """Service for project CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.activity_service = ActivityService(db)
    
    async def get_by_id(self, project_id: UUID) -> Optional[Project]:
        """Get project by ID with relationships"""
        result = await self.db.execute(
            select(Project)
            .options(selectinload(Project.epics))
            .where(Project.id == project_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_workspace(self, workspace_id: UUID) -> List[Project]:
        """Get all projects in a workspace"""
        result = await self.db.execute(
            select(Project)
            .where(Project.workspace_id == workspace_id)
            .order_by(Project.created_at.desc())
        )
        return list(result.scalars().all())
    
    async def create(
        self,
        workspace_id: UUID,
        data: ProjectCreate,
        user_id: UUID
    ) -> Project:
        """Create a new project"""
        project = Project(
            workspace_id=workspace_id,
            name=data.name,
            description=data.description,
            tech_stack=data.tech_stack or {},
            status=data.status,
            created_by=user_id
        )
        
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        
        # Log activity
        await self.activity_service.log(
            user_id=user_id,
            action=ActionType.CREATED,
            entity_type=EntityType.PROJECT,
            entity_id=project.id,
            changes={"name": project.name, "workspace_id": str(workspace_id)}
        )
        
        return project
    
    async def update(self, project_id: UUID, data: ProjectUpdate, user_id: UUID) -> Optional[Project]:
        """Update a project"""
        project = await self.get_by_id(project_id)
        if not project:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(project, field, value)
        
        await self.db.commit()
        await self.db.refresh(project)
        
        # Log activity
        await self.activity_service.log(
            user_id=user_id,
            action=ActionType.UPDATED,
            entity_type=EntityType.PROJECT,
            entity_id=project.id,
            changes=update_data
        )
        
        return project
    
    async def delete(self, project_id: UUID, user_id: UUID) -> bool:
        """Delete a project"""
        result = await self.db.execute(
            delete(Project).where(Project.id == project_id)
        )
        await self.db.commit()
        
        if result.rowcount > 0:
            # Log activity
            await self.activity_service.log(
                user_id=user_id,
                action=ActionType.DELETED,
                entity_type=EntityType.PROJECT,
                entity_id=project_id
            )
            return True
        return False
    
    async def verify_access(
        self,
        project_id: UUID,
        user_id: UUID
    ) -> bool:
        """Verify user has access to project via workspace membership"""
        project = await self.get_by_id(project_id)
        if not project:
            return False
        
        result = await self.db.execute(
            select(Member).where(
                Member.workspace_id == project.workspace_id,
                Member.user_id == user_id
            )
        )
        member = result.scalar_one_or_none()
        return member is not None

