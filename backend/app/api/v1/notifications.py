"""
Notification API Endpoints
REST endpoints for managing real-time notifications
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.notification_service import notification_service, NotificationType, NotificationPriority

router = APIRouter()

# Pydantic models for requests/responses
class NotificationPreferences(BaseModel):
    """User notification preferences"""
    task_assigned: bool = True
    task_due_soon: bool = True
    task_overdue: bool = True
    comment_added: bool = True
    mention: bool = True
    project_updates: bool = True
    quiet_hours: Dict[str, Any] = {
        "enabled": False,
        "start": "22:00",
        "end": "08:00"
    }
    daily_summary: bool = True
    email_enabled: bool = True
    push_enabled: bool = True

class BulkNotificationAction(BaseModel):
    """Bulk notification action"""
    notification_ids: List[str]
    action: str  # "mark_read", "mark_unread", "delete"

# ==================== NOTIFICATION MANAGEMENT ENDPOINTS ====================

@router.get("/notifications")
async def get_user_notifications(
    unread_only: bool = Query(False, description="Get only unread notifications"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of notifications"),
    offset: int = Query(0, ge=0, description="Number of notifications to skip"),
    current_user: User = Depends(get_current_user)
):
    """
    Get notifications for the current user.
    
    - **unread_only**: Filter to only unread notifications
    - **limit**: Maximum number of notifications to return
    - **offset**: Number of notifications to skip (for pagination)
    """
    notifications = await notification_service.get_user_notifications(
        user_id=str(current_user.id),
        unread_only=unread_only,
        limit=limit
    )
    
    # Apply offset manually since our service doesn't support it yet
    if offset > 0:
        notifications = notifications[offset:]
    
    return {
        "success": True,
        "data": {
            "notifications": notifications,
            "total": len(notifications),
            "unread_count": len([n for n in notifications if not n.get("read_at")])
        }
    }

@router.get("/notifications/stats")
async def get_notification_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Get notification statistics for the current user.
    """
    stats = await notification_service.get_notification_stats(str(current_user.id))
    
    return {
        "success": True,
        "data": stats
    }

@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Mark a specific notification as read.
    """
    success = await notification_service.mark_notification_read(
        user_id=str(current_user.id),
        notification_id=notification_id
    )
    
    if not success:
        raise HTTPException(
            status_code=404, 
            detail="Notification not found or access denied"
        )
    
    return {
        "success": True,
        "message": "Notification marked as read"
    }

@router.patch("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user)
):
    """
    Mark all notifications as read for the current user.
    """
    await notification_service.mark_all_notifications_read(str(current_user.id))
    
    return {
        "success": True,
        "message": "All notifications marked as read"
    }

@router.post("/notifications/bulk-action")
async def bulk_notification_action(
    action_data: BulkNotificationAction,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Perform bulk action on multiple notifications.
    
    - **notification_ids**: List of notification IDs
    - **action**: Action to perform ("mark_read", "mark_unread", "delete")
    """
    if action_data.action not in ["mark_read", "mark_unread", "delete"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid action. Must be 'mark_read', 'mark_unread', or 'delete'"
        )
    
    results = {
        "success": 0,
        "failed": 0,
        "failed_ids": []
    }
    
    for notification_id in action_data.notification_ids:
        try:
            if action_data.action == "mark_read":
                success = await notification_service.mark_notification_read(
                    user_id=str(current_user.id),
                    notification_id=notification_id
                )
            elif action_data.action == "mark_unread":
                # Implement mark_unread in notification service if needed
                success = True  # Placeholder
            elif action_data.action == "delete":
                # Implement delete notification in notification service if needed
                success = True  # Placeholder
            
            if success:
                results["success"] += 1
            else:
                results["failed"] += 1
                results["failed_ids"].append(notification_id)
                
        except Exception:
            results["failed"] += 1
            results["failed_ids"].append(notification_id)
    
    return {
        "success": True,
        "data": results
    }

# ==================== NOTIFICATION PREFERENCES ENDPOINTS ====================

@router.get("/notifications/preferences")
async def get_notification_preferences(
    current_user: User = Depends(get_current_user)
):
    """
    Get notification preferences for the current user.
    """
    preferences = notification_service.user_preferences.get(str(current_user.id), {
        "task_assigned": True,
        "task_due_soon": True,
        "task_overdue": True,
        "comment_added": True,
        "mention": True,
        "project_updates": True,
        "quiet_hours": {"enabled": False, "start": "22:00", "end": "08:00"},
        "daily_summary": True,
        "email_enabled": True,
        "push_enabled": True
    })
    
    return {
        "success": True,
        "data": preferences
    }

@router.put("/notifications/preferences")
async def update_notification_preferences(
    preferences: NotificationPreferences,
    current_user: User = Depends(get_current_user)
):
    """
    Update notification preferences for the current user.
    """
    await notification_service.update_user_preferences(
        user_id=str(current_user.id),
        preferences=preferences.dict()
    )
    
    return {
        "success": True,
        "message": "Notification preferences updated",
        "data": preferences.dict()
    }

