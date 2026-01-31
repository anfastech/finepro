from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
import sys
from pathlib import Path

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

# Import our models and database configuration
from app.database import Base
from app.models import *  # Import all models
from app.config import settings

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


from urllib.parse import urlparse

def get_database_url():
    """Get database URL from environment or settings"""
    # Check if DATABASE_URL is set in environment (for migrations)
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        # Use the settings from config
        database_url = settings.DATABASE_URL
    
    # Convert asyncpg URL to sync psycopg2 URL
    if "postgresql+asyncpg://" in database_url:
        database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    
    # Parse URL to handle query parameters properly for psycopg2
    parsed = urlparse(database_url)
    
    # Build psycopg2-compatible URL (remove query params, add sslmode if needed)
    sslmode = "require"
    
    # Reconstruct URL without query params
    clean_url = f"postgresql://{parsed.username}:{parsed.password}@{parsed.hostname}:{parsed.port}{parsed.path}"
    
    return clean_url

# Add this function to filter schemas
def include_schemas():
    return True  # or specify which schemas to include

def include_name(name, type_, parent_names):
    if type_ == "schema":
        # Only include the public schema (your app's tables)
        return name in ("public",)
    return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Override the sqlalchemy.url in the alembic config
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_database_url()
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            # Include these for better autogenerate
            include_schemas=True,
            include_name=include_name,
            render_item_batch=render_item_batch,
        )

        with context.begin_transaction():
            context.run_migrations()


def render_item_batch(obj_type, obj):
    """Custom rendering for batch operations"""
    if obj_type == "type":
        # Handle custom types like UUID arrays
        if str(obj.__class__.__name__) == "_ARRAY":
            return "ARRAY(%s)" % str(obj.item_type.__visit_name__).upper()
    return False


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()