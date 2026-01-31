"""
Sprint Service - Business logic for sprint operations
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from uuid import UUID

from app.models.sprint import Sprint, SprintTask
from app.models.enums import ActionType, EntityType
from app.schemas.sprint import SprintCreate, SprintUpdate
from app.services.activity_service import ActivityService


class SprintService:
    """Service for managing sprints and sprint-task assignments"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.activity_service = ActivityService(db)
    
    async def get_by_id(self, sprint_id: UUID) -> Optional[Sprint]:
        """Get sprint by ID with tasks"""
        result = await self.db.execute(
            select(Sprint)
            .options(selectinload(Sprint.tasks))
            .where(Sprint.id == sprint_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_project(self, project_id: UUID) -> List[Sprint]:
        """Get all sprints in a project"""
        result = await self.db.execute(
            select(Sprint)
            .where(Sprint.project_id == project_id)
            .order_by(Sprint.start_date.desc())
        )
        return list(result.scalars().all())
    
    async def create(self, data: SprintCreate, user_id: UUID) -> Sprint:
        """Create a new sprint"""
        sprint = Sprint(
            project_id=data.project_id,
            name=data.name,
            start_date=data.start_date,
            end_date=data.end_date,
            status=data.status
        )
        
        self.db.add(sprint)
        await self.db.commit()
        await self.db.refresh(sprint)
        
        # Log activity
        await self.activity_service.log(
            user_id=user_id,
            action=ActionType.CREATED,
            entity_type=EntityType.SPRINT,
            entity_id=sprint.id,
            changes={"name": sprint.name, "project_id": str(sprint.project_id)}
        )
        
        return sprint
    
    async def update(self, sprint_id: UUID, data: SprintUpdate, user_id: UUID) -> Optional[Sprint]:
        """Update a sprint"""
        sprint = await self.get_by_id(sprint_id)
        if not sprint:
            return None
            
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(sprint, field, value)
            
        await self.db.commit()
        await self.db.refresh(sprint)
        
        # Log activity
        await self.activity_service.log(
            user_id=user_id,
            action=ActionType.UPDATED,
            entity_type=EntityType.SPRINT,
            entity_id=sprint.id,
            changes=update_data
        )
        
        return sprint
    
    async def delete(self, sprint_id: UUID, user_id: UUID) -> bool:
        """Delete a sprint"""
        sprint = await self.get_by_id(sprint_id)
        if not sprint:
            return False
            
        project_id = sprint.project_id
        
        result = await self.db.execute(
            delete(Sprint).where(Sprint.id == sprint_id)
        )
        await self.db.commit()
        
        if result.rowcount > 0:
            # Log activity
            await self.activity_service.log(
                user_id=user_id,
                action=ActionType.DELETED,
                entity_type=EntityType.SPRINT,
                entity_id=sprint_id,
                changes={"project_id": str(project_id)}
            )
            return True
        return False
    
    async def add_task_to_sprint(self, sprint_id: UUID, task_id: UUID, user_id: UUID) -> bool:
        """Assign a task to a sprint"""
        # Check if already assigned
        result = await self.db.execute(
            select(SprintTask).where(
                and_(
                    SprintTask.sprint_id == sprint_id,
                    SprintTask.task_id == task_id
                )
            )
        )
        if result.scalar_one_or_none():
            return True
            
        sprint_task = SprintTask(
            sprint_id=sprint_id,
            task_id=task_id
        )
        self.db.add(sprint_task)
        await self.db.commit()
        
        # Log activity
        await self.activity_service.log(
            user_id=user_id,
            action=ActionType.UPDATED,
            entity_type=EntityType.TASK,
            entity_id=task_id,
            changes={"sprint_id": str(sprint_id), "action": "added_to_sprint"}
        )
        
        return True
    
    async def remove_task_from_sprint(self, sprint_id: UUID, task_id: UUID, user_id: UUID) -> bool:
        """Remove a task from a sprint"""
        result = await self.db.execute(
            delete(SprintTask).where(
                and_(
                    SprintTask.sprint_id == sprint_id,
                    SprintTask.task_id == task_id
                )
            )
        )
        await self.db.commit()
        
        if result.rowcount > 0:
            # Log activity
            await self.activity_service.log(
                user_id=user_id,
                action=ActionType.UPDATED,
                entity_type=EntityType.TASK,
                entity_id=task_id,
                changes={"sprint_id": str(sprint_id), "action": "removed_from_sprint"}
            )
            return True
        return False
