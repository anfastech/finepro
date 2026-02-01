"""
Member Service - Handles workspace membership logic
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional


from app.models.member import Member
from app.models.user import User
from app.models.enums import MemberRole, ActionType, EntityType
from app.services.activity_service import ActivityService


class MemberService:
    """Service for managing workspace members"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.activity_service = ActivityService(db)
    
    async def get_by_id(self, member_id: str) -> Optional[Member]:
        """Get member record by its unique ID"""
        result = await self.db.execute(
            select(Member)
            .options(selectinload(Member.user))
            .where(Member.id == member_id)
        )
        return result.scalar_one_or_none()
    
    async def get_membership(self, user_id: str, workspace_id: str) -> Optional[Member]:
        """Get membership record for a specific user in a workspace"""
        result = await self.db.execute(
            select(Member)
            .where(
                and_(
                    Member.user_id == user_id,
                    Member.workspace_id == workspace_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def list_workspace_members(self, workspace_id: str) -> List[Member]:
        """List all members of a workspace"""
        result = await self.db.execute(
            select(Member)
            .options(selectinload(Member.user))
            .where(Member.workspace_id == workspace_id)
            .order_by(Member.joined_at.asc())
        )
        return list(result.scalars().all())
    
    async def add_member(
        self,
        workspace_id: str,
        user_id: str,
        actor_id: str,
        role: MemberRole = MemberRole.MEMBER
    ) -> Member:
        """Add a user to a workspace"""
        # Check if already a member
        existing = await self.get_membership(user_id, workspace_id)
        if existing:
            return existing
            
        member = Member(
            workspace_id=workspace_id,
            user_id=user_id,
            role=role
        )
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(member)
        
        # Log activity
        await self.activity_service.log(
            user_id=actor_id,
            action=ActionType.ASSIGNED,
            entity_type=EntityType.USER,
            entity_id=user_id,
            changes={"workspace_id": str(workspace_id), "role": role}
        )
        
        return member
    
    async def update_role(self, member_id: str, role: MemberRole, actor_id: str) -> Optional[Member]:
        """Update a member's role"""
        member = await self.get_by_id(member_id)
        if not member:
            return None
            
        old_role = member.role
        member.role = role
        await self.db.commit()
        await self.db.refresh(member)
        
        # Log activity
        await self.activity_service.log(
            user_id=actor_id,
            action=ActionType.UPDATED,
            entity_type=EntityType.USER,
            entity_id=member.user_id,
            changes={"field": "role", "old_value": old_role, "new_value": role, "workspace_id": str(member.workspace_id)}
        )
        
        return member
    
    async def remove_member(self, member_id: str, actor_id: str) -> bool:
        """Remove a member from a workspace"""
        member = await self.get_by_id(member_id)
        if not member:
            return False
            
        workspace_id = member.workspace_id
        user_id = member.user_id
        
        result = await self.db.execute(
            delete(Member).where(Member.id == member_id)
        )
        await self.db.commit()
        
        if result.rowcount > 0:
            # Log activity
            await self.activity_service.log(
                user_id=actor_id,
                action=ActionType.DELETED,
                entity_type=EntityType.USER,
                entity_id=user_id,
                changes={"workspace_id": str(workspace_id), "action": "removed_from_workspace"}
            )
            return True
        return False
    
    async def is_admin(self, user_id: str, workspace_id: str) -> bool:
        """Check if user is an admin of the workspace"""
        member = await self.get_membership(user_id, workspace_id)
        return member is not None and member.role == MemberRole.ADMIN

