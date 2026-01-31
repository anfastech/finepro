# Local PostgreSQL Database Configuration
from typing import Optional, Dict, Any, Union
from pydantic_settings import BaseSettings
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy import text, URL
import os
import logging

logger = logging.getLogger(__name__)

# Use relative imports to avoid SQLAlchemy import issues
try:
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy.pool import NullPool
    from sqlalchemy import text, URL
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
except ImportError as e:
    logger.warning(f"Could not import some SQLAlchemy modules: {e}")

# Create async engine
_connect_args: Dict[str, Any] = {}
_poolclass: Optional[str] = None

# Handle database URL
database_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/finepro")