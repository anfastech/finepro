# Enhanced Task Service Integration
# Integrates existing TaskService with real-time capabilities
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from app.models.task import Task
from app.models.user import User
from app.models.project import Project
from app.services.task_service import TaskService
from app.services.realtime_task_service import realtime_task_service
from app.services.notification_service import notification_service
from app.services.activity_feed_service import activity_feed_service
from app.services.presence_service import presence_service
from app.core.websocket_manager import ws_manager, WSMessage, MessageType
import logging

logger = logging.getLogger(__name__)

class EnhancedTaskService:
    """Enhanced task service with real-time integration"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.base_service = TaskService(db)
    
    async def create_task_with_realtime(
        self,
        task_data: Dict[str, Any],
        project_id: str,
        created_by: str,
        notify_users: bool = True
    ) -> Task:
        """Create task with real-time notifications"""
        
        # Get project details for workspace info
        result = await self.db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        
        if not project:
            raise ValueError("Project not found")
        
        # Get user details
        result = await self.db.execute(select(User).where(User.id == created_by))
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError("User not found")
        
        # Create the task using base service
        task = await self.base_service.create(
            task_data=task_data,
            project_id=project_id,
            created_by=created_by
        )
        
        # Real-time notifications (using background tasks)
        asyncio.create_task(self._handle_task_creation_realtime(
            task=task,
            project=project,
            user=user,
            notify_users=notify_users
        ))
        
        return task
    
    async def update_task_with_realtime(
        self,
        task_id: str,
        update_data: Dict[str, Any],
        updated_by: str,
        notify_assignee: bool = True
    ) -> Task:
        """Update task with real-time notifications"""
        
        # Get existing task
        result = await self.db.execute(select(Task).where(Task.id == task_id))
        existing_task = result.scalar_one_or_none()
        
        if not existing_task:
            raise ValueError("Task not found")
        
        # Get project and user details
        result = await self.db.execute(select(Project).where(Project.id == existing_task.project_id))
        project = result.scalar_one_or_none()
        
        result = await self.db.execute(select(User).where(User.id == updated_by))
        user = result.scalar_one_or_none()
        
        # Track changes
        old_data = existing_task.to_dict()
        changes = {}
        
        # Detect assignment change
        old_assignee = str(existing_task.assigned_to) if existing_task.assigned_to else None
        
        # Update the task using base service
        task = await self.base_service.update(task_id, update_data, updated_by)
        new_data = task.to_dict()
        
        # Calculate changes for real-time updates
        for key in old_data:
            if key in new_data and old_data[key] != new_data[key]:
                changes[key] = {"old": old_data[key], "new": new_data[key]}
        
        # Real-time notifications (using background tasks)
        asyncio.create_task(self._handle_task_update_realtime(
            task=task,
            project=project,
            user=user,
            old_data=old_data,
            new_data=new_data,
            changes=changes,
            old_assignee=old_assignee,
            notify_assignee=notify_assignee
        ))
        
        return task
    
    async def delete_task_with_realtime(
        self,
        task_id: str,
        deleted_by: str
    ) -> bool:
        """Delete task with real-time notifications"""
        
        # Get task details before deletion
        result = await self.db.execute(select(Task).where(Task.id == task_id))
        task = result.scalar_one_or_none()
        
        if not task:
            raise ValueError("Task not found")
        
        # Get project and user details
        result = await self.db.execute(select(Project).where(Project.id == task.project_id))
        project = result.scalar_one_or_none()
        
        result = await self.db.execute(select(User).where(User.id == deleted_by))
        user = result.scalar_one_or_none()
        
        # Delete the task using base service
        success = await self.base_service.delete(task_id)
        
        if success:
            # Real-time notifications (using background tasks)
            asyncio.create_task(self._handle_task_deletion_realtime(
                task=task,
                project=project,
                user=user
            ))
        
        return success
    
    async def assign_task_with_realtime(
        self,
        task_id: str,
        assigned_to: str,
        assigned_by: str,
        notify: bool = True
    ) -> Task:
        """Assign task with real-time notifications"""
        
        # Get task details
        result = await self.db.execute(select(Task).where(Task.id == task_id))
        task = result.scalar_one_or_none()
        
        if not task:
            raise ValueError("Task not found")
        
        # Get project and user details
        result = await self.db.execute(select(Project).where(Project.id == task.project_id))
        project = result.scalar_one_or_none()
        
        result = await self.db.execute(select(User).where(User.id == assigned_by))
        assigner = result.scalar_one_or_none()
        
        result = await self.db.execute(select(User).where(User.id == assigned_to))
        assignee = result.scalar_one_or_none()
        
        old_assignee = str(task.assigned_to) if task.assigned_to else None
        
        # Update assignment using base service
        update_data = {"assigned_to": assigned_to}
        updated_task = await self.base_service.update(task_id, update_data, assigned_by)
        
        # Real-time notifications
        asyncio.create_task(self._handle_task_assignment_realtime(
            task=updated_task,
            project=project,
            assigner=assigner,
            assignee=assignee,
            old_assignee=old_assignee,
            notify=notify
        ))
        
        return updated_task
    
    async def change_task_status_with_realtime(
        self,
        task_id: str,
        new_status: str,
        changed_by: str,
        notify_team: bool = True
    ) -> Task:
        """Change task status with real-time notifications"""
        
        # Get task details
        result = await self.db.execute(select(Task).where(Task.id == task_id))
        task = result.scalar_one_or_none()
        
        if not task:
            raise ValueError("Task not found")
        
        old_status = task.status.value
        
        # Get project and user details
        result = await self.db.execute(select(Project).where(Project.id == task.project_id))
        project = result.scalar_one_or_none()
        
        result = await self.db.execute(select(User).where(User.id == changed_by))
        user = result.scalar_one_or_none()
        
        # Update status using base service
        update_data = {"status": new_status}
        updated_task = await self.base_service.update(task_id, update_data, changed_by)
        
        # Real-time notifications
        asyncio.create_task(self._handle_task_status_change_realtime(
            task=updated_task,
            project=project,
            user=user,
            old_status=old_status,
            new_status=new_status,
            notify_team=notify_team
        ))
        
        return updated_task
    
    async def add_comment_with_realtime(
        self,
        task_id: str,
        comment_content: str,
        user_id: str,
        mention_users: List[str] = None
    ) -> str:
        """Add comment with real-time notifications"""
        
        # Get task details
        result = await self.db.execute(select(Task).where(Task.id == task_id))
        task = result.scalar_one_or_none()
        
        if not task:
            raise ValueError("Task not found")
        
        # Get user details
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        # Detect @mentions
        import re
        mention_pattern = r'@(\w+)'
        mentioned_users = re.findall(mention_pattern, comment_content) or []
        
        # Create comment (this would use a CommentService in a real implementation)
        import uuid
        comment_id = str(uuid.uuid4())
        
        # Real-time notifications
        asyncio.create_task(self._handle_comment_addition_realtime(
            task=task,
            user=user,
            comment_id=comment_id,
            comment_content=comment_content,
            mentioned_users=mentioned_users
        ))
        
        return comment_id
    
    async def _handle_task_creation_realtime(
        self,
        task: Task,
        project: Project,
        user: User,
        notify_users: bool
    ):
        """Handle real-time notifications for task creation"""
        try:
            # Notify task updated to all project members
            await realtime_task_service.notify_task_updated(
                task_id=str(task.id),
                workspace_id=str(project.workspace_id),
                project_id=str(project.id),
                updated_by=str(user.id),
                changes={"action": "created"},
                old_task_data=None,
                new_task_data=task.to_dict()
            )
            
            # Log activity
            await activity_feed_service.log_task_activity(
                action="created",
                user_id=str(user.id),
                user_name=user.name,
                workspace_id=str(project.workspace_id),
                project_id=str(project.id),
                task_id=str(task.id),
                task_title=task.title,
                changes={"created": True}
            )
            
            # Send notification if assigned to someone else
            if task.assigned_to and task.assigned_to != user.id and notify_users:
                await notification_service.notify_task_assigned(
                    task_id=str(task.id),
                    workspace_id=str(project.workspace_id),
                    project_id=str(project.id),
                    assigned_to=str(task.assigned_to),
                    assigned_by=str(user.id),
                    task_title=task.title
                )
        
        except Exception as e:
            logger.error(f"Error in task creation real-time handling: {e}")
    
    async def _handle_task_update_realtime(
        self,
        task: Task,
        project: Project,
        user: User,
        old_data: Dict[str, Any],
        new_data: Dict[str, Any],
        changes: Dict[str, Any],
        old_assignee: Optional[str],
        notify_assignee: bool
    ):
        """Handle real-time notifications for task updates"""
        try:
            # Notify task updated
            await realtime_task_service.notify_task_updated(
                task_id=str(task.id),
                workspace_id=str(project.workspace_id),
                project_id=str(project.id),
                updated_by=str(user.id),
                changes=changes,
                old_task_data=old_data,
                new_task_data=new_data
            )
            
            # Log activity
            await activity_feed_service.log_task_activity(
                action="updated",
                user_id=str(user.id),
                user_name=user.name,
                workspace_id=str(project.workspace_id),
                project_id=str(project.id),
                task_id=str(task.id),
                task_title=task.title,
                changes=changes
            )
            
            # Handle assignment change
            if task.assigned_to and old_assignee != str(task.assigned_to):
                await realtime_task_service.notify_task_assigned(
                    task_id=str(task.id),
                    workspace_id=str(project.workspace_id),
                    project_id=str(project.id),
                    assigned_to=str(task.assigned_to),
                    assigned_by=str(user.id),
                    old_assignee=old_assignee
                )
                
                if notify_assignee:
                    await notification_service.notify_task_assigned(
                        task_id=str(task.id),
                        workspace_id=str(project.workspace_id),
                        project_id=str(project.id),
                        assigned_to=str(task.assigned_to),
                        assigned_by=str(user.id),
                        task_title=task.title
                    )
        
        except Exception as e:
            logger.error(f"Error in task update real-time handling: {e}")
    
    async def _handle_task_deletion_realtime(
        self,
        task: Task,
        project: Project,
        user: User
    ):
        """Handle real-time notifications for task deletion"""
        try:
            # Log activity
            await activity_feed_service.log_task_activity(
                action="deleted",
                user_id=str(user.id),
                user_name=user.name,
                workspace_id=str(project.workspace_id),
                project_id=str(project.id),
                task_id=str(task.id),
                task_title=task.title,
                changes={"deleted": True}
            )
            
            # Broadcast deletion to project
            delete_message = WSMessage(
                type=MessageType.TASK_DELETED,
                data={
                    "task_id": str(task.id),
                    "task_title": task.title,
                    "deleted_by": str(user.id),
                    "project_id": str(project.id)
                },
                timestamp=datetime.utcnow(),
                room_id=str(project.id),
                user_id=str(user.id)
            )
            
            await ws_manager.broadcast_to_project(str(project.id), delete_message)
        
        except Exception as e:
            logger.error(f"Error in task deletion real-time handling: {e}")
    
    async def _handle_task_assignment_realtime(
        self,
        task: Task,
        project: Project,
        assigner: User,
        assignee: User,
        old_assignee: Optional[str],
        notify: bool
    ):
        """Handle real-time notifications for task assignment"""
        try:
            # Notify assignment
            await realtime_task_service.notify_task_assigned(
                task_id=str(task.id),
                workspace_id=str(project.workspace_id),
                project_id=str(project.id),
                assigned_to=str(assignee.id),
                assigned_by=str(assigner.id),
                old_assignee=old_assignee
            )
            
            # Log activity
            await activity_feed_service.log_task_activity(
                action="assigned",
                user_id=str(assigner.id),
                user_name=assigner.name,
                workspace_id=str(project.workspace_id),
                project_id=str(project.id),
                task_id=str(task.id),
                task_title=task.title,
                changes={"assigned_to": str(assignee.id)}
            )
            
            # Send notification
            if notify:
                await notification_service.notify_task_assigned(
                    task_id=str(task.id),
                    workspace_id=str(project.workspace_id),
                    project_id=str(project.id),
                    assigned_to=str(assignee.id),
                    assigned_by=str(assigner.id),
                    task_title=task.title
                )
        
        except Exception as e:
            logger.error(f"Error in task assignment real-time handling: {e}")
    
    async def _handle_task_status_change_realtime(
        self,
        task: Task,
        project: Project,
        user: User,
        old_status: str,
        new_status: str,
        notify_team: bool
    ):
        """Handle real-time notifications for task status changes"""
        try:
            # Notify status change
            await realtime_task_service.notify_task_status_changed(
                task_id=str(task.id),
                workspace_id=str(project.workspace_id),
                project_id=str(project.id),
                old_status=old_status,
                new_status=new_status,
                changed_by=str(user.id)
            )
            
            # Log activity
            await activity_feed_service.log_task_activity(
                action="updated",  # Could be "completed" or "status_changed"
                user_id=str(user.id),
                user_name=user.name,
                workspace_id=str(project.workspace_id),
                project_id=str(project.id),
                task_id=str(task.id),
                task_title=task.title,
                changes={"status": {"old": old_status, "new": new_status}}
            )
            
            # Handle completion notification
            if new_status == "done" and notify_team:
                # Get project members to notify
                from app.services.project_service import ProjectService
                project_service = ProjectService(self.db)
                members = await project_service.get_members(str(project.id))
                notify_users = [str(member.id) for member in members if str(member.id) != str(user.id)]
                
                if notify_users:
                    await notification_service.notify_task_completed(
                        task_id=str(task.id),
                        workspace_id=str(project.workspace_id),
                        project_id=str(project.id),
                        completed_by=str(user.id),
                        task_title=task.title,
                        notify_users=notify_users
                    )
        
        except Exception as e:
            logger.error(f"Error in task status change real-time handling: {e}")
    
    async def _handle_comment_addition_realtime(
        self,
        task: Task,
        user: User,
        comment_id: str,
        comment_content: str,
        mentioned_users: List[str]
    ):
        """Handle real-time notifications for comment additions"""
        try:
            # Get project details
            result = await self.db.execute(select(Project).where(Project.id == task.project_id))
            project = result.scalar_one_or_none()
            
            # Handle comment notification
            await realtime_task_service.handle_comment_added(
                task_id=str(task.id),
                workspace_id=str(project.workspace_id),
                project_id=str(project.id),
                comment_id=comment_id,
                comment_content=comment_content,
                user_id=str(user.id),
                user_name=user.name,
                mentioned_users=mentioned_users
            )
            
            # Log activity
            await activity_feed_service.log_comment_activity(
                user_id=str(user.id),
                user_name=user.name,
                workspace_id=str(project.workspace_id),
                project_id=str(project.id),
                task_id=str(task.id),
                task_title=task.title,
                comment_content=comment_content
            )
            
            # Send comment notification to assigned user
            if task.assigned_to and task.assigned_to != user.id:
                await notification_service.notify_comment_added(
                    task_id=str(task.id),
                    workspace_id=str(project.workspace_id),
                    project_id=str(project.id),
                    comment_author=str(user.id),
                    comment_author_name=user.name,
                    task_title=task.title,
                    task_assigned_to=str(task.assigned_to),
                    comment_content=comment_content
                )
            
            # Send mention notifications
            for mentioned_user in mentioned_users:
                await notification_service.notify_mention(
                    task_id=str(task.id),
                    workspace_id=str(project.workspace_id),
                    project_id=str(project.id),
                    mentioned_user=mentioned_user,
                    mentioned_by=str(user.id),
                    mentioned_by_name=user.name,
                    task_title=task.title,
                    comment_content=comment_content
                )
        
        except Exception as e:
            logger.error(f"Error in comment addition real-time handling: {e}")