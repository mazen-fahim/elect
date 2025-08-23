"""create_temp_csv_storage

Revision ID: 0697af398f47
Revises: e71e5720276c
Create Date: 2025-08-23 21:59:43.040485

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0697af398f47'
down_revision: Union[str, Sequence[str], None] = 'e71e5720276c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('temp_csv_storage',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.String(length=255), nullable=False),
        sa.Column('candidates_csv_content', sa.Text(), nullable=False),
        sa.Column('voters_csv_content', sa.Text(), nullable=False),
        sa.Column('candidates_filename', sa.String(length=255), nullable=False),
        sa.Column('voters_filename', sa.String(length=255), nullable=False),
        sa.Column('election_data', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('temp_csv_storage')
