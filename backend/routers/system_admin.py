from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import asc, desc, select, func

from core.dependencies import admin_dependency, db_dependency
from models.candidate import Candidate
from models.candidate_participation import CandidateParticipation
from models.election import Election
from models.organization import Organization
from models.organization_admin import OrganizationAdmin
from models.user import User
from models.notification import Notification
from models.verification_token import VerificationToken
from core.scheduler import sync_election_statuses

router = APIRouter(prefix="/SystemAdmin", tags=["SystemAdmin"])


@router.post("/elections/sync-statuses", status_code=status.HTTP_200_OK)
async def sync_election_statuses_endpoint(
    _: admin_dependency,
):
    """Admin-only: Manually sync all election statuses to fix any inconsistencies."""
    try:
        updated_count = await sync_election_statuses()
        return {
            "message": "Election statuses synced successfully",
            "updated_count": updated_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync election statuses: {str(e)}"
        )


@router.get("/dashboard/stats", status_code=status.HTTP_200_OK)
async def get_dashboard_stats(
    db: db_dependency,
    _: admin_dependency,
):
    """Admin-only: Get dashboard statistics including total organizations, elections, votes, and active elections."""
    now = datetime.now(UTC)
    
    # Get total organizations count
    org_count_result = await db.execute(select(func.count(Organization.user_id)))
    total_organizations = org_count_result.scalar()
    
    # Get total elections count
    election_count_result = await db.execute(select(func.count(Election.id)))
    total_elections = election_count_result.scalar()
    
    # Get total votes across all elections
    total_votes_result = await db.execute(select(func.coalesce(func.sum(Election.total_vote_count), 0)))
    total_votes = total_votes_result.scalar()
    
    # Get active elections count (currently running)
    active_elections_result = await db.execute(
        select(func.count(Election.id))
        .where(Election.starts_at <= now, Election.ends_at >= now)
    )
    active_elections = active_elections_result.scalar()
    
    return {
        "total_organizations": total_organizations,
        "total_elections": total_elections,
        "total_votes": total_votes,
        "active_elections": active_elections
    }


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


@router.get("/organizations/{organization_user_id}/admins", status_code=status.HTTP_200_OK)
async def get_organization_admins(
    organization_user_id: int,
    db: db_dependency,
    _: admin_dependency,
):
    """Admin-only: Get all organization admins for a specific organization."""
    # Verify the organization exists
    org_result = await db.execute(select(Organization).where(Organization.user_id == organization_user_id))
    organization = org_result.scalar_one_or_none()
    
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    
    # Get all organization admins for this organization
    query = (
        select(OrganizationAdmin, User.email, User.first_name, User.last_name, User.created_at, User.is_active)
        .join(User, OrganizationAdmin.user_id == User.id)
        .where(OrganizationAdmin.organization_user_id == organization_user_id)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        {
            "user_id": admin.user_id,
            "organization_user_id": admin.organization_user_id,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "created_at": created_at,
            "is_active": is_active,
            "organization_name": organization.name
        }
        for (admin, email, first_name, last_name, created_at, is_active) in rows
    ]


@router.post("/organizations/{organization_user_id}/admins", status_code=status.HTTP_201_CREATED)
async def create_organization_admin(
    organization_user_id: int,
    admin_data: dict,
    db: db_dependency,
    _: admin_dependency,
):
    """Admin-only: Create a new organization admin for a specific organization."""
    from services.auth import AuthService
    
    # Verify the organization exists
    org_result = await db.execute(select(Organization).where(Organization.user_id == organization_user_id))
    organization = org_result.scalar_one_or_none()
    
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    
    # Check if email already exists
    existing_user = await db.execute(select(User).where(User.email == admin_data.get("email")))
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")
    
    try:
        # Create user with role organization_admin
        auth = AuthService(db)
        password_hash = auth.get_password_hash(admin_data.get("password"))
        
        new_user = User(
            email=admin_data.get("email"),
            password=password_hash,
            first_name=admin_data.get("first_name"),
            last_name=admin_data.get("last_name"),
            role="organization_admin",
            created_at=datetime.now(UTC),
            last_access_at=datetime.now(UTC),
            is_active=True,
        )
        db.add(new_user)
        await db.flush()
        
        # Create organization admin record
        org_admin = OrganizationAdmin(
            user_id=new_user.id,
            organization_user_id=organization_user_id,
            created_at=datetime.now(UTC),
        )
        db.add(org_admin)
        
        # Store values before commit to avoid expired ORM object issues
        user_id = new_user.id
        user_email = new_user.email
        user_first_name = new_user.first_name
        user_last_name = new_user.last_name
        admin_created_at = org_admin.created_at
        org_name = organization.name
        
        await db.commit()
        
        return {
            "user_id": user_id,
            "email": user_email,
            "first_name": user_first_name,
            "last_name": user_last_name,
            "created_at": admin_created_at,
            "organization_name": org_name
        }
        
    except Exception as e:
        await db.rollback()
        print(f"Error creating organization admin: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create organization admin"
        )


