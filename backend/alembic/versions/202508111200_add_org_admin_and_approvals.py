"""add org admin and approvals

Revision ID: 202508111200
Revises: c8f966d3959b
Create Date: 2025-08-11 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "202508111200"
down_revision: Union[str, Sequence[str], None] = "c8f966d3959b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new enum value to userrole
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'organization_admin'")

    # Create organization_admins table
    op.create_table(
        "organization_admins",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column(
            "organization_user_id",
            sa.Integer(),
            sa.ForeignKey("organizations.user_id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Create approval_requests table
    op.create_table(
        "approval_requests",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "organization_user_id", sa.Integer(), sa.ForeignKey("organizations.user_id", ondelete="CASCADE"), index=True
        ),
        sa.Column("requested_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("target_type", sa.Enum("election", "candidate", name="approvaltargettype"), nullable=False),
        sa.Column("action", sa.Enum("create", "update", "delete", name="approvalaction"), nullable=False),
        sa.Column("target_id", sa.String(length=255), nullable=False),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("pending", "approved", "rejected", name="approvalstatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decided_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("approval_requests")
    op.drop_table("organization_admins")
    # Note: Downgrading ENUM values is non-trivial; left as-is
