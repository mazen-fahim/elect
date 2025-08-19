from datetime import datetime, timezone
from typing import List, Optional
from enum import Enum

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_

from core.dependencies import db_dependency
from models.election import Election
from models.organization import Organization
from core.shared import Country


router = APIRouter(prefix="/home", tags=["Home"])


class ElectionStatus(str, Enum):
    upcoming = "upcoming"
    running = "running"
    finished = "finished"


class HomeElection(BaseModel):
    id: int
    title: str
    types: str
    starts_at: datetime
    ends_at: datetime


class PublicElection(BaseModel):
    id: int
    title: str
    description: str
    types: str
    starts_at: datetime
    ends_at: datetime
    total_vote_count: int
    number_of_candidates: int
    potential_number_of_voters: int
    organization_name: str
    organization_country: str
    status: ElectionStatus


class PublicElectionsResponse(BaseModel):
    elections: List[PublicElection]
    total: int
    page: int
    limit: int
    total_pages: int


class HomeStats(BaseModel):
    total_organizations: int
    total_elections: int
    total_candidates: int
    total_votes: int


class HomeData(BaseModel):
    stats: HomeStats
    recent_elections: List[HomeElection]


@router.get("/elections", response_model=PublicElectionsResponse)
async def get_public_elections(
    db: db_dependency,
    search: Optional[str] = Query(None, description="Search by election title or description"),
    status: Optional[ElectionStatus] = Query(None, description="Filter by election status"),
    organization: Optional[str] = Query(None, description="Filter by organization name"),
    country: Optional[str] = Query(None, description="Filter by organization country"),
    election_type: Optional[str] = Query(None, description="Filter by election type"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(12, ge=1, le=50, description="Items per page"),
):
    """Get public elections with search, filtering, and pagination for visitors"""
    now = datetime.now(timezone.utc)
    offset = (page - 1) * limit

    # Base query joining elections with organizations
    base_query = select(
        Election.id,
        Election.title,
        Election.types,
        Election.starts_at,
        Election.ends_at,
        Election.total_vote_count,
        Election.number_of_candidates,
        Election.potential_number_of_voters,
        Organization.name.label("organization_name"),
        Organization.country.label("organization_country"),
    ).join(Organization, Election.organization_id == Organization.user_id)

    # Apply filters
    filters = []

    if search:
        search_filter = or_(Election.title.ilike(f"%{search}%"), Organization.name.ilike(f"%{search}%"))
        filters.append(search_filter)

    if organization:
        filters.append(Organization.name.ilike(f"%{organization}%"))

    if country:
        try:
            country_enum = Country(country)
            filters.append(Organization.country == country_enum)
        except ValueError:
            # Ignore invalid country values so the query doesn't fail
            pass

    if election_type:
        filters.append(Election.types == election_type)

    # Apply status filter based on current time
    now = datetime.now(timezone.utc)
    if status:
        if status == ElectionStatus.upcoming:
            filters.append(Election.starts_at > now)
        elif status == ElectionStatus.running:
            filters.append(and_(Election.starts_at <= now, Election.ends_at > now))
        elif status == ElectionStatus.finished:
            filters.append(Election.ends_at <= now)

    # Apply all filters
    if filters:
        base_query = base_query.where(and_(*filters))

    # Get total count for pagination
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination and ordering
    query = base_query.order_by(Election.starts_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    elections_data = result.fetchall()

    # Transform to response format with computed status
    elections = []
    for election_data in elections_data:
        # Determine status based on current time
        if election_data.starts_at > now:
            computed_status = ElectionStatus.upcoming
        elif election_data.ends_at > now:
            computed_status = ElectionStatus.running
        else:
            computed_status = ElectionStatus.finished

        elections.append(
            PublicElection(
                id=election_data.id,
                title=election_data.title,
                description="",  # Election model doesn't have description field
                types=election_data.types,
                starts_at=election_data.starts_at,
                ends_at=election_data.ends_at,
                total_vote_count=election_data.total_vote_count,
                number_of_candidates=election_data.number_of_candidates,
                potential_number_of_voters=election_data.potential_number_of_voters,
                organization_name=election_data.organization_name,
                organization_country=(
                    election_data.organization_country.value
                    if hasattr(election_data.organization_country, "value")
                    else str(election_data.organization_country)
                ),
                status=computed_status,
            )
        )

    # Calculate pagination info
    total_pages = (total + limit - 1) // limit

    return PublicElectionsResponse(elections=elections, total=total, page=page, limit=limit, total_pages=total_pages)


@router.get("/filter-options")
async def get_filter_options(db: db_dependency):
    """Get available filter options for elections (countries, election types, organizations)"""

    # Get unique countries
    countries_result = await db.execute(
        select(Organization.country).distinct().where(Organization.status == "accepted")
    )
    countries = [
        row[0].value if hasattr(row[0], "value") else str(row[0])
        for row in countries_result.fetchall()
        if row[0] is not None
    ]

    # Get unique election types
    types_result = await db.execute(select(Election.types).distinct())
    election_types = [row[0] for row in types_result.fetchall() if row[0]]

    # Get unique organization names (for search suggestions)
    orgs_result = await db.execute(select(Organization.name).distinct().where(Organization.status == "accepted"))
    organizations = [row[0] for row in orgs_result.fetchall()]

    return {"countries": countries, "election_types": election_types, "organizations": organizations}


@router.get("/", response_model=HomeData)
async def get_home_data(db: db_dependency):
    from sqlalchemy import func
    from models.candidate import Candidate

    # Recent elections (public summary)
    recent_res = await db.execute(select(Election).order_by(Election.created_at.desc()).limit(5))
    recent = recent_res.scalars().all()

    # Stats
    total_organizations = (await db.execute(select(func.count(Organization.user_id)))).scalar() or 0
    total_elections = (await db.execute(select(func.count(Election.id)))).scalar() or 0
    total_candidates = (await db.execute(select(func.count(Candidate.hashed_national_id)))).scalar() or 0
    total_votes = (await db.execute(select(func.coalesce(func.sum(Election.total_vote_count), 0)))).scalar() or 0

    return HomeData(
        stats=HomeStats(
            total_organizations=total_organizations,
            total_elections=total_elections,
            total_candidates=total_candidates,
            total_votes=total_votes,
        ),
        recent_elections=[
            HomeElection(
                id=e.id,
                title=e.title,
                types=e.types,
                starts_at=e.starts_at,
                ends_at=e.ends_at,
            )
            for e in recent
        ],
    )