@router.put("/organizations/{organization_user_id}/admins/{admin_user_id}", status_code=status.HTTP_200_OK)
async def update_organization_admin(
    organization_user_id: int,
    admin_user_id: int,
    admin_data: dict,
    db: db_dependency,
    _: admin_dependency,
):
    """Admin-only: Update an organization admin for a specific organization."""
    from services.auth import AuthService
    
    # Verify the organization exists
    org_result = await db.execute(select(Organization).where(Organization.user_id == organization_user_id))
    organization = org_result.scalar_one_or_none()
    
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    
    # Verify the admin belongs to this organization
    admin_result = await db.execute(
        select(OrganizationAdmin).where(
            OrganizationAdmin.user_id == admin_user_id,
            OrganizationAdmin.organization_user_id == organization_user_id
        )
    )
    admin = admin_result.scalar_one_or_none()
    
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization admin not found")
    
    # Get the user record
    user_result = await db.execute(select(User).where(User.id == admin_user_id))
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Apply updates
    if admin_data.get("first_name") is not None:
        user.first_name = admin_data.get("first_name")
    
    if admin_data.get("last_name") is not None:
        user.last_name = admin_data.get("last_name")
    
    if admin_data.get("email") is not None and admin_data.get("email") != user.email:
        # Check if new email is unique
        existing_user = await db.execute(select(User).where(User.email == admin_data.get("email")))
        if existing_user.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")
        user.email = admin_data.get("email")
    
    if admin_data.get("password") is not None and admin_data.get("password") != "":
        auth = AuthService(db)
        user.password = auth.get_password_hash(admin_data.get("password"))
    
    # Store values before commit to avoid expired ORM object issues
    user_id = user.id
    user_email = user.email
    user_first_name = user.first_name
    user_last_name = user.last_name
    org_name = organization.name
    
    await db.commit()
    
    return {
        "user_id": user_id,
        "email": user_email,
        "first_name": user_first_name,
        "last_name": user_last_name,
        "organization_name": org_name
    }


