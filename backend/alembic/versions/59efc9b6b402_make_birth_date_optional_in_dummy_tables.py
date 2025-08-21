"""make_birth_date_optional_in_dummy_tables

Revision ID: 59efc9b6b402
Revises: 03fb93df8836
Create Date: 2025-08-21 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '59efc9b6b402'
down_revision: Union[str, Sequence[str], None] = '03fb93df8836'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Make birth_date nullable in dummy_candidates table
    op.alter_column('dummy_candidates', 'birth_date',
                    existing_type=sa.DateTime(timezone=True),
                    nullable=True)
    
    # Make birth_date nullable in candidates table (if it's not already)
    op.alter_column('candidates', 'birth_date',
                    existing_type=sa.DateTime(timezone=True),
                    nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    # Make birth_date not nullable in dummy_candidates table
    op.alter_column('dummy_candidates', 'birth_date',
                    existing_type=sa.DateTime(timezone=True),
                    nullable=False)
    
    # Make birth_date not nullable in candidates table
    op.alter_column('candidates', 'birth_date',
                    existing_type=sa.DateTime(timezone=True),
                    nullable=False)
