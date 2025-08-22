"""merge remaining heads

Revision ID: b5f93267a969
Revises: 4add_transactions_and_wallet, b69c2d17a387
Create Date: 2025-08-23 00:11:17.484009

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b5f93267a969'
down_revision: Union[str, Sequence[str], None] = ('4add_transactions_and_wallet', 'b69c2d17a387')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
