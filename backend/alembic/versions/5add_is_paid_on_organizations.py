"""Add is_paid flag to organizations

Revision ID: 5add_is_paid_on_organizations
Revises: 4add_transactions_and_wallet
Create Date: 2025-08-20
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = '5add_is_paid_on_organizations'

down_revision = '4add_transactions_and_wallet'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use raw SQL with IF NOT EXISTS to avoid failing if column already present
    op.execute("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT false;")


def downgrade() -> None:
    op.execute("ALTER TABLE organizations DROP COLUMN IF EXISTS is_paid;")
