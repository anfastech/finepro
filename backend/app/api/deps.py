from fastapi import Depends, HTTPException, status, WebSocket
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.core.security import verify_token, verify_appwrite_token
from app.models.user import User
from app.schemas.auth import TokenData

# HTTP Bearer scheme for token authentication
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Get the current authenticated user from FastAPI JWT token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        token_data: Optional[TokenData] = verify_token(token)
        if token_data is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    
    # Get user from database
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.appwrite_id == token_data.user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get the current active user (can add additional checks here)
    """
    # For now, all authenticated users are considered active
    return current_user


async def verify_appwrite_auth(
    appwrite_token: str,
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Verify Appwrite JWT token and return user (creates user if not exists)
    """
    # Verify Appwrite token
    user_data = await verify_appwrite_token(appwrite_token)
    if user_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Appwrite token"
        )
    
    # Check if user exists in our database
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.appwrite_id == user_data["user_id"]))
    user = result.scalar_one_or_none()
    
    # Create user if doesn't exist
    if user is None:
        user = User(
            appwrite_id=user_data["user_id"],
            email=user_data["email"],
            name=user_data["name"],
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    return user


# Optional dependency - doesn't raise exception if not authenticated
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Get current user if authenticated, otherwise return None
    """
    if credentials is None:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


async def get_current_user_ws(
    token: str,
    websocket: WebSocket
) -> Optional[User]:
    """
    Get the current authenticated user from WebSocket token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token_data: Optional[TokenData] = verify_token(token)
        if token_data is None:
            return None
    except Exception:
        return None
    
    # Get user from database - we need to use the database from websocket state
    # For WebSocket, we'll use the dependency injection pattern
    try:
        from app.database import get_db
        db = next(get_db())
        
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.appwrite_id == token_data.user_id))
        user = result.scalar_one_or_none()
        
        await db.close()
        
        if user is None:
            return None
        
        return user
    except Exception:
        return None