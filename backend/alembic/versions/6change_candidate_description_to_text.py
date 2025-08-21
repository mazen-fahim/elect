"""Change candidates.description to TEXT

Revision ID: 6cand_desc_to_text
Revises: 5add_is_paid_on_organizations
Create Date: 2025-08-21
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = '6cand_desc_to_text'
down_revision = '5add_is_paid_on_organizations'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Postgres-specific: change VARCHAR to TEXT
    op.execute(
        """
        ALTER TABLE candidates
        ALTER COLUMN description TYPE TEXT;
        """
    )


def downgrade() -> None:
    # Revert back to VARCHAR(200) if needed
    op.execute(
        """
        ALTER TABLE candidates
        ALTER COLUMN description TYPE VARCHAR(200);
        """
    )
