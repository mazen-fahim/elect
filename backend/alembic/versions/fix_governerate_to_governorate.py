"""fix governerate to governorate

Revision ID: fix_governerate_to_governorate
Revises: c013779d83ea
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fix_governerate_to_governorate'
down_revision = 'c013779d83ea'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Rename the column from 'governerate' to 'governorate'
    op.alter_column('candidates', 'governerate', new_column_name='governorate')


def downgrade() -> None:
    # Revert the column name back to 'governerate'
    op.alter_column('candidates', 'governorate', new_column_name='governerate')
