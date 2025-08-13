"""add_first_name_last_name_to_users

Revision ID: 94ec7697a5c0
Revises: a9f7c044f428
Create Date: 2025-08-13 21:52:12.472396

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '94ec7697a5c0'
down_revision: Union[str, Sequence[str], None] = 'a9f7c044f428'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add first_name and last_name columns to users table
    op.add_column('users', sa.Column('first_name', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(length=100), nullable=True))
    
    # Set default values for existing users (you can customize these)
    op.execute("UPDATE users SET first_name = 'User', last_name = 'User' WHERE first_name IS NULL")
    op.execute("UPDATE users SET last_name = 'User' WHERE last_name IS NULL")
    
    # Make columns non-nullable after setting default values
    op.alter_column('users', 'first_name', nullable=False)
    op.alter_column('users', 'last_name', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Remove first_name and last_name columns from users table
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
