"""
Workspace Service - Handles workspace management logic
"""
import random
import string
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.models.workspace import Workspace
from app.models.member import Member
from app.models.enums import MemberRole
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate


class WorkspaceService:
    """Service for managing workspaces"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_id(self, workspace_id: str) -> Optional[Workspace]:
        """Get workspace by ID with members"""
        # Ensure we are querying with string ID
        result = await self.db.execute(
            select(Workspace)
            .options(selectinload(Workspace.members))
            .where(Workspace.id == str(workspace_id))
        )
        return result.scalar_one_or_none()
    
    async def list_user_workspaces(self, user_id: str) -> List[Workspace]:
        """List all workspaces where user is a member"""
        result = await self.db.execute(
            select(Workspace)
            .join(Member)
            .where(Member.user_id == str(user_id))
            .order_by(Workspace.created_at.desc())
        )
        return list(result.scalars().all())
    
    async def create(
        self,
        data: WorkspaceCreate,
        owner_id: str
    ) -> Workspace:
        """Create a new workspace and add owner as admin"""
        invite_code = self._generate_invite_code()
        
        workspace = Workspace(
            name=data.name,
            owner_id=owner_id,
            invite_code=invite_code
        )
        
        self.db.add(workspace)
        await self.db.flush()  # To get workspace.id
        
        # Add owner as admin member
        member = Member(
            workspace_id=workspace.id,
            user_id=owner_id,
            role=MemberRole.ADMIN
        )
        self.db.add(member)
        
        await self.db.commit()
        await self.db.refresh(workspace)
        return workspace
    
    async def update(self, workspace_id: str, data: WorkspaceUpdate) -> Optional[Workspace]:
        """Update workspace details"""
        workspace = await self.get_by_id(workspace_id)
        if not workspace:
            return None
            
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(workspace, field, value)
            
        await self.db.commit()
        await self.db.refresh(workspace)
        return workspace
    
    async def delete(self, workspace_id: str) -> bool:
        """Delete a workspace"""
        # Note: cascading deletes should handle members, projects, etc.
        result = await self.db.execute(
            delete(Workspace).where(Workspace.id == workspace_id)
        )
        await self.db.commit()
        return result.rowcount > 0
    
    async def reset_invite_code(self, workspace_id: str) -> Optional[Workspace]:
        """Generate a new invite code for the workspace"""
        workspace = await self.get_by_id(workspace_id)
        if not workspace:
            return None
            
        workspace.invite_code = self._generate_invite_code()
        await self.db.commit()
        await self.db.refresh(workspace)
        return workspace
    
    async def get_analytics(self, workspace_id: str, user_id: str) -> dict:
        """Get task analytics for a workspace"""
        from sqlalchemy import func
        from app.models.task import Task
        from app.models.project import Project
        from app.models.enums import TaskStatus
        from datetime import datetime
        
        # Get all tasks in the workspace
        # We need to join Workspace -> Project -> Epic -> Task
        # Actually, our Task model has direct project_id? 
        # Wait, let me check Task model again.
        
        # Query tasks via Epic-Project chain
        from app.models.epic import Epic
        
        tasks_query = (
            select(Task)
            .join(Epic, Task.epic_id == Epic.id)
            .join(Project, Epic.project_id == Project.id)
            .where(Project.workspace_id == workspace_id)
        )
        
        result = await self.db.execute(tasks_query)
        tasks = list(result.scalars().all())
        
        now = datetime.utcnow()
        
        task_count = len(tasks)
        assigned_task_count = len([t for t in tasks if t.assigned_to == user_id])
        completed_task_count = len([t for t in tasks if t.status == TaskStatus.DONE])
        overdue_task_count = len([t for t in tasks if t.due_date and t.due_date < now and t.status != TaskStatus.DONE])
        incomplete_task_count = task_count - completed_task_count
        
        # For 'difference' values, we look at tasks created in the last 30 days vs previous
        # (Simplified implementation)
        return {
            "taskCount": task_count,
            "taskDifference": 0,
            "assignedTaskCount": assigned_task_count,
            "assignedTaskDifference": 0,
            "completedTaskCount": completed_task_count,
            "completedTaskDifference": 0,
            "overdueTaskCount": overdue_task_count,
            "overdueTaskDifference": 0,
            "incompleteTaskCount": incomplete_task_count,
            "incompleteTaskDifference": 0,
        }

    async def join_by_invite_code(self, workspace_id: str, invite_code: str, user_id: str) -> Optional[Workspace]:
        """Join a workspace using an invite code"""
        workspace = await self.get_by_id(workspace_id)
        if not workspace or workspace.invite_code != invite_code:
            return None
            
        # Check if already a member
        from sqlalchemy import and_
        result = await self.db.execute(
            select(Member).where(
                and_(Member.workspace_id == workspace_id, Member.user_id == user_id)
            )
        )
        if result.scalar_one_or_none():
            return workspace # Already a member
            
        # Add as member
        member = Member(
            workspace_id=workspace_id,
            user_id=user_id,
            role=MemberRole.MEMBER
        )
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(workspace)
        await self.db.refresh(workspace)
        return workspace

    async def is_member(self, user_id: str, workspace_id: str) -> bool:
        """Check if user is a member of the workspace"""
        from sqlalchemy import and_
        result = await self.db.execute(
            select(Member).where(
                and_(Member.workspace_id == workspace_id, Member.user_id == user_id)
            )
        )
        return result.scalar_one_or_none() is not None

    def _generate_invite_code(self, length: int = 6) -> str:
        """Generate a random alphanumeric invite code"""
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
