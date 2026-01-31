from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta

from app.database import get_db
from app.core.security import create_access_token, create_refresh_token, verify_appwrite_token
from app.models.user import User
from app.schemas.auth import (
    Token, AppwriteTokenRequest, AppwriteTokenResponse, 
    RefreshTokenRequest, CommonResponse
)
from app.config import settings

from app.api.deps import get_current_user

router = APIRouter()


@router.post("/verify", response_model=AppwriteTokenResponse, status_code=200)
async def verify_appwrite_jwt(
    request: AppwriteTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify Appwrite JWT token and get user information
    """
    user_data = await verify_appwrite_token(request.appwrite_token)
    if user_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Appwrite token"
        )
    
    return AppwriteTokenResponse(
        user_id=user_data["user_id"],
        email=user_data["email"],
        name=user_data["name"],
        message="Appwrite token verified successfully"
    )


@router.post("/exchange", response_model=Token, status_code=200)
async def exchange_appwrite_token(
    request: AppwriteTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Exchange Appwrite JWT for FastAPI access/refresh tokens
    """
    # Verify Appwrite token
    user_data = await verify_appwrite_token(request.appwrite_token)
    if user_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Appwrite token"
        )
    
    # Check if user exists in our database
    from sqlalchemy import select
    
    # Check if user exists by appwrite_id first
    result = await db.execute(select(User).where(User.appwrite_id == user_data["user_id"]))
    user = result.scalar_one_or_none()
    
    # If user doesn't exist by appwrite_id, check by email (in case of account switch)
    if user is None:
        result = await db.execute(select(User).where(User.email == user_data["email"]))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            # Update the existing user's appwrite_id
            existing_user.appwrite_id = user_data["user_id"]
            existing_user.name = user_data["name"]  # Update name in case it changed
            existing_user.avatar_url = user_data.get("avatar_url")
            user = existing_user
            await db.commit()
            await db.refresh(user)
        else:
            # Create new user
            user = User(
                appwrite_id=user_data["user_id"],
                email=user_data["email"],
                name=user_data["name"],
                avatar_url=user_data.get("avatar_url"),
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
    
    # Create FastAPI tokens
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


@router.post("/refresh", response_model=Token, status_code=200)
async def refresh_access_token(
    request: RefreshTokenRequest
):
    """
    Refresh access token using refresh token
    """
    from app.core.security import verify_token
    from fastapi import HTTPException, status
    
    # Verify refresh token
    token_data = verify_token(request.refresh_token)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Create new access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": token_data.user_id, "email": token_data.email},
        expires_delta=access_token_expires
    )
    
    # Create new refresh token (token rotation)
    new_refresh_token = create_refresh_token(
        data={"sub": token_data.user_id, "email": token_data.email}
    )
    
    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information
    """
    return {
        "status": "success",
        "data": {
            "$id": current_user.appwrite_id,
            "id": str(current_user.id),
            "email": current_user.email,
            "name": current_user.name,
            "avatar_url": current_user.avatar_url
        }
    }


@router.post("/logout", response_model=CommonResponse)
async def logout_user():
    """
    Logout user (token invalidation would need Redis/blacklist implementation)
    For now, this is just a placeholder that clients can call
    """
    return CommonResponse(
        success=True,
        message="User logged out successfully"
    )