from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.epic import Epic
from app.models.project import Project
from app.schemas.epic import EpicCreate, EpicUpdate, EpicResponse
from app.services.epic_service import EpicService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/projects/{project_id}/epics", response_model=List[EpicResponse])
async def list_epics_in_project(project_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = EpicService(db)
    return await svc.get_by_project(project_id)

@router.post("/projects/{project_id}/epics", response_model=EpicResponse, status_code=201)
async def create_epic_in_project(project_id: UUID, epic_in: EpicCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = EpicService(db)
    epic = await svc.create(project_id, epic_in)
    return epic

@router.get("/epics/{id}", response_model=EpicResponse)
async def get_epic(id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = EpicService(db)
    epic = await svc.get_by_id(id)
    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")
    return epic

@router.patch("/epics/{id}", response_model=EpicResponse)
async def update_epic(id: UUID, epic_in: EpicUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = EpicService(db)
    epic = await svc.update(id, epic_in)
    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")
    return epic

@router.delete("/epics/{id}")
async def delete_epic(id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = EpicService(db)
    ok = await svc.delete(id)
    if not ok:
        raise HTTPException(status_code=404, detail="Epic not found")
    return {"success": True}
