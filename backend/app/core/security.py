from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
import httpx

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


async def verify_appwrite_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify Appwrite JWT token by calling Appwrite API GET /account
    Returns user data if valid, None if invalid
    """
    try:
        # Appwrite Get Account endpoint
        url = f"{settings.appwrite_endpoint}/account"
        headers = {
            "X-Appwrite-Project": settings.appwrite_project_id,
            "X-Appwrite-JWT": token,
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                # Extract user information
                user_data = {
                    "user_id": data.get("$id"),
                    "email": data.get("email"),
                    "name": data.get("name"),
                    "avatar_url": data.get("prefs", {}).get("avatar_url"),
                }
                return user_data
            else:
                print(f"Appwrite verification failed: {response.status_code} - {response.text}")
                return None
                
    except Exception as e:
        print(f"Error verifying Appwrite token: {e}")
        return None


async def get_appwrite_user(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Get user information from Appwrite API
    """
    try:
        url = f"{settings.appwrite_endpoint}/users/{user_id}"
        headers = {
            "X-Appwrite-Project": settings.appwrite_project_id,
            "X-Appwrite-Key": settings.appwrite_key,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "user_id": str(data.get("$id", "")),
                    "email": str(data.get("email", "")),
                    "name": str(data.get("name", "")),
                }
            else:
                return None
                
    except Exception as e:
        print(f"Error getting Appwrite user: {e}")
        return None