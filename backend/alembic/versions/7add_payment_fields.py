"""Add payment fields to users and organizations

Revision ID: 7add_payment_fields
Revises: 03fb93df8836_add_api_election_support_and_dummy_service
Create Date: 2025-08-22
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = '7add_payment_fields'
down_revision = '03fb93df8836_add_api_election_support_and_dummy_service'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add wallet and stripe_session_id to users table
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet NUMERIC(12,2) NOT NULL DEFAULT 0;")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);")
    
    # Add is_paid to organizations table
    op.execute("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT false;")


def downgrade() -> None:
    # Remove payment fields from users table
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS wallet;")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS stripe_session_id;")
    
    # Remove is_paid from organizations table
    op.execute("ALTER TABLE organizations DROP COLUMN IF EXISTS is_paid;")
