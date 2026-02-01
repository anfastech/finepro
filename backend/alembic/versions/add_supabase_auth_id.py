"""Add Supabase auth_id as foreign key to auth.users

Revision ID: add_supabase_auth_id
Revises: 3d6e688386ba
Create Date: 2026-01-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_supabase_auth_id'
down_revision: Union[str, Sequence[str], None] = '3d6e688386ba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add auth_id column referencing Supabase auth.users"""
    # Add auth_id column as UUID
    op.add_column('users', sa.Column('auth_id', sa.UUID(), nullable=True))
    
    # Create unique index on auth_id
    op.create_index('ix_users_auth_id', 'users', ['auth_id'], unique=True)
    
    # Drop old supabase_id column and index
    op.drop_index('ix_users_supabase_id', table_name='users')
    op.drop_column('users', 'supabase_id')
    
    # Add foreign key constraint to Supabase auth.users (optional - requires postgres_fdw)
    # op.execute('ALTER TABLE users ADD CONSTRAINT fk_auth_id FOREIGN KEY (auth_id) REFERENCES auth.users(id)')
    # For now, just documented that auth_id should match auth.users.id


def downgrade() -> None:
    """Remove auth_id column and restore supabase_id"""
    # Add supabase_id column back
    op.add_column('users', sa.Column('supabase_id', sa.String(255), nullable=False))
    
    # Create index on supabase_id
    op.create_index('ix_users_supabase_id', 'users', ['supabase_id'], unique=True)
    
    # Drop auth_id index and column
    op.drop_index('ix_users_auth_id', table_name='users')
    op.drop_column('users', 'auth_id')
