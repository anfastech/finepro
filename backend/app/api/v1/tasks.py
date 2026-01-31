"""
Task API Endpoints - Full CRUD with filtering and bulk operations (Enhanced with Real-time)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List, Dict, Any
from uuid import UUID

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.task import Task
from app.models.enums import TaskStatus, Priority
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskWithComments, TaskCreateRequest, BulkTaskUpdate
from app.services.task_service import TaskService
from app.services.enhanced_task_service import EnhancedTaskService
from app.services.realtime_task_service import realtime_task_service
from app.services.presence_service import presence_service

router = APIRouter()


# ==================== PROJECT-SCOPED ENDPOINTS ====================

@router.get("/projects/{project_id}/tasks", response_model=List[TaskResponse])
async def list_tasks(
    project_id: UUID,
    status: Optional[TaskStatus] = Query(None, description="Filter by status"),
    priority: Optional[Priority] = Query(None, description="Filter by priority"),
    assigned_to: Optional[UUID] = Query(None, description="Filter by assignee"),
    search: Optional[str] = Query(None, description="Search in title/description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all tasks in a project with advanced filtering.
    """
    service = TaskService(db)
    tasks = await service.get_by_project(
        project_id=project_id,
        status=status,
        priority=priority,
        assigned_to=assigned_to,
        search=search,
        skip=skip,
        limit=limit
    )
    return tasks


