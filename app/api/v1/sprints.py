from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.sprint import Sprint
from app.schemas.sprint import SprintCreate, SprintUpdate, SprintResponse
from app.services.sprint_service import SprintService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/projects/{project_id}/sprints", response_model=List[SprintResponse])
async def list_sprints(project_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = SprintService(db)
    return await svc.get_by_project(project_id)

@router.post("/projects/{project_id}/sprints", response_model=SprintResponse, status_code=201)
async def create_sprint(project_id: UUID, sprint_in: SprintCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = SprintService(db)
    return await svc.create(project_id, sprint_in)

@router.get("/sprints/{id}", response_model=SprintResponse)
async def get_sprint(id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = SprintService(db)
    s = await svc.get_by_id(id)
    if not s:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return s

@router.patch("/sprints/{id}", response_model=SprintResponse)
async def update_sprint(id: UUID, sprint_in: SprintUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = SprintService(db)
    s = await svc.update(id, sprint_in)
    if not s:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return s

@router.delete("/sprints/{id}")
async def delete_sprint(id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = SprintService(db)
    ok = await svc.delete(id)
    if not ok:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return {"success": True}

@router.post("/projects/{project_id}/sprints/{id}/tasks")
async def add_task_to_sprint(project_id: UUID, id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = SprintService(db)
    return await svc.add_task(project_id, id)

@router.delete("/sprints/{id}/tasks/{task_id}")
async def remove_task_from_sprint(id: UUID, task_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = SprintService(db)
    return await svc.remove_task(id, task_id)
