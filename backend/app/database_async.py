# Async Database Configuration
from typing import Optional, Dict, Any, Union
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy import text
from .config_local import settings  # Use local config
import logging

logger = logging.getLogger(__name__)

# Create async session factory
_connect_args: Dict[str, Any] = {}
_poolclass: Optional[str] = None

# Handle database URL
database_url = settings.database_url  # Use local settings  # Use local settings
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
    echo=settings.DEBUG,  # Log SQL queries in debug mode
    poolclass=NullPool,  # Use null pool for asyncpg with proper async execution
)
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy import text, URL
from .config import settings
import logging

logger = logging.getLogger(__name__)

# Create async engine with proper URL type handling
_connect_args: Dict[str, Any] = {}
_poolclass: Optional[str] = None

# Handle different URL types
database_url: Union[str, URL] = settings.database_url
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
    echo=settings.DEBUG,  # Log SQL queries in debug mode
    poolclass=NullPool,  # Use null pool for asyncpg
    connect_args={"statement_cache_size": 0},  # Disable prepared statements for PgBouncer
)