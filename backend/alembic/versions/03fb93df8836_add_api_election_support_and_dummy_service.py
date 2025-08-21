"""add_api_election_support_and_dummy_service

Revision ID: 03fb93df8836
Revises: 3fix_notification_datetime
Create Date: 2025-08-21 18:28:58.252569

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '03fb93df8836'
down_revision: Union[str, Sequence[str], None] = '3fix_notification_datetime'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new fields to voters table for API-based elections
    op.add_column('voters', sa.Column('eligible_candidates', sa.Text(), nullable=True))
    op.add_column('voters', sa.Column('is_api_voter', sa.Boolean(), nullable=False, server_default='false'))
    
    # Create dummy service tables for testing
    op.create_table('dummy_candidates',
        sa.Column('hashed_national_id', sa.String(length=200), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('district', sa.String(length=100), nullable=True),
        sa.Column('governorate', sa.String(length=100), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=False),
        sa.Column('party', sa.String(length=100), nullable=True),
        sa.Column('symbol_icon_url', sa.String(length=500), nullable=True),
        sa.Column('symbol_name', sa.String(length=100), nullable=True),
        sa.Column('photo_url', sa.String(length=500), nullable=True),
        sa.Column('birth_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('description', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default='now()', nullable=False),
        sa.Column('dummy_organization_id', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('hashed_national_id')
    )
    
    op.create_table('dummy_voters',
        sa.Column('voter_hashed_national_id', sa.String(length=200), nullable=False),
        sa.Column('phone_number', sa.String(length=20), nullable=False),
        sa.Column('governerate', sa.String(length=100), nullable=True),
        sa.Column('district', sa.String(length=100), nullable=True),
        sa.Column('eligible_candidates', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default='now()', nullable=False),
        sa.Column('dummy_organization_id', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('voter_hashed_national_id')
    )
    
    # Create indexes for better performance
    op.create_index(op.f('ix_dummy_candidates_hashed_national_id'), 'dummy_candidates', ['hashed_national_id'], unique=False)
    op.create_index(op.f('ix_dummy_voters_voter_hashed_national_id'), 'dummy_voters', ['voter_hashed_national_id'], unique=False)
    op.create_index(op.f('ix_voters_is_api_voter'), 'voters', ['is_api_voter'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Remove dummy service tables
    op.drop_index(op.f('ix_dummy_voters_voter_hashed_national_id'), table_name='dummy_voters')
    op.drop_index(op.f('ix_dummy_candidates_hashed_national_id'), table_name='dummy_candidates')
    op.drop_table('dummy_voters')
    op.drop_table('dummy_candidates')
    
    # Remove new fields from voters table
    op.drop_index(op.f('ix_voters_is_api_voter'), table_name='voters')
    op.drop_column('voters', 'eligible_candidates')
    op.drop_column('voters', 'is_api_voter')
