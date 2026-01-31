from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.enums import ActionType, EntityType
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse, WorkspaceCreateRequest
from app.services.workspace_service import WorkspaceService
from app.services.activity_service import ActivityService
from app.services.member_service import MemberService

router = APIRouter()


@router.get("/", response_model=List[WorkspaceResponse])
async def list_workspaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all workspaces the user is a member of"""
    service = WorkspaceService(db)
    workspaces = await service.list_user_workspaces(current_user.id)
    return workspaces


@router.post("/", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    workspace_data: WorkspaceCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new workspace"""
    service = WorkspaceService(db)
    activity_service = ActivityService(db)
    
    # Map request data to internal create model
    internal_data = WorkspaceCreate(
        **workspace_data.model_dump(),
        owner_id=current_user.id
    )
    
    workspace = await service.create(internal_data, current_user.id)
    
    # Log activity
    await activity_service.log(
        user_id=current_user.id,
        action=ActionType.CREATED,
        entity_type=EntityType.WORKSPACE,
        entity_id=workspace.id,
        changes={"name": workspace.name}
    )
    
    return workspace


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get workspace details"""
    service = WorkspaceService(db)
    member_service = MemberService(db)
    
    # Verify membership
    membership = await member_service.get_membership(current_user.id, workspace_id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
        
    workspace = await service.get_by_id(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    return workspace


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: UUID,
    workspace_data: WorkspaceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update workspace details (Admin only)"""
    service = WorkspaceService(db)
    member_service = MemberService(db)
    activity_service = ActivityService(db)
    
    # Verify admin status
    if not await member_service.is_admin(current_user.id, workspace_id):
        raise HTTPException(status_code=403, detail="Admin permissions required")
        
    old_workspace = await service.get_by_id(workspace_id)
    workspace = await service.update(workspace_id, workspace_data)
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    # Log activity
    await activity_service.log(
        user_id=current_user.id,
        action=ActionType.UPDATED,
        entity_type=EntityType.WORKSPACE,
        entity_id=workspace.id,
        changes=workspace_data.model_dump(exclude_unset=True)
    )
    
    return workspace


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete workspace (Owner/Admin only)"""
    service = WorkspaceService(db)
    member_service = MemberService(db)
    activity_service = ActivityService(db)
    
    # Verify admin status
    if not await member_service.is_admin(current_user.id, workspace_id):
        raise HTTPException(status_code=403, detail="Admin permissions required")
        
    success = await service.delete(workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    # Log activity
    await activity_service.log(
        user_id=current_user.id,
        action=ActionType.DELETED,
        entity_type=EntityType.WORKSPACE,
        entity_id=workspace_id
    )
    
    return None


@router.get("/{workspace_id}/analytics")
async def get_workspace_analytics(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get workspace analytics and summary"""
    service = WorkspaceService(db)
    member_service = MemberService(db)
    
    # Verify membership
    membership = await member_service.get_membership(current_user.id, workspace_id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
        
    analytics = await service.get_analytics(workspace_id, current_user.id)
    return {"data": analytics}


@router.get("/{workspace_id}/info", response_model=WorkspaceResponse)
async def get_workspace_info(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get basic workspace info (for join flow)"""
    service = WorkspaceService(db)
    workspace = await service.get_by_id(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    return workspace


@router.post("/{workspace_id}/join", response_model=WorkspaceResponse)
async def join_workspace(
    workspace_id: UUID,
    invite_code: str = Query(..., alias="inviteCode"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Join a workspace using an invite code"""
    service = WorkspaceService(db)
    workspace = await service.join_by_invite_code(workspace_id, invite_code, current_user.id)
    if not workspace:
        raise HTTPException(status_code=400, detail="Invalid invite code or workspace not found")
        
    return workspace


@router.post("/{workspace_id}/reset-invite-code", response_model=WorkspaceResponse)
async def reset_invite_code(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reset workspace invite code (Admin only)"""
    service = WorkspaceService(db)
    member_service = MemberService(db)
    
    # Verify admin status
    if not await member_service.is_admin(current_user.id, workspace_id):
        raise HTTPException(status_code=403, detail="Admin permissions required")
        
    workspace = await service.reset_invite_code(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    return workspace