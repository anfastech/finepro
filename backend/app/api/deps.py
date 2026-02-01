from fastapi import Depends, HTTPException, status, WebSocket
import logging
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.core.security import verify_token, verify_supabase_token
from app.models.user import User
from app.schemas.auth import TokenData

# HTTP Bearer scheme for token authentication
security = HTTPBearer()
logger = logging.getLogger(__name__)


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
        logger.info(f"get_current_user: Received token starting with {token[:10]}...")
        
        # 1. Try to verify as our own token
        token_data: Optional[TokenData] = verify_token(token)
        
        if token_data:
            logger.info(f"get_current_user: Verified as internal token for user_id: {token_data.user_id}")
             # Get user from database using our internal auth_id (which matches supabase_id)
            from sqlalchemy import select
            result = await db.execute(select(User).where(User.supabase_id == token_data.user_id))
            user = result.scalar_one_or_none()
            
            if user:
                logger.info(f"get_current_user: Found user {user.email} in DB via internal token")
                return user
            else:
                logger.warning(f"get_current_user: Internal token valid but user {token_data.user_id} not found in DB")

        # 2. If not our token, try to verify as Supabase token
        # This supports calls from frontend using Supabase session token directly
        logger.info("get_current_user: Internal token verification failed or user not found, trying Supabase token...")
        user_data = await verify_supabase_token(token)
        
        if user_data:
            logger.info(f"get_current_user: Verified as Supabase token for user_id: {user_data.get('user_id')}")
             # Get user from database
            from sqlalchemy import select
            result = await db.execute(select(User).where(User.supabase_id == user_data["user_id"]))
            user = result.scalar_one_or_none()
            
            if user:
                logger.info(f"get_current_user: Found user {user.email} in DB via Supabase token")
                return user
            else:
                 logger.warning(f"get_current_user: Supabase token valid but user {user_data.get('user_id')} not found in DB")
            
            # Optional: Auto-create user if valid Supabase token but no user in DB?
            # For now, let's strictly require /auth/exchange to have run first to create the user.
        else:
            logger.warning("get_current_user: Supabase token verification failed")
            
    except Exception as e:
        logger.error(f"Error in get_current_user: {e}")
        # Don't raise here, let the final check raise
        
    logger.warning("Token verification failed in get_current_user")
    raise credentials_exception


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get the current active user (can add additional checks here)
    """
    # For now, all authenticated users are considered active
    return current_user


async def verify_supabase_auth(
    supabase_token: str,
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Verify Supabase JWT token and return user (creates user if not exists)
    """
    # Verify Supabase token
    user_data = await verify_supabase_token(supabase_token)
    if user_data is None:
        logger.warning("Supabase token verification failed in verify_supabase_auth")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Supabase token"
        )
    
    # Check if user exists in our database
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.supabase_id == user_data["user_id"]))
    user = result.scalar_one_or_none()
    
    # Create user if doesn't exist
    if user is None:
        user = User(
            supabase_id=user_data["user_id"],
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
    Supports both internal and Supabase tokens.
    """
    try:
        logger.info(f"get_current_user_ws: Authenticating with token starting with {token[:15]}...")
        
        # 1. Try to verify as our own token
        token_data: Optional[TokenData] = verify_token(token)
        user_id = token_data.user_id if token_data else None
        
        # 2. If not our token, try verify as Supabase token
        if not user_id:
            logger.info("get_current_user_ws: Internal token verification failed, trying Supabase...")
            user_data = await verify_supabase_token(token)
            user_id = user_data.get("user_id") if user_data else None
            
        if not user_id:
            logger.warning("get_current_user_ws: Token verification failed (both internal and Supabase)")
            return None

        logger.info(f"get_current_user_ws: Token verified. Looking up user_id: {user_id}")

        # Get user from database
        from app.database import AsyncSessionLocal
        from sqlalchemy import select
        
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.supabase_id == user_id))
            user = result.scalar_one_or_none()
            
            if user:
                logger.info(f"get_current_user_ws: Auth successful for user {user.email}")
                return user
            else:
                logger.warning(f"get_current_user_ws: User {user_id} not found in DB")
                return None
                
    except Exception as e:
        logger.error(f"Error in get_current_user_ws: {e}", exc_info=True)
        return None
