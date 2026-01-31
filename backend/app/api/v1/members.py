"""
Member API Endpoints - Management for workspace members and roles
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.enums import MemberRole, ActionType, EntityType
from app.schemas.workspace import MemberResponse, MemberUpdate
from app.services.member_service import MemberService
from app.services.activity_service import ActivityService

router = APIRouter()


@router.get("/workspaces/{workspace_id}/members", response_model=List[MemberResponse])
async def list_workspace_members(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all members of a workspace"""
    member_service = MemberService(db)
    
    # Verify user is a member of the workspace
    membership = await member_service.get_membership(current_user.id, workspace_id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this workspace"
        )
        
    members = await member_service.list_workspace_members(workspace_id)
    return members


@router.post("/workspaces/{workspace_id}/members/invite", response_model=MemberResponse)
async def invite_member(
    workspace_id: UUID,
    user_id: UUID = Query(..., description="User ID to invite"),
    role: MemberRole = Query(MemberRole.MEMBER),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Invite a user to a workspace.
    Only admins can invite new members.
    """
    member_service = MemberService(db)
    
    # Verify current user is admin
    if not await member_service.is_admin(current_user.id, workspace_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace admins can invite members"
        )
        
    member = await member_service.add_member(workspace_id, user_id, current_user.id, role)
    return member


@router.patch("/{member_id}", response_model=MemberResponse)
async def update_member_role(
    member_id: UUID,
    member_data: MemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a member's role in a workspace.
    Only admins can update roles.
    """
    member_service = MemberService(db)
    
    member = await member_service.get_by_id(member_id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
        
    # Verify current user is admin of the workspace
    if not await member_service.is_admin(current_user.id, member.workspace_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace admins can update member roles"
        )
        
    updated_member = await member_service.update_role(member_id, member_data.role, current_user.id)
    return updated_member


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove a member from a workspace.
    User can remove themselves, or an admin can remove others.
    """
    member_service = MemberService(db)
    
    member = await member_service.get_by_id(member_id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
        
    # Permission check: self-removal OR admin removal
    is_self = member.user_id == current_user.id
    is_admin = await member_service.is_admin(current_user.id, member.workspace_id)
    
    if not (is_self or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to remove this member"
        )
        
    success = await member_service.remove_member(member_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    return None

