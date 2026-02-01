from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
import httpx
import logging

logger = logging.getLogger(__name__)
from app.schemas.auth import (
    Token, 
    SupabaseTokenRequest, 
    SupabaseTokenResponse, 
    RefreshTokenRequest, 
    CommonResponse,
)
from app.schemas.common import AuthExchangeResponse
from app.config import settings
from app.schemas.user import UserResponse, UserUpdate
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.api.deps import get_current_user
from app.database import get_db


router = APIRouter()


async def verify_supabase_jwt(token: str) -> dict:
    """Verify Supabase JWT and return user data"""
    url = f"{settings.supabase_url}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": settings.supabase_anon_key,
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        
        if response.status_code != 200:
            return None
        
        data = response.json()
        return {
            "user_id": data.get("id"),
            "email": data.get("email"),
            "name": data.get("user_metadata", {}).get("full_name") or data.get("user_metadata", {}).get("name", ""),
            "avatar_url": data.get("user_metadata", {}).get("avatar_url")
        }


@router.post("/exchange", response_model=AuthExchangeResponse, status_code=200)
async def exchange_supabase_token(
    request: SupabaseTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """Exchange Supabase JWT for FastAPI tokens"""
    logger.info(f"Exchanging Supabase token for user data")
    user_data = await verify_supabase_jwt(request.supabase_token)
    
    if user_data is None:
        logger.warning("Supabase token exchange failed: Invalid token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Supabase token"
        )
    
    # Check if user exists in our database
    result = await db.execute(select(User).where(User.supabase_id == user_data["user_id"]))
    user = result.scalar_one_or_none()
    
    if user:
        logger.debug(f"User {user.email} found in database")
    
    # Create user if doesn't exist
    if user is None:
        result = await db.execute(select(User).where(User.email == user_data["email"]))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            existing_user.supabase_id = user_data["user_id"]
            existing_user.name = user_data["name"]
            existing_user.avatar_url = user_data.get("avatar_url")
            user = existing_user
            await db.commit()
            await db.refresh(user)
        else:
            user = User(
                supabase_id=user_data["user_id"],
                email=user_data["email"],
                name=user_data["name"],
                avatar_url=user_data.get("avatar_url"),
            )
            logger.info(f"Creating new user in database: {user.email}")
            db.add(user)
            await db.commit()
            await db.refresh(user)
    
    logger.info(f"User {user.email} authenticated successfully")
    
    # Create tokens
    from app.core.security import create_access_token, create_refresh_token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data["user_id"], "email": user.email},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": user_data["user_id"], "email": user.email}
    )

    # Check if onboarding is required
    # 1. Check for password (from new column)
    has_password = user.has_password
    
    # 2. Check for name
    # OAuth users have name, but we might want them to confirm it.
    # Logic: if name implies incomplete profile or user explicitly needs to set it?
    # For now, just check if it's not empty.
    has_name = bool(user.name and user.name.strip())
    
    # 3. Check for workspace (fetch latest one)
    # We need to query Member table to see if user is part of any workspace
    from app.models.member import Member
    from app.models.workspace import Workspace
    
    latest_workspace_query = (
        select(Workspace)
        .join(Member, Member.workspace_id == Workspace.id)
        .where(Member.user_id == user.id)
        .order_by(Workspace.created_at.desc())
        .limit(1)
    )
    result = await db.execute(latest_workspace_query)
    latest_workspace = result.scalar_one_or_none()
    
    onboarding_required = False
    redirect_url = f"/workspaces/{latest_workspace.id}" if latest_workspace else "/onboarding"
    
    logger.info(f"Auth Exchange: has_password={has_password}, has_name={has_name}, workspace={latest_workspace.id if latest_workspace else 'None'}")
    
    if not has_password or not has_name or not latest_workspace:
        if not has_password:
            logger.info("Auth Exchange: Redirecting to onboarding (Missing Password)")
        elif not has_name:
            logger.info("Auth Exchange: Redirecting to onboarding (Missing Name)")
        elif not latest_workspace:
            logger.info("Auth Exchange: Redirecting to onboarding (No Workspace)")
            
        onboarding_required = True
        redirect_url = "/onboarding"
    else:
        logger.info(f"Auth Exchange: Redirecting to workspace {latest_workspace.id}")
    
    return AuthExchangeResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        onboarding_required=onboarding_required,
        redirect_url=redirect_url
    )


@router.post("/verify", response_model=SupabaseTokenResponse, status_code=200)
async def verify_supabase_token(
    request: SupabaseTokenRequest
):
    """Verify Supabase JWT token"""
    logger.info("Verifying Supabase token")
    user_data = await verify_supabase_jwt(request.supabase_token)
    
    if user_data is None:
        logger.warning("Supabase token verification failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Supabase token"
        )
    
    return SupabaseTokenResponse(
        user_id=user_data["user_id"],
        email=user_data["email"],
        name=user_data["name"],
        message="Supabase token verified successfully"
    )


@router.post("/refresh", response_model=Token, status_code=200)
async def refresh_access_token(
    request: RefreshTokenRequest
):
    """Refresh access token"""
    logger.info("Refreshing access token")
    from app.core.security import verify_token, create_access_token, create_refresh_token
    
    token_data = verify_token(request.refresh_token)
    if token_data is None:
        logger.warning("Token refresh failed: Invalid refresh token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": token_data.user_id, "email": token_data.email},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": token_data.user_id, "email": token_data.email}
    )
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current authenticated user"""
    return {
        "id": current_user.supabase_id,
        "uuid": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "avatar_url": current_user.avatar_url,
    }


@router.patch("/me", response_model=UserResponse)
async def update_current_user_info(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile"""
    update_data = user_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    current_user.updated_at = datetime.now()
    
    await db.commit()
    await db.refresh(current_user)
    
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_current_user_info(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile"""
    update_data = user_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    current_user.updated_at = datetime.now()
    
    await db.commit()
    await db.refresh(current_user)
    
    return current_user


@router.post("/logout", response_model=CommonResponse)
async def logout_user():
    """Logout user"""
    return CommonResponse(
        success=True,
        message="User logged out successfully"
    )
