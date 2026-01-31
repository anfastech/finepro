# Local PostgreSQL Database Configuration
from typing import Optional, Dict, Any, Union
from pydantic_settings import BaseSettings
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy import text, URL
import os

# Use the same settings as main config
import app.config_local as settings

logger = logging.getLogger(__name__)

# Create async engine
_connect_args: Dict[str, Any] = {}
_poolclass: Optional[str] = None

# Handle database URL
database_url: settings.database_url  # Use local settings

# Create async engine
engine = create_async_engine(
    database_url,
    echo=os.getenv("DEBUG", "False").lower() in ("true", "1", "yes"),
    poolclass=NullPool,
)