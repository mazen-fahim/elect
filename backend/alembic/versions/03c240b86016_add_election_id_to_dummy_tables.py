"""add_election_id_to_dummy_tables

Revision ID: 03c240b86016
Revises: 59efc9b6b402
Create Date: 2025-08-21 16:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "03c240b86016"
down_revision: str | Sequence[str] | None = "59efc9b6b402"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # First, delete existing data since we can't determine which election they belong to
    op.execute("DELETE FROM dummy_voters")
    op.execute("DELETE FROM dummy_candidates")

    # Add election_id to dummy_candidates table
    op.add_column("dummy_candidates", sa.Column("election_id", sa.Integer(), nullable=False))
    op.create_foreign_key(
        "fk_dummy_candidates_election_id", "dummy_candidates", "elections", ["election_id"], ["id"], ondelete="CASCADE"
    )

    # Add election_id to dummy_voters table
    op.add_column("dummy_voters", sa.Column("election_id", sa.Integer(), nullable=False))
    op.create_foreign_key(
        "fk_dummy_voters_election_id", "dummy_voters", "elections", ["election_id"], ["id"], ondelete="CASCADE"
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop foreign key constraints
    op.drop_constraint("fk_dummy_voters_election_id", "dummy_voters", type_="foreignkey")
    op.drop_constraint("fk_dummy_candidates_election_id", "dummy_candidates", type_="foreignkey")

    # Drop election_id columns
    op.drop_column("dummy_voters", "election_id")
    op.drop_column("dummy_candidates", "election_id")
