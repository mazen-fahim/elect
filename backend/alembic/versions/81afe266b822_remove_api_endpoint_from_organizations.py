"""remove_api_endpoint_from_organizations

Revision ID: 81afe266b822
Revises: b5f93267a969
Create Date: 2025-08-23 00:34:56.631039

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '81afe266b822'
down_revision: Union[str, Sequence[str], None] = 'b5f93267a969'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Remove the api_endpoint column from organizations table
    op.drop_column('organizations', 'api_endpoint')


def downgrade() -> None:
    """Downgrade schema."""
    # Add back the api_endpoint column to organizations table
    op.add_column('organizations', sa.Column('api_endpoint', sa.String(200), nullable=True, unique=True))