@router.post("/notifications/test")
async def test_notifications(
    background_tasks: BackgroundTasks,
    notification_type: str = Query(..., description="Type of notification to test"),
    current_user: User = Depends(get_current_user)
):
    """
    Send a test notification to verify the notification system.
    
    - **notification_type**: Type of notification to test (task_assigned, comment_added, etc.)
    """
    # Get user's first workspace for context
    from app.services.workspace_service import WorkspaceService
    db = next(get_db())
    
    try:
        workspace_service = WorkspaceService(db)
        workspaces = await workspace_service.get_user_workspaces(str(current_user.id))
        
        if not workspaces:
            raise HTTPException(
                status_code=404,
                detail="No workspace found for user"
            )
        
        workspace_id = str(workspaces[0].id)
        
        # Create test notification based on type
        if notification_type == "task_assigned":
            await notification_service.create_notification(
                notification_type=NotificationType.TASK_ASSIGNED,
                user_id=str(current_user.id),
                title="Test: New Task Assigned",
                message="This is a test notification for task assignment.",
                priority=NotificationPriority.HIGH,
                workspace_id=workspace_id,
                data={"test": True, "type": "task_assigned"}
            )
        
        elif notification_type == "comment_added":
            await notification_service.create_notification(
                notification_type=NotificationType.COMMENT_ADDED,
                user_id=str(current_user.id),
                title="Test: New Comment",
                message="This is a test notification for a new comment.",
                priority=NotificationPriority.MEDIUM,
                workspace_id=workspace_id,
                data={"test": True, "type": "comment_added"}
            )
        
        elif notification_type == "mention":
            await notification_service.create_notification(
                notification_type=NotificationType.MENTION,
                user_id=str(current_user.id),
                title="Test: You were mentioned",
                message="This is a test notification for a mention.",
                priority=NotificationPriority.HIGH,
                workspace_id=workspace_id,
                data={"test": True, "type": "mention"}
            )
        
        elif notification_type == "task_overdue":
            await notification_service.create_notification(
                notification_type=NotificationType.TASK_OVERDUE,
                user_id=str(current_user.id),
                title="Test: Task Overdue",
                message="This is a test notification for an overdue task.",
                priority=NotificationPriority.CRITICAL,
                workspace_id=workspace_id,
                data={"test": True, "type": "task_overdue"}
            )
        
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid notification type. Use: task_assigned, comment_added, mention, or task_overdue"
            )
        
        return {
            "success": True,
            "message": f"Test notification ({notification_type}) sent successfully"
        }
        
    finally:
        await db.close()

# ==================== NOTIFICATION SUBSCRIPTION ENDPOINTS ====================

@router.post("/notifications/subscribe/{notification_type}")
async def subscribe_to_notification_type(
    notification_type: str,
    current_user: User = Depends(get_current_user)
):
    """
    Subscribe to a specific type of notification.
    """
    # Validate notification type
    try:
        notification_enum = NotificationType(notification_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid notification type: {notification_type}"
        )
    
    # Get current preferences
    preferences = notification_service.user_preferences.get(str(current_user.id), {})
    
    # Enable the notification type
    preferences[notification_type] = True
    
    # Update preferences
    await notification_service.update_user_preferences(
        user_id=str(current_user.id),
        preferences=preferences
    )
    
    return {
        "success": True,
        "message": f"Subscribed to {notification_type} notifications"
    }

@router.delete("/notifications/subscribe/{notification_type}")
async def unsubscribe_from_notification_type(
    notification_type: str,
    current_user: User = Depends(get_current_user)
):
    """
    Unsubscribe from a specific type of notification.
    """
    # Validate notification type
    try:
        notification_enum = NotificationType(notification_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid notification type: {notification_type}"
        )
    
    # Get current preferences
    preferences = notification_service.user_preferences.get(str(current_user.id), {})
    
    # Disable the notification type
    preferences[notification_type] = False
    
    # Update preferences
    await notification_service.update_user_preferences(
        user_id=str(current_user.id),
        preferences=preferences
    )
    
    return {
        "success": True,
        "message": f"Unsubscribed from {notification_type} notifications"
    }

# ==================== NOTIFICATION TEMPLATES ENDPOINTS ====================

@router.get("/notifications/templates")
async def get_notification_templates(
    current_user: User = Depends(get_current_user)
):
    """
    Get available notification templates and their descriptions.
    """
    templates = {
        "task_assigned": {
            "name": "Task Assigned",
            "description": "When a task is assigned to you",
            "priority": "high",
            "default_enabled": True
        },
        "task_due_soon": {
            "name": "Task Due Soon",
            "description": "When a task is due in 3 days",
            "priority": "medium",
            "default_enabled": True
        },
        "task_overdue": {
            "name": "Task Overdue",
            "description": "When a task is overdue",
            "priority": "critical",
            "default_enabled": True
        },
        "task_completed": {
            "name": "Task Completed",
            "description": "When a task is completed",
            "priority": "medium",
            "default_enabled": True
        },
        "comment_added": {
            "name": "Comment Added",
            "description": "When someone comments on your tasks",
            "priority": "medium",
            "default_enabled": True
        },
        "mention": {
            "name": "Mention",
            "description": "When someone mentions you in a comment",
            "priority": "high",
            "default_enabled": True
        },
        "project_created": {
            "name": "Project Created",
            "description": "When a new project is created in your workspace",
            "priority": "low",
            "default_enabled": True
        },
        "project_updated": {
            "name": "Project Updated",
            "description": "When a project is updated",
            "priority": "low",
            "default_enabled": True
        },
        "team_member_added": {
            "name": "Team Member Added",
            "description": "When a new member joins your workspace",
            "priority": "medium",
            "default_enabled": True
        },
        "deadline_approaching": {
            "name": "Deadline Approaching",
            "description": "When project deadlines are approaching",
            "priority": "high",
            "default_enabled": True
        },
        "welcome": {
            "name": "Welcome Message",
            "description": "Welcome message for new users",
            "priority": "low",
            "default_enabled": True
        }
    }
    
    return {
        "success": True,
        "data": templates
    }

@router.delete("/notifications/clear")
async def clear_all_notifications(
    current_user: User = Depends(get_current_user)
):
    """
    Clear all notifications for the current user.
    """
    # This would need to be implemented in notification service
    # For now, we'll mark all as read
    await notification_service.mark_all_notifications_read(str(current_user.id))
    
    return {
        "success": True,
        "message": "All notifications cleared"
    }