@router.post("/projects/{project_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: UUID,
    task_data: TaskCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new task in a project with real-time notifications.
    """
    # Use enhanced service for real-time capabilities
    enhanced_service = EnhancedTaskService(db)
    
    # Convert task_data to dict for enhanced service
    task_dict = task_data.dict()
    task_dict["created_by"] = str(current_user.id)
    
    task = await enhanced_service.create_task_with_realtime(
        task_data=task_dict,
        project_id=str(project_id),
        created_by=str(current_user.id),
        notify_users=True
    )
    return task


@router.post("/bulk-update", status_code=status.HTTP_200_OK)
async def bulk_update_tasks(
    update_data: BulkTaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Bulk update tasks (status and position).
    """
    service = TaskService(db)
    
    updated_tasks = []
    for item in update_data.tasks:
        # We process updates sequentially for now
        # A bulk update method in service would be more performance efficient
        updated = await service.update(
            task_id=item.id,
            user_id=current_user.id,
            data=TaskUpdate(status=item.status, position=item.position)
        )
        if updated:
            updated_tasks.append(updated)
            
    return {"updated": len(updated_tasks), "success": True}


@router.get("/projects/{project_id}/tasks/realtime-stats")
async def get_project_task_stats(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get real-time statistics for tasks in a project.
    
    ✅ **Real-time Features:**
    - Current active viewers/editors
    - Task completion rates
    - Activity trends
    - Team workload distribution
    """
    from app.services.activity_feed_service import activity_feed_service
    from app.services.presence_service import presence_service
    from app.services.project_service import ProjectService
    
    # Check project access
    project_service = ProjectService(db)
    if not await project_service.has_access(str(project_id), str(current_user.id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to project"
        )
    
    # Get project progress
    progress = await activity_feed_service.get_project_progress(str(project_id))
    
    # Get current presence
    presence = await presence_service.get_project_presence(str(project_id))
    
    return {
        "project_id": str(project_id),
        "progress": progress,
        "current_presence": {
            "online_users": len([p for p in presence if p["status"] == "online"]),
            "total_viewers": len([p for p in presence if p.get("current_task_id")]),
            "active_editors": len([p for p in presence if p.get("is_editing", False)])
        },
        "realtime_features": [
            "Live task updates",
            "Typing indicators", 
            "Assignment notifications",
            "Activity feeds",
            "Presence awareness"
        ]
    }


# ==================== TASK CRUD ENDPOINTS ====================

@router.get("/{task_id}", response_model=TaskWithComments)
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a single task by ID with all relationships.
    """
    service = TaskService(db)
    task = await service.get_by_id(task_id)
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Convert comments to dict for response
    task_dict = {
        **{c.name: getattr(task, c.name) for c in task.__table__.columns},
        "comments": [
            {
                "id": str(c.id),
                "content": c.content,
                "user_id": str(c.user_id),
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in task.comments
        ] if task.comments else []
    }
    
    return task_dict


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    task_data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a task with real-time notifications.
    """
    # Use enhanced service for real-time capabilities
    enhanced_service = EnhancedTaskService(db)
    
    # Convert task_data to dict for enhanced service
    task_dict = task_data.dict(exclude_unset=True)
    
    try:
        task = await enhanced_service.update_task_with_realtime(
            task_id=str(task_id),
            update_data=task_dict,
            updated_by=str(current_user.id),
            notify_assignee=True
        )
        
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        return task
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.patch("/{task_id}/status", response_model=TaskResponse)
async def change_task_status(
    task_id: UUID,
    new_status: TaskStatus,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Change task status with real-time notifications.
    """
    enhanced_service = EnhancedTaskService(db)
    
    try:
        task = await enhanced_service.change_task_status_with_realtime(
            task_id=str(task_id),
            new_status=new_status.value,
            changed_by=str(current_user.id),
            notify_team=True
        )
        
        return task
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a task permanently with real-time notifications.
    """
    # Use enhanced service for real-time capabilities
    enhanced_service = EnhancedTaskService(db)
    
    try:
        deleted = await enhanced_service.delete_task_with_realtime(
            task_id=str(task_id),
            deleted_by=str(current_user.id)
        )
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        return None
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# ==================== TASK ASSIGNMENT ====================

@router.post("/{task_id}/assign", response_model=TaskResponse)
async def assign_task(
    task_id: UUID,
    user_id: UUID = Query(..., description="User ID to assign task to"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Assign a task to a user with real-time notifications.
    """
    # Use enhanced service for real-time capabilities
    enhanced_service = EnhancedTaskService(db)
    
    try:
        task = await enhanced_service.assign_task_with_realtime(
            task_id=str(task_id),
            assigned_to=str(user_id),
            assigned_by=str(current_user.id),
            notify=True
        )
        
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        return task
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# ==================== BULK OPERATIONS ====================

@router.patch("/bulk-update", response_model=List[TaskResponse])
async def bulk_update_tasks(
    updates: List[dict],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Bulk update multiple tasks (for Kanban drag/drop).
    """
    service = TaskService(db)
    tasks = await service.bulk_update(updates, current_user.id)
    return tasks


# ==================== REAL-TIME INTERACTION ENDPOINTS ====================

@router.post("/{task_id}/typing")
async def set_typing_indicator(
    task_id: UUID,
    is_typing: bool,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Set typing indicator for a user in a task.
    """
    service = TaskService(db)
    if not await service.has_access(str(task_id), str(current_user.id)):
        raise HTTPException(status_code=403, detail="Access denied to task")
    
    await realtime_task_service.set_typing_indicator(
        user_id=str(current_user.id),
        user_name=current_user.name,
        task_id=str(task_id),
        is_typing=is_typing
    )
    
    return {"message": "Typing indicator updated"}


@router.post("/{task_id}/editing")
async def set_editing_status(
    task_id: UUID,
    is_editing: bool,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Set editing status for a user in a task.
    """
    service = TaskService(db)
    if not await service.has_access(str(task_id), str(current_user.id)):
        raise HTTPException(status_code=403, detail="Access denied to task")
    
    await realtime_task_service.set_editing_status(
        user_id=str(current_user.id),
        user_name=current_user.name,
        task_id=str(task_id),
        is_editing=is_editing
    )
    
    return {"message": "Editing status updated"}


@router.get("/{task_id}/typers")
async def get_typing_users(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of currently typing users for a task.
    """
    service = TaskService(db)
    if not await service.has_access(str(task_id), str(current_user.id)):
        raise HTTPException(status_code=403, detail="Access denied to task")
    
    typing_users = await realtime_task_service.get_typing_users(str(task_id))
    
    return {"typing_users": typing_users}


@router.get("/{task_id}/editors")
async def get_editing_users(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of currently editing users for a task.
    """
    service = TaskService(db)
    if not await service.has_access(str(task_id), str(current_user.id)):
        raise HTTPException(status_code=403, detail="Access denied to task")
    
    editing_users = await realtime_task_service.get_editing_users(str(task_id))
    
    return {"editing_users": editing_users}


@router.post("/{task_id}/comments/realtime")
async def add_comment_realtime(
    task_id: UUID,
    comment_data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a comment with real-time notifications and @mention detection.
    """
    # Use enhanced service
    enhanced_service = EnhancedTaskService(db)
    
    try:
        content = comment_data.get("content", "")
        mention_users = comment_data.get("mentions", [])
        
        comment_id = await enhanced_service.add_comment_with_realtime(
            task_id=str(task_id),
            comment_content=content,
            user_id=str(current_user.id),
            mention_users=mention_users
        )
        
        return {
            "comment_id": comment_id,
            "message": "Comment added with real-time notifications"
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/{task_id}/activity-summary")
async def get_task_activity_summary(
    task_id: UUID,
    hours: int = Query(24, description="Hours of activity to summarize"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get activity summary for a specific task.
    """
    from app.services.activity_feed_service import activity_feed_service
    from datetime import datetime, timedelta
    
    # Get recent activities
    since = datetime.utcnow() - timedelta(hours=hours)
    # Note: In a real implementation we'd filter optimally. Here we fetch project feed and filter in memory for now.
    # Getting task to find project_id
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
         raise HTTPException(status_code=404, detail="Task not found")

    activities = await activity_feed_service.get_project_feed(
        project_id=str(task.project_id), 
        since=since,
        limit=50
    )
    
    # Filter to task-specific activities
    task_activities = [
        a for a in activities 
        if a.get("task_id") == str(task_id) or a.get("entity_id") == str(task_id)
    ]
    
    # Analyze participants and engagement
    participants = set()
    status_changes = 0
    comments = 0
    
    for activity in task_activities:
        participants.add(activity.get("user_id"))
        
        if activity.get("type") == "task_updated":
            status_changes += 1
        elif activity.get("type") == "comment_added":
            comments += 1
    
    return {
        "task_id": str(task_id),
        "timeframe_hours": hours,
        "total_activities": len(task_activities),
        "unique_participants": len(participants),
        "status_changes": status_changes,
        "comments_added": comments,
        "activities": task_activities
    }


# ==================== REAL-TIME PRESENCE ENDPOINTS ====================

@router.post("/{task_id}/viewing")
async def start_viewing_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark user as currently viewing a task.
    """
    from app.services.project_service import ProjectService
    
    # Get task
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Update presence
    await presence_service.update_activity(
        user_id=str(current_user.id),
        activity_type="viewing_task",
        entity_id=str(task_id),
        data={"task_title": task.title}
    )
    
    return {"message": "Now viewing task", "task_id": str(task_id)}


@router.delete("/{task_id}/viewing")
async def stop_viewing_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark user as no longer viewing a task.
    """
    # Update presence to clear current task
    await presence_service.update_activity(
        user_id=str(current_user.id),
        activity_type="stopped_viewing_task",
        entity_id=str(task_id)
    )
    
    return {"message": "Stopped viewing task", "task_id": str(task_id)}


# ==================== DEPENDENCIES ====================

@router.get("/{task_id}/dependencies", response_model=List[TaskResponse])
async def get_task_dependencies(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all dependencies of a task.
    """
    service = TaskService(db)
    dependencies = await service.get_dependencies(task_id)
    return dependencies


@router.post("/{task_id}/dependencies/{dependency_id}", response_model=TaskResponse)
async def add_task_dependency(
    task_id: UUID,
    dependency_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a dependency to a task.
    """
    if task_id == dependency_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A task cannot depend on itself"
        )
    
    service = TaskService(db)
    task = await service.add_dependency(task_id, dependency_id, current_user.id)
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not add dependency. Task not found or circular dependency detected."
        )
    
    return task


@router.delete("/{task_id}/dependencies/{dependency_id}", response_model=TaskResponse)
async def remove_task_dependency(
    task_id: UUID,
    dependency_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove a dependency from a task.
    """
    service = TaskService(db)
    task = await service.remove_dependency(task_id, dependency_id, current_user.id)
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    return task


# ==================== EPIC-SCOPED ENDPOINTS ====================

@router.get("/epics/{epic_id}/tasks", response_model=List[TaskResponse])
async def list_tasks_by_epic(
    epic_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all tasks in a specific epic.
    """
    service = TaskService(db)
    tasks = await service.get_by_epic(epic_id)
    return tasks
