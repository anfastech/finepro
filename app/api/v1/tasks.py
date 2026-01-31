from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from ....database import get_db
from ....models.task import Task
from ....schemas.task import TaskCreate, TaskUpdate, TaskResponse
from ....services.task_service import TaskService
from ....api.deps import get_current_user
from ....models import User

router = APIRouter()


@router.get("/projects/{project_id}/tasks", response_model=List[TaskResponse])
async def list_tasks(project_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = TaskService(db)
    return await svc.get_by_project(project_id)


@router.post("/projects/{project_id}/tasks", response_model=TaskResponse, status_code=201)
async def create_task(project_id: UUID, task_in: TaskCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = TaskService(db)
    t = await svc.create(project_id, task_in, user.id)
    return t


@router.get("/tasks/{id}", response_model=TaskResponse)
async def get_task(id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = TaskService(db)
    t = await svc.get_by_id(id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return t


@router.patch("/tasks/{id}", response_model=TaskResponse)
async def update_task(id: UUID, task_in: TaskUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = TaskService(db)
    t = await svc.update(id, task_in)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return t


@router.delete("/tasks/{id}")
async def delete_task(id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = TaskService(db)
    ok = await svc.delete(id)
    if not ok:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}


@router.post("/tasks/{id}/assign")
async def assign_task(id: UUID, user_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = TaskService(db)
    result = await svc.assign(id, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    return result


@router.patch("/tasks/bulk-update")
async def bulk_update_tasks(payload: List[TaskUpdate], db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = TaskService(db)
    return await svc.bulk_update(payload)
