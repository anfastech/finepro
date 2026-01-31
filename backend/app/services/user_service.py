from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.models.user import User


class UserService:
    """Service layer for user operations"""
    
    @staticmethod
    async def get_user_by_appwrite_id(
        appwrite_id: str, 
        db: AsyncSession
    ) -> User | None:
        """Get user by Appwrite ID"""
        query = select(User).where(User.appwrite_id == appwrite_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_user_from_appwrite(
        appwrite_id: str,
        email: str,
        name: str,
        db: AsyncSession
    ) -> User:
        """Create new user from Appwrite data"""
        user = User(
            appwrite_id=appwrite_id,
            email=email,
            name=name
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user