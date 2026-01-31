from fastapi import APIRouter

from .epics import router as epics_router
from .sprints import router as sprints_router
from .members import router as members_router
from .projects import router as projects_router
from .tasks import router as tasks_router

api_router = APIRouter()
api_router.include_router(epics_router, prefix="/epics", tags=["Epics"])
api_router.include_router(sprints_router, prefix="/sprints", tags=["Sprints"])
api_router.include_router(members_router, prefix="/workspaces", tags=["Members"])
api_router.include_router(projects_router, prefix="/workspaces", tags=["Projects"])
api_router.include_router(tasks_router, prefix="/projects", tags=["Tasks"])
