from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
import httpx
import logging

logger = logging.getLogger(__name__)

from app.config import settings
from app.schemas.auth import TokenData

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[TokenData]:
    """Verify a JWT token and return payload"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        
        if user_id is None:
            return None
            
        token_data = TokenData(user_id=user_id, email=email)
        return token_data
    except JWTError:
        return None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


async def verify_supabase_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify Supabase JWT token by calling Supabase Auth API
    Returns user data if valid, None if invalid
    """
    try:
        # Supabase Get User endpoint using the token
        url = f"{settings.supabase_url}/auth/v1/user"
        headers = {
            "Authorization": f"Bearer {token}",
            "apikey": settings.supabase_service_role_key,
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                logger.debug(f"Supabase verification successful for user: {data.get('email')}")
                # Extract user information
                user_data = {
                    "user_id": data.get("id"),
                    "email": data.get("email"),
                    "name": data.get("user_metadata", {}).get("full_name") or data.get("user_metadata", {}).get("name"),
                    "avatar_url": data.get("user_metadata", {}).get("avatar_url"),
                }
                return user_data
            else:
                logger.error(f"Supabase verification failed: {response.status_code} - {response.text}")
                with open("ws_debug.log", "a") as f:
                    from datetime import datetime
                    f.write(f"{datetime.now()} - Supabase verification failed: {response.status_code} - {response.text}\n")
                return None
                
    except Exception as e:
        logger.exception(f"Error verifying Supabase token: {e}")
        return None


async def get_supabase_user(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Get user information from Supabase Admin API
    """
    try:
        url = f"{settings.supabase_url}/auth/v1/admin/users/{user_id}"
        headers = {
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "user_id": str(data.get("id", "")),
                    "email": str(data.get("email", "")),
                    "name": str(data.get("user_metadata", {}).get("full_name", "")),
                }
            else:
                logger.error(f"Failed to get Supabase user {user_id}: {response.status_code} - {response.text}")
                return None
                
    except Exception as e:
        logger.exception(f"Error getting Supabase user: {e}")
        return None
