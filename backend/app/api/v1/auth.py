from fastapi import APIRouter, Depends, HTTPException, status
from datetime import timedelta
import httpx
import logging

logger = logging.getLogger(__name__)
from app.schemas.auth import (
    Token, 
    SupabaseTokenRequest, 
    SupabaseTokenResponse, 
    RefreshTokenRequest, 
    CommonResponse
)
from app.config import settings
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


@router.post("/exchange", response_model=Token, status_code=200)
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
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
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
        "uuid": str(current_user.id),
        "email": current_user.email,
        "name": current_user.name,
        "avatar_url": current_user.avatar_url,
    }


@router.post("/logout", response_model=CommonResponse)
async def logout_user():
    """Logout user"""
    return CommonResponse(
        success=True,
        message="User logged out successfully"
    )
