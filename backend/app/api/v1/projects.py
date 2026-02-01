"""
Project API Endpoints - Full CRUD operations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectCreateRequest
from app.services.project_service import ProjectService
from app.services.activity_feed_service import activity_feed_service

router = APIRouter()


@router.get("/workspaces/{workspace_id}/projects", response_model=List[ProjectResponse])
async def list_projects(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all projects in a workspace"""
    service = ProjectService(db)
    projects = await service.get_by_workspace(workspace_id)
    return projects


@router.post("/workspaces/{workspace_id}/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    workspace_id: str,
    project_data: ProjectCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new project in a workspace"""
    service = ProjectService(db)
    
    # Map request data to internal create model
    internal_data = ProjectCreate(
        **project_data.model_dump(),
        workspace_id=workspace_id,
        created_by=current_user.id
    )
    
    project = await service.create(
        workspace_id=workspace_id,
        data=internal_data,
        user_id=current_user.id
    )
    return project


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single project by ID"""
    service = ProjectService(db)
    project = await service.get_by_id(project_id)
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return project


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a project"""
    service = ProjectService(db)
    project = await service.update(project_id, project_data, current_user.id)
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return project


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a project"""
    service = ProjectService(db)
    deleted = await service.delete(project_id, current_user.id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return None


@router.get("/projects/{project_id}/analytics")
async def get_project_analytics(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get project analytics and progress"""
    # Verify project exists first
    service = ProjectService(db)
    project = await service.get_by_id(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
        
    analytics = await activity_feed_service.get_project_progress(str(project_id))
    return analytics

