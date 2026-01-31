# Real-time Task Collaboration Service
import asyncio
import json
from typing import Dict, List, Optional, Any, Set
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, or_

from app.core.websocket_manager import ws_manager, WSMessage, MessageType
from app.models.task import Task
from app.models.user import User
from app.models.project import Project
from app.models.comment import Comment
from app.database import get_db
from app.services.activity_service import ActivityService
import logging

logger = logging.getLogger(__name__)

class RealtimeTaskService:
    """Service for managing real-time task collaboration"""
    
    def __init__(self):
        self.typing_users: Dict[str, Dict[str, datetime]] = {}  # task_id -> {user_id: timestamp}
        self.editing_users: Dict[str, Dict[str, datetime]] = {}  # task_id -> {user_id: timestamp}
        self.presence_cache: Dict[str, Dict[str, Any]] = {}  # user_id -> presence_info
        
        # Cleanup tasks
        # Cleanup tasks - moved to start() method to avoid import-time loop errors
        # asyncio.create_task(self._cleanup_typing_indicators())
        # asyncio.create_task(self._cleanup_presence_cache())

    async def notify_task_updated(
        self, 
        task_id: str, 
        workspace_id: str,
        project_id: str,
        updated_by: str,
        changes: Dict[str, Any],
        old_task_data: Optional[Dict[str, Any]] = None,
        new_task_data: Optional[Dict[str, Any]] = None
    ):
        """Notify about task updates with detailed change information"""
        
        # Get task details for broadcasting
        db = next(get_db())
        try:
            result = await db.execute(select(Task).where(Task.id == task_id))
            task = result.scalar_one_or_none()
            
            if not task:
                return
            
            # Broadcast task update to project
            await ws_manager.notify_task_updated(
                task_id=str(task.id),
                task_data={
                    "id": str(task.id),
                    "title": task.title,
                    "status": task.status.value,
                    "priority": task.priority.value,
                    "assigned_to": str(task.assigned_to) if task.assigned_to else None,
                    "estimated_hours": task.estimated_hours,
                    "due_date": task.due_date.isoformat() if task.due_date else None,
                    "updated_by": updated_by,
                    "changes": changes,
                    "old_data": old_task_data,
                    "new_data": new_task_data,
                    "project_id": str(task.project_id)
                },
                updated_by=updated_by,
                project_id=project_id
            )
            
            # Log activity
            activity_service = ActivityService(db)
            await activity_service.log_activity(
                user_id=updated_by,
                action="task_updated",
                entity_type="task",
                entity_id=task_id,
                details={
                    "changes": changes,
                    "old_data": old_task_data,
                    "new_data": new_task_data
                }
            )
            
        finally:
            await db.close()

    async def notify_task_assigned(
        self,
        task_id: str,
        workspace_id: str,
        project_id: str,
        assigned_to: str,
        assigned_by: str,
        old_assignee: Optional[str] = None
    ):
        """Notify about task assignment changes"""
        
        # Get task details
        db = next(get_db())
        try:
            result = await db.execute(select(Task).where(Task.id == task_id))
            task = result.scalar_one_or_none()
            
            if not task:
                return
            
            # Get user info for assigned user
            result = await db.execute(select(User).where(User.id == assigned_to))
            assigned_user = result.scalar_one_or_none()
            
            # Broadcast task assignment
            await ws_manager.notify_task_assigned(
                task_id=task_id,
                task_data={
                    "id": str(task.id),
                    "title": task.title,
                    "status": task.status.value,
                    "assigned_to": str(task.assigned_to) if task.assigned_to else None,
                    "assigned_user_name": assigned_user.name if assigned_user else None,
                    "assigned_by": assigned_by,
                    "project_id": str(task.project_id)
                },
                assigned_to=assigned_to,
                assigned_by=assigned_by,
                project_id=project_id
            )
            
            # Special notification if task is reassigned from someone else
            if old_assignee and old_assignee != assigned_to:
                reassign_message = WSMessage(
                    type="task_reassigned",
                    data={
                        "task_id": task_id,
                        "task_title": task.title,
                        "from_user": old_assignee,
                        "to_user": assigned_to,
                        "assigned_by": assigned_by
                    },
                    timestamp=datetime.utcnow(),
                    room_id=task_id,
                    user_id="system"
                )
                
                await ws_manager.send_personal_message(old_assignee, reassign_message)
            
            # Log activity
            activity_service = ActivityService(db)
            await activity_service.log_activity(
                user_id=assigned_by,
                action="task_assigned",
                entity_type="task",
                entity_id=task_id,
                details={
                    "assigned_to": assigned_to,
                    "old_assignee": old_assignee
                }
            )
            
        finally:
            await db.close()

    async def notify_task_status_changed(
        self,
        task_id: str,
        workspace_id: str,
        project_id: str,
        old_status: str,
        new_status: str,
        changed_by: str
    ):
        """Notify about task status changes"""
        
        # Get task details
        db = next(get_db())
        try:
            result = await db.execute(select(Task).where(Task.id == task_id))
            task = result.scalar_one_or_none()
            
            if not task:
                return
            
            # Broadcast status change
            status_message = WSMessage(
                type="task_status_changed",
                data={
                    "task_id": task_id,
                    "task_title": task.title,
                    "old_status": old_status,
                    "new_status": new_status,
                    "changed_by": changed_by,
                    "project_id": project_id
                },
                timestamp=datetime.utcnow(),
                room_id=project_id,
                user_id=changed_by
            )
            
            # Broadcast to project and task rooms
            await ws_manager.broadcast_to_project(project_id, status_message)
            await ws_manager.broadcast_to_task(task_id, status_message)
            
            # Special handling for completion
            if new_status == "done":
                completion_message = WSMessage(
                    type="task_completed",
                    data={
                        "task_id": task_id,
                        "task_title": task.title,
                        "completed_by": changed_by,
                        "completed_at": datetime.utcnow().isoformat(),
                        "project_id": project_id
                    },
                    timestamp=datetime.utcnow(),
                    room_id=project_id,
                    user_id=changed_by
                )
                
                await ws_manager.broadcast_to_project(project_id, completion_message)
            
            # Log activity
            activity_service = ActivityService(db)
            await activity_service.log_activity(
                user_id=changed_by,
                action="status_changed",
                entity_type="task",
                entity_id=task_id,
                details={
                    "old_status": old_status,
                    "new_status": new_status
                }
            )
            
        finally:
            await db.close()

    async def set_typing_indicator(
        self,
        user_id: str,
        user_name: str,
        task_id: str,
        is_typing: bool
    ):
        """Set typing indicator for a user in a task"""
        
        task_key = f"task_{task_id}"
        
        if is_typing:
            if task_key not in self.typing_users:
                self.typing_users[task_key] = {}
            
            self.typing_users[task_key][user_id] = {
                "user_id": user_id,
                "user_name": user_name,
                "timestamp": datetime.utcnow()
            }
        else:
            if task_key in self.typing_users and user_id in self.typing_users[task_key]:
                del self.typing_users[task_key][user_id]
        
        # Broadcast typing indicator to task room
        typing_message = WSMessage(
            type=MessageType.USER_TYPING,
            data={
                "task_id": task_id,
                "user_id": user_id,
                "user_name": user_name,
                "is_typing": is_typing,
                "typing_users": list(self.typing_users.get(task_key, {}).values())
            },
            timestamp=datetime.utcnow(),
            room_id=task_id,
            user_id=user_id
        )
        
        await ws_manager.broadcast_to_task(task_id, typing_message, exclude_user=user_id)

    async def set_editing_status(
        self,
        user_id: str,
        user_name: str,
        task_id: str,
        is_editing: bool
    ):
        """Set editing status for a user in a task (like Google Docs)"""
        
        task_key = f"task_{task_id}"
        
        if is_editing:
            if task_key not in self.editing_users:
                self.editing_users[task_key] = {}
            
            self.editing_users[task_key][user_id] = {
                "user_id": user_id,
                "user_name": user_name,
                "timestamp": datetime.utcnow(),
                "field": "task_edit"  # Could be extended for specific fields
            }
        else:
            if task_key in self.editing_users and user_id in self.editing_users[task_key]:
                del self.editing_users[task_key][user_id]
        
        # Broadcast editing status to task room
        editing_message = WSMessage(
            type="user_editing",
            data={
                "task_id": task_id,
                "user_id": user_id,
                "user_name": user_name,
                "is_editing": is_editing,
                "editing_users": list(self.editing_users.get(task_key, {}).values())
            },
            timestamp=datetime.utcnow(),
            room_id=task_id,
            user_id=user_id
        )
        
        await ws_manager.broadcast_to_task(task_id, editing_message, exclude_user=user_id)

    async def get_typing_users(self, task_id: str) -> List[Dict[str, Any]]:
        """Get list of currently typing users for a task"""
        task_key = f"task_{task_id}"
        
        if task_key not in self.typing_users:
            return []
        
        # Filter out old typing indicators (older than 10 seconds)
        current_time = datetime.utcnow()
        active_typing = []
        
        for user_id, user_data in self.typing_users[task_key].items():
            if (current_time - user_data["timestamp"]).seconds < 10:
                active_typing.append(user_data)
            else:
                # Clean up old indicator
                del self.typing_users[task_key][user_id]
        
        return active_typing

    async def get_editing_users(self, task_id: str) -> List[Dict[str, Any]]:
        """Get list of currently editing users for a task"""
        task_key = f"task_{task_id}"
        
        if task_key not in self.editing_users:
            return []
        
        # Filter out old editing indicators (older than 30 seconds)
        current_time = datetime.utcnow()
        active_editing = []
        
        for user_id, user_data in self.editing_users[task_key].items():
            if (current_time - user_data["timestamp"]).seconds < 30:
                active_editing.append(user_data)
            else:
                # Clean up old indicator
                del self.editing_users[task_key][user_id]
        
        return active_editing

    async def handle_comment_added(
        self,
        task_id: str,
        workspace_id: str,
        project_id: str,
        comment_id: str,
        comment_content: str,
        user_id: str,
        user_name: str,
        mentioned_users: List[str]
    ):
        """Handle new comment notifications with @mentions"""
        
        comment_data = {
            "id": comment_id,
            "content": comment_content,
            "user_id": user_id,
            "user_name": user_name,
            "task_id": task_id,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Notify about comment
        await ws_manager.notify_comment_added(
            task_id=task_id,
            comment_data=comment_data,
            mentioned_users=mentioned_users,
            project_id=project_id
        )
        
        # Log activity
        db = next(get_db())
        try:
            activity_service = ActivityService(db)
            await activity_service.log_activity(
                user_id=user_id,
                action="comment_added",
                entity_type="comment",
                entity_id=comment_id,
                details={
                    "task_id": task_id,
                    "content": comment_content[:100],  # First 100 chars
                    "mentioned_users": mentioned_users
                }
            )
        finally:
            await db.close()

    async def update_user_presence(
        self,
        user_id: str,
        workspace_id: str,
        presence_data: Dict[str, Any]
    ):
        """Update user presence information"""
        
        self.presence_cache[user_id] = {
            **presence_data,
            "user_id": user_id,
            "workspace_id": workspace_id,
            "last_seen": datetime.utcnow()
        }
        
        # Broadcast presence update to workspace
        presence_message = WSMessage(
            type="user_presence_updated",
            data={
                "user_id": user_id,
                "presence": presence_data,
                "last_seen": datetime.utcnow().isoformat()
            },
            timestamp=datetime.utcnow(),
            room_id=workspace_id,
            user_id=user_id
        )
        
        await ws_manager.broadcast_to_workspace(workspace_id, presence_message, exclude_user=user_id)

    async def get_workspace_presence(self, workspace_id: str) -> List[Dict[str, Any]]:
        """Get presence information for all users in workspace"""
        
        current_time = datetime.utcnow()
        active_presence = []
        
        for user_id, presence_data in self.presence_cache.items():
            if presence_data.get("workspace_id") == workspace_id:
                # Only include users seen in last 5 minutes
                if (current_time - presence_data["last_seen"]).seconds < 300:
                    active_presence.append(presence_data)
        
        return active_presence

    async def _cleanup_typing_indicators(self):
        """Periodic cleanup of old typing indicators"""
        while True:
            try:
                await asyncio.sleep(10)  # Check every 10 seconds
                
                current_time = datetime.utcnow()
                tasks_to_remove = []
                
                for task_key, users in self.typing_users.items():
                    users_to_remove = []
                    
                    for user_id, user_data in users.items():
                        if (current_time - user_data["timestamp"]).seconds > 15:
                            users_to_remove.append(user_id)
                    
                    for user_id in users_to_remove:
                        del self.typing_users[task_key][user_id]
                    
                    if not self.typing_users[task_key]:
                        tasks_to_remove.append(task_key)
                
                for task_key in tasks_to_remove:
                    del self.typing_users[task_key]
                
            except Exception as e:
                logger.error(f"Error in typing indicators cleanup: {e}")

    async def _cleanup_presence_cache(self):
        """Periodic cleanup of old presence data"""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                current_time = datetime.utcnow()
                users_to_remove = []
                
                for user_id, presence_data in self.presence_cache.items():
                    # Remove users not seen in last 10 minutes
                    if (current_time - presence_data["last_seen"]).seconds > 600:
                        users_to_remove.append(user_id)
                
                for user_id in users_to_remove:
                    del self.presence_cache[user_id]
                
            except Exception as e:
                logger.error(f"Error in presence cache cleanup: {e}")

# Global instance
realtime_task_service = RealtimeTaskService()