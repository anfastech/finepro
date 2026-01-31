# Real-time Notification System
import asyncio
import json
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, asdict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from app.core.websocket_manager import ws_manager, WSMessage, MessageType
from app.models.user import User
from app.models.task import Task
from app.models.project import Project
from app.database import get_db
import logging

logger = logging.getLogger(__name__)

class NotificationType(str, Enum):
    """Notification types"""
    TASK_ASSIGNED = "task_assigned"
    TASK_DUE_SOON = "task_due_soon"
    TASK_OVERDUE = "task_overdue"
    TASK_COMPLETED = "task_completed"
    TASK_UPDATED = "task_updated"
    COMMENT_ADDED = "comment_added"
    MENTION = "mention"
    PROJECT_CREATED = "project_created"
    PROJECT_UPDATED = "project_updated"
    TEAM_MEMBER_ADDED = "team_member_added"
    DEADLINE_APPROACHING = "deadline_approaching"
    WELCOME = "welcome"

class NotificationPriority(str, Enum):
    """Notification priority levels"""
    CRITICAL = "critical"  # Task overdue, system alerts
    HIGH = "high"          # Task due today, assignment changes
    MEDIUM = "medium"      # Task due soon, comments
    LOW = "low"            # General updates, welcome messages

@dataclass
class Notification:
    """Notification data structure"""
    id: str
    type: NotificationType
    priority: NotificationPriority
    title: str
    message: str
    user_id: str
    workspace_id: str
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    created_at: datetime = None
    read_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        
        # Set expiration based on priority
        if self.expires_at is None:
            if self.priority == NotificationPriority.CRITICAL:
                self.expires_at = self.created_at + timedelta(days=7)
            elif self.priority == NotificationPriority.HIGH:
                self.expires_at = self.created_at + timedelta(days=3)
            else:
                self.expires_at = self.created_at + timedelta(days=1)

