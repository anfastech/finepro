from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ....database import get_db
from ....models.project import Project
from ....schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectWithEpics
from ....services.project_service import ProjectService
from ....api.deps import get_current_user
from ....models import User

router = APIRouter()


@router.get("/workspaces/{workspace_id}/projects", response_model=list[ProjectResponse])
async def list_projects(workspace_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = ProjectService(db)
    return await svc.get_by_workspace(workspace_id)


@router.post("/workspaces/{workspace_id}/projects", response_model=ProjectResponse, status_code=201)
async def create_project(workspace_id: str, proj_in: ProjectCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = ProjectService(db)
    proj = await svc.create(workspace_id, proj_in, user.id)
    return proj


@router.get("/projects/{id}", response_model=ProjectResponse)
async def get_project(id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = ProjectService(db)
    proj = await svc.get_by_id(id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj


@router.patch("/projects/{id}", response_model=ProjectResponse)
async def update_project(id: str, proj_in: ProjectUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = ProjectService(db)
    proj = await svc.update(id, proj_in)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj


@router.delete("/projects/{id}")
async def delete_project(id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = ProjectService(db)
    ok = await svc.delete(id)
    if not ok:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"success": True}
