"""Fix notification datetime columns

Revision ID: 3fix_notification_datetime
Revises: 2add_notifications_table
Create Date: 2025-08-16 15:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3fix_notification_datetime'
down_revision: Union[str, Sequence[str], None] = '2add_notifications_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop the existing created_at and read_at columns
    op.drop_column('notifications', 'created_at')
    op.drop_column('notifications', 'read_at')
    
    # Recreate them with proper datetime type (TIMESTAMP WITHOUT TIME ZONE)
    op.add_column('notifications', sa.Column('created_at', sa.DateTime(), nullable=True))
    op.add_column('notifications', sa.Column('read_at', sa.DateTime(), nullable=True))
    
    # Recreate the index for created_at
    op.create_index(op.f('ix_notifications_created_at'), 'notifications', ['created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop the recreated columns
    op.drop_index(op.f('ix_notifications_created_at'), table_name='notifications')
    op.drop_column('notifications', 'read_at')
    op.drop_column('notifications', 'created_at')
    
    # Recreate them with the original type
    op.add_column('notifications', sa.Column('created_at', sa.DateTime(), nullable=True))
    op.add_column('notifications', sa.Column('read_at', sa.DateTime(), nullable=True))
    
    # Recreate the index
    op.create_index(op.f('ix_notifications_created_at'), 'notifications', ['created_at'], unique=False)
