from fastapi import APIRouter

# Import all route modules
from . import auth
from . import workspaces
from . import tasks
from . import projects
from . import epics
from . import sprints
from . import websocket
from . import members
from . import notifications
from . import integration

auth_router = auth.router
workspaces_router = workspaces.router
tasks_router = tasks.router
projects_router = projects.router
epics_router = epics.router
sprints_router = sprints.router
websocket_router = websocket.router
members_router = members.router
notifications_router = notifications.router
integration_router = integration.router

# Create main API router
api_router = APIRouter()

# Include all routers
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(workspaces_router, prefix="/workspaces", tags=["Workspaces"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(projects_router, prefix="/projects", tags=["Projects"])
api_router.include_router(epics_router, prefix="/epics", tags=["Epics"])
api_router.include_router(sprints_router, prefix="/sprints", tags=["Sprints"])
api_router.include_router(websocket_router, prefix="/ws", tags=["WebSocket"])
api_router.include_router(members_router, prefix="/members", tags=["Members"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(integration_router, prefix="/integration", tags=["Real-time Integration"])