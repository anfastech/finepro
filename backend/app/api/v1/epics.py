"""
Epic API Endpoints - CRUD operations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List


from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.epic import EpicCreate, EpicUpdate, EpicResponse
from app.services.epic_service import EpicService

router = APIRouter()


@router.get("/projects/{project_id}", response_model=List[EpicResponse])
async def list_project_epics(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all epics in a project"""
    service = EpicService(db)
    epics = await service.get_by_project(project_id)
    return epics


@router.post("/epics/", response_model=EpicResponse, status_code=status.HTTP_201_CREATED)
async def create_epic(
    epic_data: EpicCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new epic"""
    service = EpicService(db)
    epic = await service.create(epic_data, current_user.id)
    return epic


@router.get("/epics/{epic_id}", response_model=EpicResponse)
async def get_epic(
    epic_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get epic details"""
    service = EpicService(db)
    epic = await service.get_by_id(epic_id)
    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")
    return epic


@router.patch("/epics/{epic_id}", response_model=EpicResponse)
async def update_epic(
    epic_id: str,
    epic_data: EpicUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an epic"""
    service = EpicService(db)
    epic = await service.update(epic_id, epic_data, current_user.id)
    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")
    return epic


@router.delete("/epics/{epic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_epic(
    epic_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an epic"""
    service = EpicService(db)
    success = await service.delete(epic_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Epic not found")
    return None
