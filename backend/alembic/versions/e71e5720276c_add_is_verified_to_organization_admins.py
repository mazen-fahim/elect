"""add_is_verified_to_organization_admins

Revision ID: e71e5720276c
Revises: f5658790b95e
Create Date: 2025-08-23 01:44:21.216232

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e71e5720276c'
down_revision: Union[str, Sequence[str], None] = 'f5658790b95e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
