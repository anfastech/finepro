# Local PostgreSQL Database Configuration
from typing import Optional, Dict, Any, Union
from pydantic_settings import BaseSettings
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy import text
import os
import logging

logger = logging.getLogger(__name__)

# Create async engine
_connect_args: Dict[str, Any] = {}
_poolclass: Optional[str] = None

# Handle database URL
database_url: Union[str, URL] = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/finepro")
if isinstance(database_url, str):
    try:
        # Try to parse as URL for proper validation
        database_url = URL(database_url)
    except Exception:
        logger.warning(f"Could not parse database URL as URL: {database_url}")
        # Assume string format
        pass

# Create async engine
engine = create_async_engine(
    database_url,
    echo=os.getenv("DEBUG", "False").lower() in ("true", "1", "yes"),
    poolclass=NullPool,
)