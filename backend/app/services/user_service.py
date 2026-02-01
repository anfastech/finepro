from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.models.user import User


class UserService:
    """Service layer for user operations"""
    
    @staticmethod
    async def get_user_by_auth_id(
        auth_id: str, 
        db: AsyncSession
    ) -> User | None:
        """Get user by Auth ID (Supabase)"""
        query = select(User).where(User.auth_id == auth_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_user_from_supabase(
        auth_id: str,
        email: str,
        name: str,
        db: AsyncSession,
        avatar_url: str = None,
    ) -> User:
        """Create new user from Supabase data"""
        user = User(
            auth_id=auth_id,
            email=email,
            name=name,
            avatar_url=avatar_url
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
    
    @staticmethod
    async def get_user_by_email(
        email: str,
        db: AsyncSession
    ) -> User | None:
        """Get user by email"""
        query = select(User).where(User.email == email)
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_id(
        user_id: UUID,
        db: AsyncSession
    ) -> User | None:
        """Get user by UUID"""
        query = select(User).where(User.id == user_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()
