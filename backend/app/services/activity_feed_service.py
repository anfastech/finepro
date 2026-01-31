# Live Activity Feed Service
import asyncio
import json
from typing import Dict, List, Optional, Any, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc

from app.core.websocket_manager import ws_manager, WSMessage, MessageType
from app.models.activity_log import ActivityLog
from app.models.user import User
from app.models.project import Project
from app.models.task import Task
from app.database import get_db
import logging

logger = logging.getLogger(__name__)

class ActivityType(str, Enum):
    """Activity types for the feed"""
    TASK_CREATED = "task_created"
    TASK_UPDATED = "task_updated"
    TASK_COMPLETED = "task_completed"
    TASK_ASSIGNED = "task_assigned"
    COMMENT_ADDED = "comment_added"
    PROJECT_CREATED = "project_created"
    PROJECT_UPDATED = "project_updated"
    SPRINT_CREATED = "sprint_created"
    SPRINT_STARTED = "sprint_started"
    SPRINT_COMPLETED = "sprint_completed"
    MEMBER_JOINED = "member_joined"
    MEMBER_LEFT = "member_left"
    FILE_UPLOADED = "file_uploaded"
    MILESTONE_REACHED = "milestone_reached"

class ActivityScope(str, Enum):
    """Activity scope levels"""
    WORKSPACE = "workspace"
    PROJECT = "project"
    TASK = "task"
    PERSONAL = "personal"

@dataclass
class ActivityFeedItem:
    """Activity feed item structure"""
    id: str
    type: ActivityType
    scope: ActivityScope
    title: str
    description: str
    user_id: str
    user_name: str
    user_avatar: Optional[str]
    workspace_id: str
    project_id: Optional[str]
    task_id: Optional[str]
    entity_id: str
    entity_type: str
    changes: Optional[Dict[str, Any]]
    activity_metadata: Dict[str, Any]  # Renamed from 'metadata'
    timestamp: datetime
    is_pinned: bool = False
    priority: int = 0  # Higher = more important
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        data["timestamp"] = self.timestamp.isoformat()
        return data

