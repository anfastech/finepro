from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
from .config import settings

# Create async engine with asyncpg (proper async driver)
# For Supabase PgBouncer compatibility, we need to disable prepared statement caching
engine = create_async_engine(
    settings.database_url,
    echo=settings.DEBUG,  # Log SQL queries in debug mode
    poolclass=NullPool,
    # Disable prepared statement cache for PgBouncer compatibility
    connect_args={"statement_cache_size": 0},
    # Also disable the SQL compilation cache to avoid issues
    execution_options={"compiled_cache": None},
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Create base class for models
Base = declarative_base()


# Dependency to get DB session
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# Initialize database (create all tables)
async def init_db():
    async with engine.begin() as conn:
        # Import all models here to ensure they are registered
        from . import models
        
        # Create all tables only if they don't exist (checkfirst=True)
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)