"""
Activity Service - Handles audit logging of all system actions
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional, Any, Dict
from uuid import UUID

from app.models.activity_log import ActivityLog
from app.models.enums import ActionType, EntityType


class ActivityService:
    """Service for managing activity logs"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def log(
        self,
        user_id: UUID,
        action: ActionType,
        entity_type: EntityType,
        entity_id: UUID,
        changes: Optional[Dict[str, Any]] = None
    ) -> ActivityLog:
        """Create a new activity log entry"""
        activity = ActivityLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            changes=changes or {}
        )
        self.db.add(activity)
        await self.db.commit()
        await self.db.refresh(activity)
        return activity
    
    async def get_by_entity(
        self,
        entity_type: EntityType,
        entity_id: UUID,
        limit: int = 50
    ) -> List[ActivityLog]:
        """Get activity logs for a specific entity"""
        result = await self.db.execute(
            select(ActivityLog)
            .where(
                ActivityLog.entity_type == entity_type,
                ActivityLog.entity_id == entity_id
            )
            .order_by(desc(ActivityLog.timestamp))
            .limit(limit)
        )
        return list(result.scalars().all())
    
    async def get_by_user(
        self,
        user_id: UUID,
        limit: int = 50
    ) -> List[ActivityLog]:
        """Get activity logs for a specific user"""
        result = await self.db.execute(
            select(ActivityLog)
            .where(ActivityLog.user_id == user_id)
            .order_by(desc(ActivityLog.timestamp))
            .limit(limit)
        )
        return list(result.scalars().all())
    
    async def get_workspace_activities(
        self,
        workspace_id: UUID,
        limit: int = 100
    ) -> List[ActivityLog]:
        """
        Get all activities for a workspace. 
        Note: This requires joining with other tables to find all entities 
        belonging to the workspace, or storing workspace_id in ActivityLog.
        For now, we'll fetch direct workspace activities.
        """
        result = await self.db.execute(
            select(ActivityLog)
            .where(
                ActivityLog.entity_type == EntityType.WORKSPACE,
                ActivityLog.entity_id == workspace_id
            )
            .order_by(desc(ActivityLog.timestamp))
            .limit(limit)
        )
        return list(result.scalars().all())
