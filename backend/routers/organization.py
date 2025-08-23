from datetime import datetime, UTC

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy import select, func, desc, asc

from core.dependencies import db_dependency, organization_dependency, admin_dependency
from models.organization import Organization
from models.election import Election
from models.user import User, UserRole
from models.organization_admin import OrganizationAdmin
from models.candidate import Candidate
from schemas.organization import OrganizationDashboardStats, RecentElection

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("/")
async def get_all_organizations(db: db_dependency):
    result = await db.execute(select(Organization))
    organizations = result.scalars().all()
    
    # Extract all attributes to avoid MissingGreenlet errors
    organizations_data = []
    for org in organizations:
        org_data = {
            "user_id": org.user_id,
            "name": org.name,
            "country": org.country,
            "status": org.status
        }
        organizations_data.append(org_data)
    
    return organizations_data


@router.get("/dashboard-stats", response_model=OrganizationDashboardStats)
async def get_organization_dashboard_stats(user: organization_dependency, db: db_dependency):
    """Get dashboard statistics for the authenticated organization"""

    # For organization users, user.id is the organization's user_id
    # For organization admin users, user.organization_id is the organization's user_id they belong to
    if user.role == UserRole.organization:
        organization_id = user.id
    elif user.role == UserRole.organization_admin:
        # Get the organization ID from the organization_admins table
        admin_result = await db.execute(
            select(OrganizationAdmin).where(OrganizationAdmin.user_id == user.id)
        )
        admin = admin_result.scalar_one_or_none()
        if not admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization admin not found")
        organization_id = admin.organization_user_id
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization privileges required")

    print(f"Dashboard stats for organization_id: {organization_id}, user role: {user.role}")

    # Totals
    elections_result = await db.execute(
        select(func.count(Election.id)).where(Election.organization_id == organization_id)
    )
    total_elections = elections_result.scalar() or 0

    candidates_result = await db.execute(
        select(func.count(Candidate.hashed_national_id)).where(Candidate.organization_id == organization_id)
    )
    total_candidates = candidates_result.scalar() or 0

    votes_result = await db.execute(
        select(func.coalesce(func.sum(Election.total_vote_count), 0)).where(Election.organization_id == organization_id)
    )
    total_votes = votes_result.scalar() or 0

    # Recent elections (last 3)
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
        recent_elections=[RecentElection.model_validate(election) for election in recent_elections],
    )


class OrgListParams(BaseModel):
    search: str | None = None
    sort_by: str = "created_at"  # created_at | name
    order: str = "desc"  # asc | desc
    limit: int = 50
    offset: int = 0


# Admin: List organizations with filtering and sorting
@router.get("/admin", status_code=status.HTTP_200_OK)
async def admin_list_organizations(
    db: db_dependency,
    _: admin_dependency,
    params: OrgListParams = Depends(),
):
    """Admin-only listing of all organizations with optional name filter and date/name sort.

    Notes:
    - Uses the owning `User.created_at` as the organization creation date.
    - Returns a flat list of dicts with `id` (organization user_id), `name`, `country`, `status`, `created_at`.
    """
    query = select(Organization, User.created_at).join(User, Organization.user_id == User.id)

    if params.search:
        query = query.where(Organization.name.ilike(f"%{params.search}%"))

    # Sorting
    if params.sort_by == "name":
        sort_expr = asc(Organization.name) if params.order == "asc" else desc(Organization.name)
    else:
        sort_expr = asc(User.created_at) if params.order == "asc" else desc(User.created_at)

    query = query.order_by(sort_expr).offset(params.offset).limit(min(params.limit, 200))

    result = await db.execute(query)
    rows = result.all()

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


# Admin: Get an organization's elections grouped by computed status
@router.get("/{organization_user_id}/elections-grouped", status_code=status.HTTP_200_OK)
async def admin_get_org_elections_grouped(
    organization_user_id: int,
    db: db_dependency,
    _: admin_dependency,
):
    """Admin-only. Return an organization's elections grouped by computed status.

    computed_status is derived from starts_at/ends_at relative to now (UTC).
    """
    org_res = await db.execute(select(Organization).where(Organization.user_id == organization_user_id))
    organization = org_res.scalar_one_or_none()
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    result = await db.execute(select(Election).where(Election.organization_id == organization_user_id))
    elections = result.scalars().all()

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

    return {
        "organization": {"id": organization.user_id, "name": organization.name},
        "elections": grouped,
    }


# Admin: Delete an organization (and owning user) by organization_user_id
@router.delete("/{organization_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_organization(
    organization_user_id: int,
    db: db_dependency,
    _: admin_dependency,
):
    """Admin-only. Delete the owning `User`; cascades remove Organization and related entities."""
    user_res = await db.execute(select(User).where(User.id == organization_user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization owner user not found")

    await db.delete(user)
    await db.commit()
