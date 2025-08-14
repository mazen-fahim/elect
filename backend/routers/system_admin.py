from datetime import datetime, UTC

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select, desc, asc, func

from core.dependencies import db_dependency, admin_dependency
from models.election import Election
from models.organization import Organization
from models.candidate import Candidate
from models.candidate_participation import CandidateParticipation
from models.user import User


router = APIRouter(prefix="/SystemAdmin", tags=["SystemAdmin"])


@router.get("/elections/active", status_code=status.HTTP_200_OK)
async def list_active_elections(
    db: db_dependency,
    _: admin_dependency,
    search: str | None = Query(None, description="Search by election title or organization name"),
    sort_by: str = Query("starts_at", pattern="^(starts_at|ends_at|created_at|title|organization)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Admin-only: List currently running elections with organization info."""
    now = datetime.now(UTC)

    # Join with Organization to return org name
    query = (
        select(Election, Organization.name)
        .join(Organization, Election.organization_id == Organization.user_id)
        .where(Election.starts_at <= now, Election.ends_at >= now)
    )

    if search:
        like = f"%{search}%"
        query = query.where((Election.title.ilike(like)) | (Organization.name.ilike(like)))

    if sort_by == "organization":
        sort_expr = asc(Organization.name) if order == "asc" else desc(Organization.name)
    else:
        sort_column = getattr(Election, sort_by)
        sort_expr = asc(sort_column) if order == "asc" else desc(sort_column)

    query = query.order_by(sort_expr).offset(offset).limit(limit)

    res = await db.execute(query)
    rows = res.all()

    return [
        {
            "id": e.id,
            "title": e.title,
            "types": e.types,
            "starts_at": e.starts_at,
            "ends_at": e.ends_at,
            "created_at": e.created_at,
            "total_vote_count": e.total_vote_count,
            "number_of_candidates": e.number_of_candidates,
            "organization_id": e.organization_id,
            "organization_name": org_name,
        }
        for (e, org_name) in rows
    ]


@router.get("/elections/{election_id}/details", status_code=status.HTTP_200_OK)
async def get_election_details(
    election_id: int,
    db: db_dependency,
    _: admin_dependency,
):
    """Admin-only: Get election summary including candidates and current vote counts."""
    e_res = await db.execute(select(Election).where(Election.id == election_id))
    election = e_res.scalar_one_or_none()
    if not election:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Election not found")

    # Candidates in election with their vote counts
    cp_join = (
        select(Candidate, CandidateParticipation.vote_count)
        .join(
            CandidateParticipation, CandidateParticipation.candidate_hashed_national_id == Candidate.hashed_national_id
        )
        .where(CandidateParticipation.election_id == election_id)
    )
    c_res = await db.execute(cp_join)
    candidates = c_res.all()

    # Organization info
    o_res = await db.execute(select(Organization).where(Organization.user_id == election.organization_id))
    organization = o_res.scalar_one_or_none()

    return {
        "election": {
            "id": election.id,
            "title": election.title,
            "types": election.types,
            "starts_at": election.starts_at,
            "ends_at": election.ends_at,
            "created_at": election.created_at,
            "total_vote_count": election.total_vote_count,
            "number_of_candidates": election.number_of_candidates,
        },
        "organization": {
            "id": organization.user_id if organization else None,
            "name": organization.name if organization else None,
        },
        "candidates": [
            {
                "hashed_national_id": c.hashed_national_id,
                "name": c.name,
                "party": c.party,
                "symbol_name": c.symbol_name,
                "vote_count": vote_count or 0,
            }
            for (c, vote_count) in candidates
        ],
    }


@router.get("/organizations", status_code=status.HTTP_200_OK)
async def list_organizations_admin(
    db: db_dependency,
    _: admin_dependency,
    search: str | None = Query(None),
    sort_by: str = Query("created_at", pattern="^(created_at|name)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Admin-only: List organizations with filters and sorting."""
    query = select(Organization, User.created_at).join(User, Organization.user_id == User.id)
    if search:
        query = query.where(Organization.name.ilike(f"%{search}%"))

    if sort_by == "name":
        sort_expr = asc(Organization.name) if order == "asc" else desc(Organization.name)
    else:
        sort_expr = asc(User.created_at) if order == "asc" else desc(User.created_at)

    query = query.order_by(sort_expr).offset(offset).limit(limit)

    res = await db.execute(query)
    rows = res.all()
    return [
        {
            "id": org.user_id,
            "name": org.name,
            "country": org.country,
            "status": org.status,
            "created_at": created_at,
        }
        for (org, created_at) in rows
    ]


@router.get("/organizations/{organization_user_id}/elections-grouped", status_code=status.HTTP_200_OK)
async def get_org_elections_grouped_admin(
    organization_user_id: int,
    db: db_dependency,
    _: admin_dependency,
):
    """Admin-only: Elections grouped by computed status for a given organization."""
    org_res = await db.execute(select(Organization).where(Organization.user_id == organization_user_id))
    organization = org_res.scalar_one_or_none()
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    e_res = await db.execute(select(Election).where(Election.organization_id == organization_user_id))
    elections = e_res.scalars().all()

    now = datetime.now(UTC)
    grouped: dict[str, list[dict]] = {"upcoming": [], "running": [], "finished": []}
    for e in elections:
        if now < e.starts_at:
            key = "upcoming"
        elif now <= e.ends_at:
            key = "running"
        else:
            key = "finished"
        grouped[key].append({
            "id": e.id,
            "title": e.title,
            "types": e.types,
            "starts_at": e.starts_at,
            "ends_at": e.ends_at,
            "created_at": e.created_at,
            "total_vote_count": e.total_vote_count,
            "number_of_candidates": e.number_of_candidates,
        })

    return {"organization": {"id": organization.user_id, "name": organization.name}, "elections": grouped}


@router.delete("/organizations/{organization_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization_admin(
    organization_user_id: int,
    db: db_dependency,
    _: admin_dependency,
):
    """Admin-only: Delete an organization (owning user)."""
    u_res = await db.execute(select(User).where(User.id == organization_user_id))
    user = u_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization owner user not found")
    await db.delete(user)
    await db.commit()


@router.get("/notifications/organizations", status_code=status.HTTP_200_OK)
async def organizations_activity_feed(
    db: db_dependency,
    _: admin_dependency,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Admin-only: Basic activity feed for organizations (created). Updates/deletes require audit tracking to enrich further."""
    query = (
        select(Organization, User.created_at)
        .join(User, Organization.user_id == User.id)
        .order_by(desc(User.created_at))
        .offset(offset)
        .limit(limit)
    )
    res = await db.execute(query)
    rows = res.all()
    return [
        {
            "event": "organization_created",
            "organization_id": org.user_id,
            "organization_name": org.name,
            "created_at": created_at,
        }
        for (org, created_at) in rows
    ]