@router.delete("/organizations/{organization_user_id}/admins/{admin_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization_admin(
    organization_user_id: int,
    admin_user_id: int,
    db: db_dependency,
    _: admin_dependency,
):
    """Admin-only: Delete an organization admin from a specific organization."""
    # Verify the organization exists
    org_result = await db.execute(select(Organization).where(Organization.user_id == organization_user_id))
    organization = org_result.scalar_one_or_none()
    
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    
    # Verify the admin belongs to this organization
    admin_result = await db.execute(
        select(OrganizationAdmin).where(
            OrganizationAdmin.user_id == admin_user_id,
            OrganizationAdmin.organization_user_id == organization_user_id
        )
    )
    admin = admin_result.scalar_one_or_none()
    
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization admin not found")
    
    # Get the user record
    user_result = await db.execute(select(User).where(User.id == admin_user_id))
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    try:
        # Delete the organization admin record first
        await db.delete(admin)
        
        # Delete the user record
        await db.delete(user)
        
        await db.commit()
    except Exception as e:
        await db.rollback()
        print(f"Error deleting organization admin: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete organization admin"
        )
    
    return


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

    # Store values to avoid expired ORM object issues
    election_id = election.id
    election_title = election.title
    election_types = election.types
    election_starts_at = election.starts_at
    election_ends_at = election.ends_at
    election_created_at = election.created_at
    election_total_vote_count = election.total_vote_count
    election_number_of_candidates = election.number_of_candidates
    
    org_id = organization.user_id if organization else None
    org_name = organization.name if organization else None

    return {
        "election": {
            "id": election_id,
            "title": election_title,
            "types": election_types,
            "starts_at": election_starts_at,
            "ends_at": election_ends_at,
            "created_at": election_created_at,
            "total_vote_count": election_total_vote_count,
            "number_of_candidates": election_number_of_candidates,
        },
        "organization": {
            "id": org_id,
            "name": org_name,
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


@router.put("/organizations/{organization_user_id}/status", status_code=status.HTTP_200_OK)
async def update_organization_status(
    organization_user_id: int,
    status_update: dict,
    db: db_dependency,
    _: admin_dependency,
):
    """Admin-only: Update organization status (accept/reject registration request)."""
    from core.shared import Status
    
    new_status = status_update.get("status")
    if new_status not in ["accepted", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Status must be either 'accepted' or 'rejected'"
        )
    
    # Get the organization
    org_result = await db.execute(
        select(Organization).where(Organization.user_id == organization_user_id)
    )
    organization = org_result.scalar_one_or_none()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Organization not found"
        )
    
    # Store organization name before commit to avoid expired ORM object issues
    org_name = organization.name
    
    # Get the user record to update is_active status
    user_result = await db.execute(
        select(User).where(User.id == organization_user_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Organization user not found"
        )
    
    # Update the status
    organization.status = Status(new_status)
    
    # Update user active status based on organization status
    if new_status == "accepted":
        user.is_active = True
    elif new_status == "rejected":
        user.is_active = False
    
    await db.commit()
    
    # Create notification for the organization about status change
    try:
        from services.notification import NotificationService
        from schemas.notification import NotificationType, NotificationPriority
        
        # Create a fresh database session for notification service
        from core.dependencies import SessionLocal
        async with SessionLocal() as notification_db:
            notification_service = NotificationService(notification_db)
            
            title = f"Organization Status Updated: {org_name}"
            message = f"Your organization '{org_name}' has been {new_status} by the system administrator."
            
            await notification_service.create_notification(
                organization_id=organization_user_id,
                notification_type=NotificationType.ORGANIZATION_UPDATED,
                title=title,
                message=message,
                priority=NotificationPriority.HIGH,
                additional_data={
                    "action": "status_updated",
                    "new_status": new_status,
                    "updated_by": "system_admin"
                }
            )
    except Exception as notification_error:
        print(f"Warning: Failed to create status update notification: {notification_error}")
        # Don't fail the main operation if notification creation fails
    
    return {
        "message": f"Organization status updated to {new_status}",
        "organization_id": organization_user_id,
        "new_status": new_status
    }


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
        grouped[key].append(
            {
                "id": e.id,
                "title": e.title,
                "types": e.types,
                "starts_at": e.starts_at,
                "ends_at": e.ends_at,
                "created_at": e.created_at,
                "total_vote_count": e.total_vote_count,
                "number_of_candidates": e.number_of_candidates,
            }
        )

    # Store organization values to avoid expired ORM object issues
    org_id = organization.user_id
    org_name = organization.name
    
    return {"organization": {"id": org_id, "name": org_name}, "elections": grouped}


@router.delete("/organizations/{organization_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization_admin(
    organization_user_id: int,
    db: db_dependency,
    _: admin_dependency,
):
    """Admin-only: Delete an organization (owning user)."""
    try:
        # Check if organization exists
        org_res = await db.execute(select(Organization).where(Organization.user_id == organization_user_id))
        organization = org_res.scalar_one_or_none()
        if not organization:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
        
        # Check if user exists
        u_res = await db.execute(select(User).where(User.id == organization_user_id))
        user = u_res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization owner user not found")
        
        # First, delete all related data manually to avoid cascade issues
        # Delete elections (this will cascade to related data like voters and candidate participations)
        elections_result = await db.execute(select(Election).where(Election.organization_id == organization_user_id))
        elections = elections_result.scalars().all()
        for election in elections:
            await db.delete(election)
        
        # Delete candidates (this will cascade to candidate participations)
        candidates_result = await db.execute(select(Candidate).where(Candidate.organization_id == organization_user_id))
        candidates = candidates_result.scalars().all()
        for candidate in candidates:
            await db.delete(candidate)
        
        # Delete notifications
        notifications_result = await db.execute(select(Notification).where(Notification.organization_id == organization_user_id))
        notifications = notifications_result.scalars().all()
        for notification in notifications:
            await db.delete(notification)
        
        # Delete verification tokens
        verification_tokens_result = await db.execute(select(VerificationToken).where(VerificationToken.user_id == organization_user_id))
        verification_tokens = verification_tokens_result.scalars().all()
        for token in verification_tokens:
            await db.delete(token)
        
        # Now delete the organization
        await db.delete(organization)
        
        # Finally delete the user
        await db.delete(user)
        
        await db.commit()
        
    except Exception as e:
        await db.rollback()
        print(f"Error deleting organization: {str(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to delete organization. Please try again."
        )


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
