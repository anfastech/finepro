"""
WebSocket Event Listeners and Background Tasks
Handles automated events, reminders, and activity aggregation
"""
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from app.services.notification_service import notification_service, NotificationType, NotificationPriority
from app.services.activity_feed_service import activity_feed_service
from app.services.presence_service import presence_service
from app.services.task_service import TaskService
from app.services.project_service import ProjectService
from app.core.websocket_manager import ws_manager, WSMessage, MessageType
from app.database import get_db
import logging

logger = logging.getLogger(__name__)

class WebSocketEventListeners:
    """Background event listeners for WebSocket and automated notifications"""
    
    def __init__(self):
        self.active_tasks: Dict[str, Dict[str, Any]] = {}  # task_id -> task_data
        self.active_projects: Dict[str, Dict[str, Any]] = {}  # project_id -> project_data
        self.due_date_check_interval = timedelta(hours=1)  # Check every hour
        self.daily_summary_time = "09:00"  # Send daily summary at 9 AM
        
        # Start background tasks
        asyncio.create_task(self._check_due_dates())
        asyncio.create_task(self._send_daily_summaries())
        asyncio.create_task(self._cleanup_old_activities())
        asyncio.create_task(self._monitor_workspace_activity())

    async def _check_due_dates(self):
        """Check for tasks due soon and overdue"""
        while True:
            try:
                await asyncio.sleep(3600)  # Check every hour
                
                current_time = datetime.utcnow()
                three_days_from_now = current_time + timedelta(days=3)
                
                db = next(get_db())
                try:
                    task_service = TaskService(db)
                    project_service = ProjectService(db)
                    
                    # Get tasks that need notification
                    tasks_due_soon = await task_service.get_tasks_due_between(
                        start_time=current_time,
                        end_time=three_days_from_now
                    )
                    
                    tasks_overdue = await task_service.get_overdue_tasks()
                    
                    # Process tasks due soon
                    for task in tasks_due_soon:
                        if not hasattr(task, '_notified_due_soon') or not task._notified_due_soon:
                            # Get project for workspace info
                            project = await project_service.get_by_id(task.project_id)
                            
                            await notification_service.notify_task_due_soon(
                                task_id=str(task.id),
                                workspace_id=str(project.workspace_id),
                                project_id=str(task.project_id),
                                assigned_to=str(task.assigned_to) if task.assigned_to else None,
                                task_title=task.title,
                                due_date=task.due_date
                            )
                            
                            # Mark as notified
                            task._notified_due_soon = True
                            logger.info(f"Sent due soon notification for task {task.id}")
                    
                    # Process overdue tasks
                    for task in tasks_overdue:
                        if not hasattr(task, '_notified_overdue') or not task._notified_overdue:
                            # Get project for workspace info
                            project = await project_service.get_by_id(task.project_id)
                            
                            await notification_service.notify_task_overdue(
                                task_id=str(task.id),
                                workspace_id=str(project.workspace_id),
                                project_id=str(task.project_id),
                                assigned_to=str(task.assigned_to) if task.assigned_to else None,
                                task_title=task.title,
                                due_date=task.due_date
                            )
                            
                            # Mark as notified
                            task._notified_overdue = True
                            logger.info(f"Sent overdue notification for task {task.id}")
                
                finally:
                    await db.close()
                
            except Exception as e:
                logger.error(f"Error in due date checker: {e}")

    async def _send_daily_summaries(self):
        """Send daily activity summaries to users"""
        while True:
            try:
                # Calculate time until next 9 AM
                now = datetime.utcnow()
                target_time = now.replace(hour=9, minute=0, second=0, microsecond=0)
                
                # If it's already past 9 AM, schedule for tomorrow
                if now >= target_time:
                    target_time += timedelta(days=1)
                
                sleep_seconds = (target_time - now).total_seconds()
                await asyncio.sleep(sleep_seconds)
                
                # Send daily summaries
                db = next(get_db())
                try:
                    workspace_service = ProjectService(db)
                    
                    # Get all workspaces (in a real implementation, you'd get all users)
                    workspaces = await workspace_service.get_all_workspaces()  # This would need to be implemented
                    
                    for workspace in workspaces:
                        await self._send_workspace_summary(str(workspace.id))
                
                finally:
                    await db.close()
                
            except Exception as e:
                logger.error(f"Error in daily summary sender: {e}")

    async def _send_workspace_summary(self, workspace_id: str):
        """Send daily summary for a specific workspace"""
        try:
            # Get yesterday's activities
            yesterday = datetime.utcnow() - timedelta(days=1)
            start_of_yesterday = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_yesterday = yesterday.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            # Get activities from yesterday
            activities = await activity_feed_service.get_workspace_feed(
                workspace_id=workspace_id,
                since=start_of_yesterday
            )
            
            # Filter to yesterday's activities
            yesterday_activities = [
                a for a in activities 
                if start_of_yesterday <= datetime.fromisoformat(a["timestamp"]) <= end_of_yesterday
            ]
            
            if yesterday_activities:
                # Create summary message
                summary = {
                    "workspace_id": workspace_id,
                    "date": yesterday.strftime("%Y-%m-%d"),
                    "total_activities": len(yesterday_activities),
                    "tasks_completed": len([a for a in yesterday_activities if a["type"] == "task_completed"]),
                    "tasks_created": len([a for a in yesterday_activities if a["type"] == "task_created"]),
                    "comments_added": len([a for a in yesterday_activities if a["type"] == "comment_added"]),
                    "top_contributors": self._get_top_contributors(yesterday_activities)
                }
                
                # Send summary notification to workspace members
                # In a real implementation, you'd get workspace members and send to each
                summary_message = WSMessage(
                    type="daily_summary",
                    data=summary,
                    timestamp=datetime.utcnow(),
                    room_id=workspace_id,
                    user_id="system"
                )
                
                await ws_manager.broadcast_to_workspace(workspace_id, summary_message)
                logger.info(f"Sent daily summary for workspace {workspace_id}")
        
        except Exception as e:
            logger.error(f"Error sending workspace summary: {e}")

    def _get_top_contributors(self, activities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Get top contributors from activities"""
        user_counts = {}
        
        for activity in activities:
            user_id = activity.get("user_id")
            if user_id:
                user_counts[user_id] = user_counts.get(user_id, 0) + 1
        
        # Sort and return top 5
        sorted_users = sorted(user_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return [
            {"user_id": user_id, "activity_count": count}
            for user_id, count in sorted_users
        ]

    async def _cleanup_old_activities(self):
        """Clean up old activities and notifications"""
        while True:
            try:
                await asyncio.sleep(86400)  # Run daily
                
                cleanup_date = datetime.utcnow() - timedelta(days=30)
                
                # Clean old activities (in a real implementation, you'd delete from database)
                logger.info(f"Cleaning up activities older than {cleanup_date}")
                
                # Clean old notifications (handled by notification service)
                
            except Exception as e:
                logger.error(f"Error in activity cleanup: {e}")

    async def _monitor_workspace_activity(self):
        """Monitor workspace activity and send alerts for unusual patterns"""
        while True:
            try:
                await asyncio.sleep(1800)  # Check every 30 minutes
                
                # Check for inactive projects
                db = next(get_db())
                try:
                    project_service = ProjectService(db)
                    
                    # Get all projects
                    projects = await project_service.get_all_projects()
                    
                    for project in projects:
                        progress = await activity_feed_service.get_project_progress(str(project.id))
                        
                        # Alert if no activity for 7 days
                        if progress["total_activities"] == 0:
                            await self._send_project_alert(
                                project_id=str(project.id),
                                alert_type="inactive_project",
                                message=f"Project '{project.name}' has had no activity for 7 days"
                            )
                        
                        # Alert if project is falling behind
                        elif progress["activity_trend"] == "decreasing":
                            await self._send_project_alert(
                                project_id=str(project.id),
                                alert_type="decreasing_activity",
                                message=f"Activity in project '{project.name}' is decreasing"
                            )
                
                finally:
                    await db.close()
                
            except Exception as e:
                logger.error(f"Error in workspace activity monitor: {e}")

    async def _send_project_alert(
        self,
        project_id: str,
        alert_type: str,
        message: str
    ):
        """Send project alert to workspace members"""
        
        alert_message = WSMessage(
            type="project_alert",
            data={
                "project_id": project_id,
                "alert_type": alert_type,
                "message": message,
                "timestamp": datetime.utcnow().isoformat()
            },
            timestamp=datetime.utcnow(),
            room_id=project_id,
            user_id="system"
        )
        
        await ws_manager.broadcast_to_project(project_id, alert_message)
        logger.info(f"Sent project alert for {project_id}: {alert_type}")

    async def handle_user_connected(
        self,
        user_id: str,
        user_name: str,
        workspace_id: str
    ):
        """Handle new user connection"""
        
        # Set user presence online
        await presence_service.set_user_online(
            user_id=user_id,
            user_name=user_name,
            workspace_id=workspace_id
        )
        
        # Log activity
        await activity_feed_service.log_activity(
            activity_type=activity_feed_service.ActivityType.MEMBER_JOINED,
            user_id=user_id,
            user_name=user_name,
            workspace_id=workspace_id,
            title=f"{user_name} joined workspace",
            description=f"{user_name} is now online",
            entity_id=workspace_id,
            entity_type="workspace"
        )
        
        # Send welcome notification if new user
        await notification_service.send_welcome_notification(
            user_id=user_id,
            workspace_id=workspace_id,
            user_name=user_name
        )

    async def handle_user_disconnected(
        self,
        user_id: str,
        workspace_id: str
    ):
        """Handle user disconnection"""
        
        # Set user presence offline
        await presence_service.set_user_offline(user_id)
        
        # Log activity
        user_name = "Unknown User"  # In real implementation, get from cache
        
        await activity_feed_service.log_activity(
            activity_type=activity_feed_service.ActivityType.MEMBER_LEFT,
            user_id=user_id,
            user_name=user_name,
            workspace_id=workspace_id,
            title=f"{user_name} left workspace",
            description=f"{user_name} is now offline",
            entity_id=workspace_id,
            entity_type="workspace"
        )

    async def handle_task_update_broadcast(
        self,
        task_id: str,
        workspace_id: str,
        project_id: str,
        updated_by: str,
        changes: Dict[str, Any]
    ):
        """Handle task update broadcasting to subscribed users"""
        
        # Get current task presence
        task_viewers = await presence_service.get_task_presence(task_id)
        
        if task_viewers:
            # Send targeted update to users viewing this task
            update_message = WSMessage(
                type="task_updated_detailed",
                data={
                    "task_id": task_id,
                    "changes": changes,
                    "updated_by": updated_by,
                    "timestamp": datetime.utcnow().isoformat()
                },
                timestamp=datetime.utcnow(),
                room_id=task_id,
                user_id="system"
            )
            
            for viewer in task_viewers:
                await ws_manager.send_personal_message(viewer["user_id"], update_message)

    async def handle_sprint_start_automation(
        self,
        sprint_id: str,
        project_id: str,
        workspace_id: str
    ):
        """Handle automated sprint start notifications"""
        
        # In a real implementation, you'd get sprint details from database
        sprint_name = f"Sprint {sprint_id}"
        
        # Log activity
        await activity_feed_service.log_sprint_activity(
            action="started",
            user_id="system",
            user_name="System",
            workspace_id=workspace_id,
            project_id=project_id,
            sprint_name=sprint_name
        )
        
        # Send notification
        await notification_service.create_notification(
            notification_type=NotificationType.SPRINT_STARTED,
            user_id="all",  # Broadcast to all project members
            title=f"Sprint Started: {sprint_name}",
            message=f"Sprint '{sprint_name}' has started. Good luck!",
            priority=NotificationPriority.MEDIUM,
            workspace_id=workspace_id,
            project_id=project_id,
            data={"sprint_id": sprint_id, "sprint_name": sprint_name}
        )

# Global event listener instance
event_listeners = WebSocketEventListeners()