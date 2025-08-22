"""remove_dummy_organization_id_columns

Revision ID: b69c2d17a387
Revises: 03c240b86016
Create Date: 2025-08-21 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b69c2d17a387'
down_revision: Union[str, Sequence[str], None] = '03c240b86016'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Remove dummy_organization_id columns from both tables
    op.drop_column('dummy_candidates', 'dummy_organization_id')
    op.drop_column('dummy_voters', 'dummy_organization_id')


def downgrade() -> None:
    """Downgrade schema."""
    # Add back dummy_organization_id columns
    op.add_column('dummy_candidates', sa.Column('dummy_organization_id', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('dummy_voters', sa.Column('dummy_organization_id', sa.Integer(), nullable=False, server_default='1'))
