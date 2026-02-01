import secrets
import logging
from typing import Optional
from jose import jwt, JWTError
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User

security = HTTPBearer()
logger = logging.getLogger(__name__)

# Supabase Configuration
from app.config import settings
SUPABASE_JWT_SECRET = settings.SUPABASE_JWT_SECRET
SUPABASE_ISSUER = settings.SUPABASE_ISSUER

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Validate Supabase JWT token and return current user
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Remove "Bearer " prefix
        token = credentials.credentials
        
        if not SUPABASE_JWT_SECRET:
            logger.error("SUPABASE_JWT_SECRET is not configured")
            raise credentials_exception
            
        # Decode JWT token
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            issuer=SUPABASE_ISSUER
        )
        
        # Extract user ID from token
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
        # Extract email from token
        email = payload.get("email")
        if email is None:
            raise credentials_exception
            
    except JWTError as e:
        logger.warning(f"JWT validation failed: {str(e)}")
        raise credentials_exception
    
    # Get user from database or create if doesn't exist
    user = db.query(User).filter(User.auth_id == user_id).first()
    
    if user:
        logger.debug(f"User {user.email} found in database (Supabase flow)")
    
    if not user:
        # Create user if doesn't exist (first login)
        user = User(
            email=email,
            auth_id=user_id,
            name=payload.get("user_metadata", {}).get("full_name", email.split("@")[0]),
            avatar_url=payload.get("user_metadata", {}).get("avatar_url"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user
    """
    return current_user

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Optional authentication - returns user if token is valid, None otherwise
    """
    if not credentials:
        return None
        
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None