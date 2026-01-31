"""
Epic Service - Business logic for epic operations
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from typing import Optional, List
from uuid import UUID

from app.models.epic import Epic
from app.models.enums import ActionType, EntityType
from app.schemas.epic import EpicCreate, EpicUpdate
from app.services.activity_service import ActivityService


class EpicService:
    """Service for managing epics"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.activity_service = ActivityService(db)
    
    async def get_by_id(self, epic_id: UUID) -> Optional[Epic]:
        """Get epic by ID with tasks"""
        result = await self.db.execute(
            select(Epic)
            .options(selectinload(Epic.tasks))
            .where(Epic.id == epic_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_project(self, project_id: UUID) -> List[Epic]:
        """Get all epics in a project"""
        result = await self.db.execute(
            select(Epic)
            .where(Epic.project_id == project_id)
            .order_by(Epic.sequence_order.asc().nullslast(), Epic.created_at.desc())
        )
        return list(result.scalars().all())
    
    async def create(self, data: EpicCreate, user_id: UUID) -> Epic:
        """Create a new epic"""
        epic = Epic(
            project_id=data.project_id,
            title=data.title,
            description=data.description,
            priority=data.priority,
            status=data.status,
            estimated_hours=data.estimated_hours,
            sequence_order=data.sequence_order
        )
        
        self.db.add(epic)
        await self.db.commit()
        await self.db.refresh(epic)
        
        # Log activity
        await self.activity_service.log(
            user_id=user_id,
            action=ActionType.CREATED,
            entity_type=EntityType.EPIC,
            entity_id=epic.id,
            changes={"title": epic.title, "project_id": str(epic.project_id)}
        )
        
        return epic
    
    async def update(self, epic_id: UUID, data: EpicUpdate, user_id: UUID) -> Optional[Epic]:
        """Update an epic"""
        epic = await self.get_by_id(epic_id)
        if not epic:
            return None
            
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(epic, field, value)
            
        await self.db.commit()
        await self.db.refresh(epic)
        
        # Log activity
        await self.activity_service.log(
            user_id=user_id,
            action=ActionType.UPDATED,
            entity_type=EntityType.EPIC,
            entity_id=epic.id,
            changes=update_data
        )
        
        return epic
    
    async def delete(self, epic_id: UUID, user_id: UUID) -> bool:
        """Delete an epic"""
        epic = await self.get_by_id(epic_id)
        if not epic:
            return False
            
        project_id = epic.project_id
        
        result = await self.db.execute(
            delete(Epic).where(Epic.id == epic_id)
        )
        await self.db.commit()
        
        if result.rowcount > 0:
            # Log activity
            await self.activity_service.log(
                user_id=user_id,
                action=ActionType.DELETED,
                entity_type=EntityType.EPIC,
                entity_id=epic_id,
                changes={"project_id": str(project_id)}
            )
            return True
        return False