class NotificationService:
    """Service for managing real-time notifications"""
    
    def __init__(self):
        self.notification_queue: asyncio.Queue = asyncio.Queue()
        self.notification_handlers: Dict[NotificationType, Callable] = {}
        self.user_preferences: Dict[str, Dict[str, Any]] = {}  # user_id -> preferences
        self.notification_history: Dict[str, List[Notification]] = {}  # user_id -> notifications
        
        # Start background processor
        # Start background processor - moved to start() method to avoid import-time loop errors
        # asyncio.create_task(self._process_notifications())
        # asyncio.create_task(self._cleanup_expired_notifications())

    async def create_notification(
        self,
        notification_type: NotificationType,
        user_id: str,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        workspace_id: Optional[str] = None,
        project_id: Optional[str] = None,
        task_id: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create and queue a notification"""
        
        import uuid
        notification_id = str(uuid.uuid4())
        
        notification = Notification(
            id=notification_id,
            type=notification_type,
            priority=priority,
            title=title,
            message=message,
            user_id=user_id,
            workspace_id=workspace_id,
            project_id=project_id,
            task_id=task_id,
            data=data
        )
        
        # Check user preferences
        if not self._should_send_notification(notification):
            return notification_id
        
        # Add to queue
        await self.notification_queue.put(notification)
        
        # Store in history
        if user_id not in self.notification_history:
            self.notification_history[user_id] = []
        self.notification_history[user_id].append(notification)
        
        logger.info(f"Created notification {notification_id} for user {user_id}: {title}")
        
        return notification_id

    async def notify_task_assigned(
        self,
        task_id: str,
        workspace_id: str,
        project_id: str,
        assigned_to: str,
        assigned_by: str,
        task_title: str
    ):
        """Send task assignment notification"""
        
        await self.create_notification(
            notification_type=NotificationType.TASK_ASSIGNED,
            user_id=assigned_to,
            title=f"New Task Assigned: {task_title}",
            message=f"You have been assigned to '{task_title}' by {assigned_by}",
            priority=NotificationPriority.HIGH,
            workspace_id=workspace_id,
            project_id=project_id,
            task_id=task_id,
            data={
                "assigned_by": assigned_by,
                "task_title": task_title
            }
        )

    async def notify_task_due_soon(
        self,
        task_id: str,
        workspace_id: str,
        project_id: str,
        assigned_to: str,
        task_title: str,
        due_date: datetime
    ):
        """Send task due soon notification (3 days before)"""
        
        await self.create_notification(
            notification_type=NotificationType.TASK_DUE_SOON,
            user_id=assigned_to,
            title=f"Task Due Soon: {task_title}",
            message=f"Your task '{task_title}' is due on {due_date.strftime('%b %d, %Y')}",
            priority=NotificationPriority.MEDIUM,
            workspace_id=workspace_id,
            project_id=project_id,
            task_id=task_id,
            data={
                "due_date": due_date.isoformat(),
                "task_title": task_title
            }
        )

    async def notify_task_overdue(
        self,
        task_id: str,
        workspace_id: str,
        project_id: str,
        assigned_to: str,
        task_title: str,
        due_date: datetime
    ):
        """Send task overdue notification"""
        
        await self.create_notification(
            notification_type=NotificationType.TASK_OVERDUE,
            user_id=assigned_to,
            title=f"Task Overdue: {task_title}",
            message=f"Your task '{task_title}' was due on {due_date.strftime('%b %d, %Y')}",
            priority=NotificationPriority.CRITICAL,
            workspace_id=workspace_id,
            project_id=project_id,
            task_id=task_id,
            data={
                "due_date": due_date.isoformat(),
                "task_title": task_title,
                "days_overdue": (datetime.utcnow() - due_date).days
            }
        )

    async def notify_task_completed(
        self,
        task_id: str,
        workspace_id: str,
        project_id: str,
        completed_by: str,
        task_title: str,
        notify_users: List[str]
    ):
        """Send task completion notification to team"""
        
        for user_id in notify_users:
            await self.create_notification(
                notification_type=NotificationType.TASK_COMPLETED,
                user_id=user_id,
                title=f"Task Completed: {task_title}",
                message=f"Task '{task_title}' was completed by {completed_by}",
                priority=NotificationPriority.MEDIUM,
                workspace_id=workspace_id,
                project_id=project_id,
                task_id=task_id,
                data={
                    "completed_by": completed_by,
                    "task_title": task_title
                }
            )

    async def notify_comment_added(
        self,
        task_id: str,
        workspace_id: str,
        project_id: str,
        comment_author: str,
        comment_author_name: str,
        task_title: str,
        task_assigned_to: str,
        comment_content: str
    ):
        """Send comment notification"""
        
        await self.create_notification(
            notification_type=NotificationType.COMMENT_ADDED,
            user_id=task_assigned_to,
            title=f"New Comment: {task_title}",
            message=f"{comment_author_name} commented: '{comment_content[:50]}...'",
            priority=NotificationPriority.MEDIUM,
            workspace_id=workspace_id,
            project_id=project_id,
            task_id=task_id,
            data={
                "comment_author": comment_author,
                "comment_content": comment_content,
                "task_title": task_title
            }
        )

    async def notify_mention(
        self,
        task_id: str,
        workspace_id: str,
        project_id: str,
        mentioned_user: str,
        mentioned_by: str,
        mentioned_by_name: str,
        task_title: str,
        comment_content: str
    ):
        """Send mention notification when user is @mentioned"""
        
        await self.create_notification(
            notification_type=NotificationType.MENTION,
            user_id=mentioned_user,
            title=f"You were mentioned in {task_title}",
            message=f"{mentioned_by_name} mentioned you: '{comment_content[:50]}...'",
            priority=NotificationPriority.HIGH,
            workspace_id=workspace_id,
            project_id=project_id,
            task_id=task_id,
            data={
                "mentioned_by": mentioned_by,
                "mentioned_by_name": mentioned_by_name,
                "comment_content": comment_content,
                "task_title": task_title
            }
        )

    async def send_welcome_notification(
        self,
        user_id: str,
        workspace_id: str,
        user_name: str
    ):
        """Send welcome notification to new user"""
        
        await self.create_notification(
            notification_type=NotificationType.WELCOME,
            user_id=user_id,
            title=f"Welcome to FinePro AI, {user_name}!",
            message="Get started by creating your first project or joining an existing workspace.",
            priority=NotificationPriority.LOW,
            workspace_id=workspace_id,
            data={
                "user_name": user_name
            }
        )

    async def get_user_notifications(
        self,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get notifications for a user"""
        
        notifications = self.notification_history.get(user_id, [])
        
        # Filter unread if requested
        if unread_only:
            notifications = [n for n in notifications if n.read_at is None]
        
        # Sort by created_at descending
        notifications.sort(key=lambda n: n.created_at, reverse=True)
        
        # Limit results
        notifications = notifications[:limit]
        
        # Convert to dict
        return [asdict(n) for n in notifications]

    async def mark_notification_read(
        self,
        user_id: str,
        notification_id: str
    ) -> bool:
        """Mark a notification as read"""
        
        notifications = self.notification_history.get(user_id, [])
        
        for notification in notifications:
            if notification.id == notification_id:
                notification.read_at = datetime.utcnow()
                return True
        
        return False

    async def mark_all_notifications_read(self, user_id: str):
        """Mark all notifications as read for a user"""
        
        notifications = self.notification_history.get(user_id, [])
        
        for notification in notifications:
            if notification.read_at is None:
                notification.read_at = datetime.utcnow()

    async def update_user_preferences(
        self,
        user_id: str,
        preferences: Dict[str, Any]
    ):
        """Update notification preferences for a user"""
        
        # Default preferences
        default_preferences = {
            "task_assigned": True,
            "task_due_soon": True,
            "task_overdue": True,
            "comment_added": True,
            "mention": True,
            "project_updates": True,
            "quiet_hours": {
                "enabled": False,
                "start": "22:00",
                "end": "08:00"
            },
            "daily_summary": True,
            "email_enabled": True,
            "push_enabled": True
        }
        
        # Merge with defaults
        self.user_preferences[user_id] = {**default_preferences, **preferences}

    def _should_send_notification(self, notification: Notification) -> bool:
        """Check if notification should be sent based on user preferences"""
        
        user_preferences = self.user_preferences.get(notification.user_id, {})
        
        # Check if notification type is enabled
        type_key = notification.type.value
        if not user_preferences.get(type_key, True):
            return False
        
        # Check quiet hours
        quiet_hours = user_preferences.get("quiet_hours", {})
        if quiet_hours.get("enabled", False):
            current_time = datetime.utcnow().time()
            start_time = datetime.strptime(quiet_hours["start"], "%H:%M").time()
            end_time = datetime.strptime(quiet_hours["end"], "%H:%M").time()
            
            if start_time <= current_time <= end_time:
                # Only send critical notifications during quiet hours
                if notification.priority != NotificationPriority.CRITICAL:
                    return False
        
        return True

    async def _process_notifications(self):
        """Process notifications from queue"""
        while True:
            try:
                # Wait for notification
                notification = await self.notification_queue.get()
                
                # Send WebSocket notification
                await self._send_websocket_notification(notification)
                
                # Mark as processed
                self.notification_queue.task_done()
                
            except Exception as e:
                logger.error(f"Error processing notification: {e}")

    async def _send_websocket_notification(self, notification: Notification):
        """Send notification via WebSocket"""
        
        message = WSMessage(
            type=MessageType.NOTIFICATION,
            data={
                "id": notification.id,
                "type": notification.type.value,
                "priority": notification.priority.value,
                "title": notification.title,
                "message": notification.message,
                "created_at": notification.created_at.isoformat(),
                "workspace_id": notification.workspace_id,
                "project_id": notification.project_id,
                "task_id": notification.task_id,
                "data": notification.data
            },
            timestamp=notification.created_at,
            room_id=notification.workspace_id,
            user_id="system"
        )
        
        # Send to specific user
        await ws_manager.send_personal_message(notification.user_id, message)

    async def _cleanup_expired_notifications(self):
        """Clean up expired notifications"""
        while True:
            try:
                await asyncio.sleep(3600)  # Check every hour
                
                current_time = datetime.utcnow()
                users_to_clean = []
                
                for user_id, notifications in self.notification_history.items():
                    # Remove expired notifications
                    valid_notifications = []
                    expired_count = 0
                    
                    for notification in notifications:
                        if notification.expires_at and current_time > notification.expires_at:
                            expired_count += 1
                        else:
                            valid_notifications.append(notification)
                    
                    if expired_count > 0:
                        self.notification_history[user_id] = valid_notifications
                        logger.info(f"Cleaned up {expired_count} expired notifications for user {user_id}")
                
            except Exception as e:
                logger.error(f"Error in notification cleanup: {e}")

    async def get_notification_stats(self, user_id: str) -> Dict[str, Any]:
        """Get notification statistics for a user"""
        
        notifications = self.notification_history.get(user_id, [])
        
        total = len(notifications)
        unread = len([n for n in notifications if n.read_at is None])
        
        # Count by type
        by_type = {}
        for notification in notifications:
            type_key = notification.type.value
            by_type[type_key] = by_type.get(type_key, 0) + 1
        
        # Count by priority
        by_priority = {
            "critical": len([n for n in notifications if n.priority == NotificationPriority.CRITICAL]),
            "high": len([n for n in notifications if n.priority == NotificationPriority.HIGH]),
            "medium": len([n for n in notifications if n.priority == NotificationPriority.MEDIUM]),
            "low": len([n for n in notifications if n.priority == NotificationPriority.LOW])
        }
        
        return {
            "total": total,
            "unread": unread,
            "read": total - unread,
            "by_type": by_type,
            "by_priority": by_priority
        }

# Global instance
notification_service = NotificationService()