class ActivityFeedService:
    """Service for managing real-time activity feeds"""
    
    def __init__(self):
        self.feed_cache: Dict[str, List[ActivityFeedItem]] = {}  # project_id -> [activities]
        self.user_activity_cache: Dict[str, List[ActivityFeedItem]] = {}  # user_id -> [activities]
        self.workspace_activity_cache: Dict[str, List[ActivityFeedItem]] = {}  # workspace_id -> [activities]
        
        # Activity subscriptions (users watching specific feeds)
        self.subscriptions: Dict[str, Dict[str, Set[str]]] = {
            "project": {},    # project_id -> {user_ids}
            "workspace": {},  # workspace_id -> {user_ids}
            "user": {}        # user_id -> {user_ids}
        }
        
        # Cache management
        self.max_cache_size = 1000
        self.cache_ttl = timedelta(minutes=30)
        self.last_cleanup = datetime.utcnow()
        
        # Start background tasks
        # Start background tasks - moved to start() method to avoid import-time loop errors
        # asyncio.create_task(self._cleanup_caches())
        # asyncio.create_task(self._aggregate_activities())

    async def log_activity(
        self,
        activity_type: ActivityType,
        user_id: str,
        user_name: str,
        workspace_id: str,
        title: str,
        description: str,
        entity_id: str,
        entity_type: str,
        project_id: Optional[str] = None,
        task_id: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        activity_metadata: Optional[Dict[str, Any]] = None,  # Renamed from 'metadata'
        is_pinned: bool = False,
        priority: int = 0
    ) -> str:
        """Log an activity and broadcast to relevant feeds"""
        
        import uuid
        activity_id = str(uuid.uuid4())
        
        # Create activity item
        activity = ActivityFeedItem(
            id=activity_id,
            type=activity_type,
            scope=self._determine_scope(project_id, task_id),
            title=title,
            description=description,
            user_id=user_id,
            user_name=user_name,
            user_avatar=None,  # Will be filled from user data
            workspace_id=workspace_id,
            project_id=project_id,
            task_id=task_id,
            entity_id=entity_id,
            entity_type=entity_type,
            changes=changes,
            activity_metadata=activity_metadata or {},  # Using renamed field
            timestamp=datetime.utcnow(),
            is_pinned=is_pinned,
            priority=priority
        )
        
        # Get user avatar
        await self._enrich_user_data(activity)
        
        # Add to caches
        await self._add_to_caches(activity)
        
        # Broadcast to subscribers
        await self._broadcast_activity(activity)
        
        # Log to database
        await self._persist_activity(activity)
        
        logger.info(f"Logged activity {activity_id}: {title}")
        
        return activity_id

    async def log_task_activity(
        self,
        action: str,
        user_id: str,
        user_name: str,
        workspace_id: str,
        project_id: str,
        task_id: str,
        task_title: str,
        changes: Optional[Dict[str, Any]] = None
    ):
        """Log task-specific activity"""
        
        activity_type = ActivityType(f"task_{action}")
        
        title_map = {
            "created": f"Created task: {task_title}",
            "updated": f"Updated task: {task_title}",
            "completed": f"Completed task: {task_title}",
            "assigned": f"Assigned task: {task_title}",
            "deleted": f"Deleted task: {task_title}"
        }
        
        description_map = {
            "created": f"A new task '{task_title}' was created",
            "updated": f"Task '{task_title}' was updated",
            "completed": f"Task '{task_title}' was marked as completed",
            "assigned": f"Task '{task_title}' was assigned to someone",
            "deleted": f"Task '{task_title}' was deleted"
        }
        
        await self.log_activity(
            activity_type=activity_type,
            user_id=user_id,
            user_name=user_name,
            workspace_id=workspace_id,
            title=title_map.get(action, f"Task {action}: {task_title}"),
            description=description_map.get(action, f"Task '{task_title}' was {action}"),
            entity_id=task_id,
            entity_type="task",
            project_id=project_id,
            task_id=task_id,
            changes=changes,
            activity_metadata={"task_title": task_title},
            priority=2 if action == "completed" else 1
        )

    async def log_project_activity(
        self,
        action: str,
        user_id: str,
        user_name: str,
        workspace_id: str,
        project_id: str,
        project_name: str,
        changes: Optional[Dict[str, Any]] = None
    ):
        """Log project-specific activity"""
        
        activity_type = ActivityType(f"project_{action}")
        
        title_map = {
            "created": f"Created project: {project_name}",
            "updated": f"Updated project: {project_name}",
            "deleted": f"Deleted project: {project_name}"
        }
        
        description_map = {
            "created": f"A new project '{project_name}' was created",
            "updated": f"Project '{project_name}' was updated",
            "deleted": f"Project '{project_name}' was deleted"
        }
        
        await self.log_activity(
            activity_type=activity_type,
            user_id=user_id,
            user_name=user_name,
            workspace_id=workspace_id,
            title=title_map.get(action, f"Project {action}: {project_name}"),
            description=description_map.get(action, f"Project '{project_name}' was {action}"),
            entity_id=project_id,
            entity_type="project",
            project_id=project_id,
            changes=changes,
            metadata={"project_name": project_name},
            priority=3
        )

    async def log_comment_activity(
        self,
        user_id: str,
        user_name: str,
        workspace_id: str,
        project_id: str,
        task_id: str,
        task_title: str,
        comment_content: str
    ):
        """Log comment activity"""
        
        await self.log_activity(
            activity_type=ActivityType.COMMENT_ADDED,
            user_id=user_id,
            user_name=user_name,
            workspace_id=workspace_id,
            title=f"Commented on: {task_title}",
            description=f"Added comment: '{comment_content[:100]}{'...' if len(comment_content) > 100 else ''}'",
            entity_id=task_id,
            entity_type="comment",
            project_id=project_id,
            task_id=task_id,
            activity_metadata={
                "task_title": task_title,
                "comment_preview": comment_content[:100]
            },
            priority=1
        )

    async def log_sprint_activity(
        self,
        action: str,
        user_id: str,
        user_name: str,
        workspace_id: str,
        project_id: str,
        sprint_name: str
    ):
        """Log sprint-specific activity"""
        
        activity_type = ActivityType(f"sprint_{action}")
        
        await self.log_activity(
            activity_type=activity_type,
            user_id=user_id,
            user_name=user_name,
            workspace_id=workspace_id,
            title=f"Sprint {action}: {sprint_name}",
            description=f"Sprint '{sprint_name}' was {action}",
            entity_id=project_id,  # Sprint doesn't have its own ID in current schema
            entity_type="sprint",
            project_id=project_id,
            activity_metadata={"sprint_name": sprint_name},
            priority=4
        )

    async def get_project_feed(
        self,
        project_id: str,
        limit: int = 50,
        since: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """Get activity feed for a specific project"""
        
        feed = self.feed_cache.get(project_id, [])
        
        # Filter by date if specified
        if since:
            feed = [a for a in feed if a.timestamp >= since]
        
        # Sort by timestamp and priority
        feed.sort(key=lambda a: (a.priority, a.timestamp), reverse=True)
        
        # Limit results
        feed = feed[:limit]
        
        return [a.to_dict() for a in feed]

    async def get_workspace_feed(
        self,
        workspace_id: str,
        limit: int = 50,
        since: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """Get activity feed for a workspace"""
        
        feed = self.workspace_activity_cache.get(workspace_id, [])
        
        # Filter by date if specified
        if since:
            feed = [a for a in feed if a.timestamp >= since]
        
        # Sort by timestamp and priority
        feed.sort(key=lambda a: (a.priority, a.timestamp), reverse=True)
        
        # Limit results
        feed = feed[:limit]
        
        return [a.to_dict() for a in feed]

    async def get_user_activity(
        self,
        user_id: str,
        limit: int = 50,
        since: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """Get activity for a specific user"""
        
        feed = self.user_activity_cache.get(user_id, [])
        
        # Filter by date if specified
        if since:
            feed = [a for a in feed if a.timestamp >= since]
        
        # Sort by timestamp
        feed.sort(key=lambda a: a.timestamp, reverse=True)
        
        # Limit results
        feed = feed[:limit]
        
        return [a.to_dict() for a in feed]

    async def subscribe_to_feed(
        self,
        user_id: str,
        feed_type: str,
        feed_id: str
    ):
        """Subscribe user to a specific feed"""
        
        if feed_type not in self.subscriptions:
            return
        
        if feed_id not in self.subscriptions[feed_type]:
            self.subscriptions[feed_type][feed_id] = set()
        
        self.subscriptions[feed_type][feed_id].add(user_id)
        
        logger.info(f"User {user_id} subscribed to {feed_type} feed {feed_id}")

    async def unsubscribe_from_feed(
        self,
        user_id: str,
        feed_type: str,
        feed_id: str
    ):
        """Unsubscribe user from a specific feed"""
        
        if feed_type not in self.subscriptions:
            return
        
        if feed_id in self.subscriptions[feed_type]:
            self.subscriptions[feed_type][feed_id].discard(user_id)
        
        logger.info(f"User {user_id} unsubscribed from {feed_type} feed {feed_id}")

    async def get_project_progress(self, project_id: str) -> Dict[str, Any]:
        """Get project progress based on recent activity"""
        
        recent_activities = self.feed_cache.get(project_id, [])
        
        # Filter to last 7 days
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_activities = [a for a in recent_activities if a.timestamp >= week_ago]
        
        # Count different activity types
        completed_tasks = len([a for a in recent_activities if a.type == ActivityType.TASK_COMPLETED])
        created_tasks = len([a for a in recent_activities if a.type == ActivityType.TASK_CREATED])
        comments_added = len([a for a in recent_activities if a.type == ActivityType.COMMENT_ADDED])
        
        # Get unique active users
        active_users = len(set(a.user_id for a in recent_activities))
        
        # Calculate activity trend (last 3 days vs previous 3 days)
        three_days_ago = datetime.utcnow() - timedelta(days=3)
        six_days_ago = datetime.utcnow() - timedelta(days=6)
        
        recent_3_days = len([a for a in recent_activities if a.timestamp >= three_days_ago])
        previous_3_days = len([a for a in recent_activities if six_days_ago <= a.timestamp < three_days_ago])
        
        trend = "stable"
        if recent_3_days > previous_3_days * 1.2:
            trend = "increasing"
        elif recent_3_days < previous_3_days * 0.8:
            trend = "decreasing"
        
        return {
            "taskCount": len(recent_activities),  # Total activities as a proxy for task activity
            "taskDifference": 0,
            "assignedTaskCount": active_users,
            "assignedTaskDifference": 0,
            "completedTaskCount": completed_tasks,
            "completedTaskDifference": 0,
            "overdueTaskCount": 0,
            "overdueTaskDifference": 0,
            "incompleteTaskCount": created_tasks - completed_tasks if created_tasks > completed_tasks else 0,
            "incompleteTaskDifference": 0,
            # Kept for backward compatibility if needed elsewhere
            "project_id": project_id,
            "period_days": 7,
            "total_activities": len(recent_activities),
            "activity_trend": trend
        }

    def _determine_scope(self, project_id: Optional[str], task_id: Optional[str]) -> ActivityScope:
        """Determine activity scope based on IDs"""
        if task_id:
            return ActivityScope.TASK
        elif project_id:
            return ActivityScope.PROJECT
        else:
            return ActivityScope.WORKSPACE

    async def _enrich_user_data(self, activity: ActivityFeedItem):
        """Add user avatar and other user data to activity"""
        
        async with get_db() as db:
            result = await db.execute(select(User).where(User.id == activity.user_id))
            user = result.scalar_one_or_none()
            
            if user:
                activity.user_avatar = user.avatar_url  # Assuming User model has avatar_url field

    async def _add_to_caches(self, activity: ActivityFeedItem):
        """Add activity to relevant caches"""
        
        # Add to project cache
        if activity.project_id:
            if activity.project_id not in self.feed_cache:
                self.feed_cache[activity.project_id] = []
            self.feed_cache[activity.project_id].append(activity)
            
            # Limit cache size
            if len(self.feed_cache[activity.project_id]) > self.max_cache_size:
                self.feed_cache[activity.project_id] = self.feed_cache[activity.project_id][-self.max_cache_size:]
        
        # Add to workspace cache
        if activity.workspace_id:
            if activity.workspace_id not in self.workspace_activity_cache:
                self.workspace_activity_cache[activity.workspace_id] = []
            self.workspace_activity_cache[activity.workspace_id].append(activity)
            
            # Limit cache size
            if len(self.workspace_activity_cache[activity.workspace_id]) > self.max_cache_size:
                self.workspace_activity_cache[activity.workspace_id] = \
                    self.workspace_activity_cache[activity.workspace_id][-self.max_cache_size:]
        
        # Add to user cache
        if activity.user_id:
            if activity.user_id not in self.user_activity_cache:
                self.user_activity_cache[activity.user_id] = []
            self.user_activity_cache[activity.user_id].append(activity)
            
            # Limit cache size
            if len(self.user_activity_cache[activity.user_id]) > self.max_cache_size:
                self.user_activity_cache[activity.user_id] = \
                    self.user_activity_cache[activity.user_id][-self.max_cache_size:]

    async def _broadcast_activity(self, activity: ActivityFeedItem):
        """Broadcast activity to subscribed users"""
        
        # Create WebSocket message
        message = WSMessage(
            message_type="activity_feed_update",
            data=activity.to_dict(),
            timestamp=activity.timestamp,
            room_id=activity.project_id or activity.workspace_id,
            user_id="system"
        )
        
        # Broadcast to project subscribers
        if activity.project_id:
            project_subscribers = self.subscriptions.get("project", {}).get(activity.project_id, set())
            await asyncio.gather(*[
                ws_manager.send_personal_message(user_id, message)
                for user_id in project_subscribers
            ], return_exceptions=True)
        
        # Broadcast to workspace subscribers
        workspace_subscribers = self.subscriptions.get("workspace", {}).get(activity.workspace_id, set())
        await asyncio.gather(*[
                ws_manager.send_personal_message(user_id, message)
                for user_id in workspace_subscribers
            ], return_exceptions=True)

    async def _persist_activity(self, activity: ActivityFeedItem):
        """Persist activity to database"""
        
        async with get_db() as db:
            try:
                db_activity = ActivityLog(
                    user_id=activity.user_id,
                    action=activity.type.value,
                    entity_type=activity.entity_type,
                    entity_id=activity.entity_id,
                    changes=activity.changes,
                    timestamp=activity.timestamp
                )
                
                db.add(db_activity)
                await db.commit()
                
            except Exception as e:
                logger.error(f"Failed to persist activity {activity.id}: {e}")
                await db.rollback()

    async def _cleanup_caches(self):
        """Periodic cleanup of old activities"""
        while True:
            try:
                await asyncio.sleep(1800)  # Every 30 minutes
                
                cutoff_time = datetime.utcnow() - self.cache_ttl
                
                # Clean project caches
                for project_id, activities in self.feed_cache.items():
                    self.feed_cache[project_id] = [
                        a for a in activities if a.timestamp >= cutoff_time
                    ]
                
                # Clean workspace caches
                for workspace_id, activities in self.workspace_activity_cache.items():
                    self.workspace_activity_cache[workspace_id] = [
                        a for a in activities if a.timestamp >= cutoff_time
                    ]
                
                # Clean user caches
                for user_id, activities in self.user_activity_cache.items():
                    self.user_activity_cache[user_id] = [
                        a for a in activities if a.timestamp >= cutoff_time
                    ]
                
                self.last_cleanup = datetime.utcnow()
                logger.info("Cleaned up activity feed caches")
                
            except Exception as e:
                logger.error(f"Error in activity cleanup: {e}")

    async def _aggregate_activities(self):
        """Periodic aggregation of activities for insights"""
        while True:
            try:
                await asyncio.sleep(3600)  # Every hour
                
                # Generate activity summaries
                for project_id, activities in self.feed_cache.items():
                    if activities:
                        summary = await self.get_project_progress(project_id)
                        
                        # Broadcast project progress update
                        progress_message = WSMessage(
                            message_type="project_progress_update",
                            data=summary,
                            timestamp=datetime.utcnow(),
                            room_id=project_id,
                            user_id="system"
                        )
                        
                        await ws_manager.broadcast_to_project(project_id, progress_message)
                
            except Exception as e:
                logger.error(f"Error in activity aggregation: {e}")

# Global instance
activity_feed_service = ActivityFeedService()