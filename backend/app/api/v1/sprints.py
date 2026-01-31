"""
Sprint API Endpoints - CRUD and task assignment
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.sprint import SprintResponse, SprintCreate, SprintUpdate
from app.services.sprint_service import SprintService

router = APIRouter()


@router.get("/projects/{project_id}", response_model=List[SprintResponse])
async def list_project_sprints(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all sprints in a project"""
    service = SprintService(db)
    sprints = await service.get_by_project(project_id)
    return sprints


@router.post("/", response_model=SprintResponse, status_code=status.HTTP_201_CREATED)
async def create_sprint(
    sprint_data: SprintCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new sprint"""
    service = SprintService(db)
    sprint = await service.create(sprint_data, current_user.id)
    return sprint


@router.get("/{sprint_id}", response_model=SprintResponse)
async def get_sprint(
    sprint_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get sprint details"""
    service = SprintService(db)
    sprint = await service.get_by_id(sprint_id)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return sprint


@router.patch("/{sprint_id}", response_model=SprintResponse)
async def update_sprint(
    sprint_id: UUID,
    sprint_data: SprintUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a sprint"""
    service = SprintService(db)
    sprint = await service.update(sprint_id, sprint_data, current_user.id)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return sprint


@router.delete("/{sprint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sprint(
    sprint_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a sprint"""
    service = SprintService(db)
    success = await service.delete(sprint_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return None


@router.post("/{sprint_id}/tasks/{task_id}", status_code=status.HTTP_200_OK)
async def add_task_to_sprint(
    sprint_id: UUID,
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a task to a sprint"""
    service = SprintService(db)
    await service.add_task_to_sprint(sprint_id, task_id, current_user.id)
    return {"message": "Task added to sprint"}


@router.delete("/{sprint_id}/tasks/{task_id}", status_code=status.HTTP_200_OK)
async def remove_task_from_sprint(
    sprint_id: UUID,
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a task from a sprint"""
    service = SprintService(db)
    await service.remove_task_from_sprint(sprint_id, task_id, current_user.id)
    return {"message": "Task removed from sprint"}
