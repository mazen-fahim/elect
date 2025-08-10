from fastapi import APIRouter, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from core.dependencies import db_dependency, organization_dependency
from models.organization import Organization
from models.election import Election
from models.candidate import Candidate
from models.voting_process import VotingProcess
from schemas.organization import OrganizationDashboardStats, RecentElection

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("/")
async def get_all_organizations(db: db_dependency):
    result = await db.execute(select(Organization))
    return result.scalars().all()


@router.get("/dashboard-stats", response_model=OrganizationDashboardStats)
async def get_organization_dashboard_stats(user: organization_dependency, db: db_dependency):
    """Get dashboard statistics for the authenticated organization"""
    
    # Get the organization for the logged-in user
    org_result = await db.execute(
        select(Organization).where(Organization.user_id == user.id)
    )
    organization = org_result.scalar_one_or_none()
    
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    organization_id = organization.user_id
    
    # Get total elections count
    elections_result = await db.execute(
        select(func.count(Election.id)).where(Election.organization_id == organization_id)
    )
    total_elections = elections_result.scalar() or 0
    
    # Get total candidates count
    candidates_result = await db.execute(
        select(func.count(Candidate.hashed_national_id)).where(Candidate.organization_id == organization_id)
    )
    total_candidates = candidates_result.scalar() or 0
    
    # Get total votes count (sum of all votes across all elections)
    votes_result = await db.execute(
        select(func.sum(Election.total_vote_count)).where(Election.organization_id == organization_id)
    )
    total_votes = votes_result.scalar() or 0
    
    # Get recent elections (last 3)
    recent_elections_result = await db.execute(
        select(Election)
        .where(Election.organization_id == organization_id)
        .order_by(Election.created_at.desc())
        .limit(3)
    )
    recent_elections = recent_elections_result.scalars().all()
    
    return OrganizationDashboardStats(
        total_elections=total_elections,
        total_candidates=total_candidates,
        total_votes=total_votes,
        recent_elections=[RecentElection.model_validate(election) for election in recent_elections]
    )
