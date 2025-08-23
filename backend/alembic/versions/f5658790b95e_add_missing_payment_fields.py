"""add_missing_payment_fields

Revision ID: f5658790b95e
Revises: 81afe266b822
Create Date: 2025-08-23 00:45:45.582365

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f5658790b95e'
down_revision: Union[str, Sequence[str], None] = '81afe266b822'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add missing payment fields to organizations table
    op.add_column('organizations', sa.Column('is_paid', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove payment fields from organizations table
    op.drop_column('organizations', 'is_paid')
