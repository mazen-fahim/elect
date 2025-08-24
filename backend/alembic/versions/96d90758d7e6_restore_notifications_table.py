"""restore_notifications_table

Revision ID: 96d90758d7e6
Revises: 856956b241b7
Create Date: 2025-08-24 02:10:46.221593

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '96d90758d7e6'
down_revision: Union[str, Sequence[str], None] = '856956b241b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
