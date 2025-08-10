from datetime import datetime
from typing import Annotated, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from sqlalchemy import func

from core.dependencies import db_dependency, organization_dependency
from core.shared import Country
from models import Candidate
from schemas.candidate import CandidateRead, CandidateCreate, CandidateUpdate, CandidateCreateResponse
from services.image import ImageService
from services.notification import NotificationService
from schemas.notification import CandidateNotificationData

router = APIRouter(prefix="/candidates", tags=["Candidate"])




# @router.post("/", response_model=CandidateRead, status_code=status.HTTP_201_CREATED)
# async def create_candidate(candidate_in: CandidateCreate, db: db_dependency):
#     existing_candidate = (
#         await db.execute(select(Candidate).where(Candidate.hashed_national_id == candidate_in.hashed_national_id))
#     ).first()
#
#     if existing_candidate:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST, detail="A candidate with this national ID already exists"
#         )
#
#     new_candidate = Candidate(
#         name=candidate_in.name, hashed_national_id=candidate_in.hashed_national_id, email=candidate_in.email
#     )
#
#     db.add(new_candidate)
#     await db.commit()
#     await db.refresh(new_candidate)


@router.get("/", response_model=list[CandidateRead])
async def get_all_candidates(
    db: db_dependency,
    current_user: organization_dependency,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    election_id: Optional[int] = None,
    party: Optional[str] = None,
    country: Optional[Country] = None,
):
    # Store organization_id early to avoid expired attribute issues
    organization_id = current_user.id
    
    # Filter candidates by the current user's organization
    query = select(Candidate).options(
        selectinload(Candidate.participations), selectinload(Candidate.organization)
    ).where(Candidate.organization_id == organization_id)

    if search:
        # name ilike search
        query = query.where(Candidate.name.ilike(f"%{search}%"))

    if party:
        query = query.where(Candidate.party == party)

    if country:
        query = query.where(Candidate.country == country)

    # Filter by election via participation subquery
    if election_id is not None:
        from models.candidate_participation import CandidateParticipation
        query = query.join(CandidateParticipation, CandidateParticipation.candidate_hashed_national_id == Candidate.hashed_national_id)
        query = query.where(CandidateParticipation.election_id == election_id)

    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{hashed_national_id}", response_model=CandidateRead)
async def get_candidate_by_id(
    hashed_national_id: str, 
    db: db_dependency,
    current_user: organization_dependency
):
    # Store organization_id early to avoid expired attribute issues
    organization_id = current_user.id
    
    query = (
        select(Candidate)
        .where(Candidate.hashed_national_id == hashed_national_id)
        .where(Candidate.organization_id == organization_id)  # Only allow access to own organization's candidates
        .options(
            selectinload(Candidate.participations),
            selectinload(Candidate.organization),
        )
    )

    result = await db.execute(query)
    candidate = result.scalars().first()

    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    return candidate


@router.get("/election/{election_id}", response_model=list[CandidateRead])
async def get_candidates_by_election(
    election_id: int, 
    db: db_dependency,
    current_user: organization_dependency
):
    from models.candidate_participation import CandidateParticipation

    # Store organization_id early to avoid expired attribute issues
    organization_id = current_user.id

    # Subquery to get candidate IDs participating in this election
    candidate_ids_subq = (
        select(CandidateParticipation.candidate_hashed_national_id)
        .where(CandidateParticipation.election_id == election_id)
    )

    # Fetch candidates via IN-subquery; load relationships safely
    # Only return candidates from the current user's organization
    query = (
        select(Candidate)
        .where(Candidate.hashed_national_id.in_(candidate_ids_subq))
        .where(Candidate.organization_id == organization_id)  # Only allow access to own organization's candidates
        .options(selectinload(Candidate.participations), selectinload(Candidate.organization))
    )

    result = await db.execute(query)
    candidates = result.scalars().all()
    return candidates


# API to upload candidate image
@router.post("/", response_model=CandidateCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_candidate(
    db: db_dependency,
    current_user: organization_dependency,
    hashed_national_id: Annotated[str, Form(...)],
    name: Annotated[str, Form(...)],
    country: Annotated[Country, Form(...)],
    birth_date: Annotated[datetime, Form(...)],
    election_ids: Annotated[List[int], Form(...)],
    organization_id: Annotated[int | None, Form()] = None,
    party: Annotated[str | None, Form()] = None,
    symbol_name: Annotated[str | None, Form()] = None,
    description: Annotated[str | None, Form()] = None,
    district: Annotated[str | None, Form()] = None,
    governorate: Annotated[str | None, Form()] = None,
    symbol_icon: Annotated[UploadFile | None, File()] = None,
    photo: Annotated[UploadFile | None, File()] = None,
):
    try:
        # Check if the candidate already exists
        existing_candidate = (
            await db.execute(select(Candidate).where(Candidate.hashed_national_id == hashed_national_id))
        ).scalar_one_or_none()

        if existing_candidate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="A candidate with this national ID already exists"
            )

        image_service = ImageService()
        # Save profile picture (optional)
        photo_url = await image_service.upload_image(photo)
        # Save the election symbol icon (optional)
        symbol_icon_url = await image_service.upload_image(symbol_icon)

        # Store organization_id early to avoid expired attribute issues
        org_id = organization_id or current_user.id
        
        # Create a new Candidate
        new_candidate = Candidate(
            hashed_national_id=hashed_national_id,
            name=name,
            country=country,
            birth_date=birth_date,
            party=party,
            symbol_name=symbol_name,
            description=description,
            organization_id=org_id,
            photo_url=photo_url,
            symbol_icon_url=symbol_icon_url,
        )

        # Map optional fields
        if district:
            new_candidate.district = district
        if governorate:
            new_candidate.governorate = governorate

        db.add(new_candidate)
        await db.flush()

        # Link to elections via participations (required, one or more)
        from models.election import Election
        from models.candidate_participation import CandidateParticipation
        from datetime import datetime, timezone

        # Normalize and validate list
        unique_ids = list(dict.fromkeys(election_ids))
        if not unique_ids:
            raise HTTPException(status_code=400, detail="At least one election must be selected")

        elections_res = await db.execute(select(Election).where(Election.id.in_(unique_ids)))
        elections = elections_res.scalars().all()
        if len(elections) != len(unique_ids):
            raise HTTPException(status_code=400, detail="One or more elections were not found")

        for e in elections:
            if e.organization_id != org_id:
                raise HTTPException(status_code=403, detail="Not authorized to add candidate to one of the selected elections")

        now = datetime.now(timezone.utc)
        running = [e.id for e in elections if e.starts_at <= now <= e.ends_at]
        if running:
            raise HTTPException(status_code=400, detail="Cannot add candidate to running elections")

        for eid in unique_ids:
            db.add(CandidateParticipation(candidate_hashed_national_id=new_candidate.hashed_national_id, election_id=eid))

        try:
            await db.commit()
            await db.refresh(new_candidate)
            return new_candidate
        except IntegrityError as e:
            await db.rollback()
            if "duplicate key value violates unique constraint" in str(e) or "already exists" in str(e):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="A candidate with this national ID already exists"
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error occurred while creating candidate"
            )
    except HTTPException:
        # Re-raise HTTP exceptions (400, 403, etc.) without catching them
        raise
    except Exception as e:
        await db.rollback()
        # Log the actual error for debugging
        print(f"Unexpected error in create_candidate: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error occurred: {str(e)}"
        )


@router.put("/{hashed_national_id}", response_model=CandidateRead)
async def update_candidate(
    hashed_national_id: str,
    candidate_update: CandidateUpdate,
    db: db_dependency,
    current_user: organization_dependency,
):
    # Store organization_id early to avoid expired attribute issues
    organization_id = current_user.id
    
    # Only allow access to candidates from the current user's organization
    result = await db.execute(
        select(Candidate)
        .where(Candidate.hashed_national_id == hashed_national_id)
        .where(Candidate.organization_id == organization_id)  # Only allow access to own organization's candidates
        .options(selectinload(Candidate.participations), selectinload(Candidate.organization))
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # If candidate is participating in a running election, prevent edits
    from models.election import Election
    running_participation = None
    for p in candidate.participations:
        election_result = await db.execute(select(Election).where(Election.id == p.election_id))
        election = election_result.scalar_one()
        # Consider 'running' if now between start and end
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        if election.starts_at <= now <= election.ends_at:
            running_participation = p
            break

    if running_participation:
        raise HTTPException(status_code=400, detail="Cannot edit candidate while their election is running")

    # Track changes for notification
    update_data = candidate_update.model_dump(exclude_unset=True)
    changes_made = list(update_data.keys())
    
    for field, value in update_data.items():
        # map governorate to governorate in model (field names now match)
        if field == "governorate":
            setattr(candidate, "governorate", value)
        else:
            setattr(candidate, field, value)

    await db.commit()
    await db.refresh(candidate)
    
    # Create notification for candidate update
    if changes_made:
        notification_service = NotificationService(db)
        candidate_notification_data = CandidateNotificationData(
            candidate_id=candidate.hashed_national_id,
            candidate_name=candidate.name,
            changes_made=changes_made
        )
        await notification_service.create_candidate_updated_notification(
            organization_id=organization_id,
            candidate_data=candidate_notification_data
        )
    
    return candidate


@router.put("/{hashed_national_id}/with-files", response_model=CandidateRead)
async def update_candidate_with_files(
    hashed_national_id: str,
    db: db_dependency,
    current_user: organization_dependency,
    name: Annotated[str | None, Form()] = None,
    party: Annotated[str | None, Form()] = None,
    symbol_name: Annotated[str | None, Form()] = None,
    description: Annotated[str | None, Form()] = None,
    district: Annotated[str | None, Form()] = None,
    governorate: Annotated[str | None, Form()] = None,
    country: Annotated[Country | None, Form()] = None,
    birth_date: Annotated[datetime | None, Form()] = None,
    photo: Annotated[UploadFile | None, File()] = None,
    symbol_icon: Annotated[UploadFile | None, File()] = None,
):
    """Update candidate with support for file uploads"""
    # Store organization_id early to avoid expired attribute issues
    organization_id = current_user.id
    
    # Only allow access to candidates from the current user's organization
    result = await db.execute(
        select(Candidate)
        .where(Candidate.hashed_national_id == hashed_national_id)
        .where(Candidate.organization_id == organization_id)  # Only allow access to own organization's candidates
        .options(selectinload(Candidate.participations), selectinload(Candidate.organization))
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # If candidate is participating in a running election, prevent edits
    from models.election import Election
    running_participation = None
    for p in candidate.participations:
        election_result = await db.execute(select(Election).where(Election.id == p.election_id))
        election = election_result.scalar_one()
        # Consider 'running' if now between start and end
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        if election.starts_at <= now <= election.ends_at:
            running_participation = p
            break

    if running_participation:
        raise HTTPException(status_code=400, detail="Cannot edit candidate while their election is running")

    # Handle file uploads
    image_service = ImageService()
    
    # Upload new photo if provided
    if photo:
        photo_url = await image_service.upload_image(photo)
        candidate.photo_url = photo_url
    
    # Upload new symbol icon if provided
    if symbol_icon:
        symbol_icon_url = await image_service.upload_image(symbol_icon)
        candidate.symbol_icon_url = symbol_icon_url

    # Track changes for notification
    changes_made = []
    
    # Update other fields if provided
    if name is not None:
        candidate.name = name
        changes_made.append("name")
    if party is not None:
        candidate.party = party
        changes_made.append("party")
    if symbol_name is not None:
        candidate.symbol_name = symbol_name
        changes_made.append("symbol_name")
    if description is not None:
        candidate.description = description
        changes_made.append("description")
    if district is not None:
        candidate.district = district
        changes_made.append("district")
    if governorate is not None:
        candidate.governorate = governorate  # Note the corrected model field name
        changes_made.append("governorate")
    if country is not None:
        candidate.country = country
        changes_made.append("country")
    if birth_date is not None:
        candidate.birth_date = birth_date
        changes_made.append("birth_date")

    await db.commit()
    await db.refresh(candidate)
    
    # Create notification for candidate update (including file uploads)
    if changes_made or photo or symbol_icon:
        if photo:
            changes_made.append("photo")
        if symbol_icon:
            changes_made.append("symbol_icon")
            
        notification_service = NotificationService(db)
        candidate_notification_data = CandidateNotificationData(
            candidate_id=candidate.hashed_national_id,
            candidate_name=candidate.name,
            changes_made=changes_made
        )
        await notification_service.create_candidate_updated_notification(
            organization_id=organization_id,
            candidate_data=candidate_notification_data
        )
    
    return candidate


class ParticipationsUpdate(BaseModel):
    election_ids: List[int]


@router.put("/{hashed_national_id}/participations", response_model=CandidateRead)
async def set_candidate_participations(
    hashed_national_id: str,
    payload: ParticipationsUpdate,
    db: db_dependency,
    current_user: organization_dependency,
):
    from models.candidate_participation import CandidateParticipation
    from models.election import Election
    from datetime import datetime, timezone

    # Store organization_id early to avoid expired attribute issues
    organization_id = current_user.id

    # Load candidate and current participations - only allow access to own organization's candidates
    result = await db.execute(
        select(Candidate)
        .where(Candidate.hashed_national_id == hashed_national_id)
        .where(Candidate.organization_id == organization_id)  # Only allow access to own organization's candidates
        .options(selectinload(Candidate.participations), selectinload(Candidate.organization))
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    target_ids = list(dict.fromkeys(payload.election_ids or []))
    # Validate elections exist and belong to current org
    elections_res = await db.execute(select(Election).where(Election.id.in_(target_ids)))
    elections = elections_res.scalars().all()
    if len(elections) != len(target_ids):
        raise HTTPException(status_code=400, detail="One or more elections not found")
    for e in elections:
        if e.organization_id != organization_id:
            raise HTTPException(status_code=403, detail="Cannot assign participation to external election")

    # Compute diffs
    current_ids = {p.election_id for p in (candidate.participations or [])}
    target_set = set(target_ids)
    to_add = target_set - current_ids
    to_remove = current_ids - target_set

    # Prevent modifications for running elections
    now = datetime.now(timezone.utc)
    if to_add:
        add_running = await db.execute(
            select(Election.id).where(
                Election.id.in_(list(to_add)),
                Election.starts_at <= now,
                Election.ends_at >= now,
            )
        )
        if add_running.scalars().first() is not None:
            raise HTTPException(status_code=400, detail="Cannot add participation to running elections")
    if to_remove:
        remove_running = await db.execute(
            select(Election.id).where(
                Election.id.in_(list(to_remove)),
                Election.starts_at <= now,
                Election.ends_at >= now,
            )
        )
        if remove_running.scalars().first() is not None:
            raise HTTPException(status_code=400, detail="Cannot remove participation from running elections")

    # Apply removals
    if to_remove and candidate.participations:
        for p in list(candidate.participations):
            if p.election_id in to_remove:
                await db.delete(p)

    # Apply additions
    for eid in to_add:
        db.add(CandidateParticipation(candidate_hashed_national_id=candidate.hashed_national_id, election_id=eid))

    await db.commit()
    await db.refresh(candidate)
    return candidate

@router.delete("/{hashed_national_id}", status_code=204)
async def delete_candidate(
    hashed_national_id: str,
    db: db_dependency,
    current_user: organization_dependency,
):
    # Store organization_id early to avoid expired attribute issues
    organization_id = current_user.id
    
    # Only allow access to candidates from the current user's organization
    result = await db.execute(
        select(Candidate)
        .where(Candidate.hashed_national_id == hashed_national_id)
        .where(Candidate.organization_id == organization_id)  # Only allow access to own organization's candidates
        .options(selectinload(Candidate.participations), selectinload(Candidate.organization))
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Prevent deletion if any participation is in a running election
    from models.election import Election
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    for p in candidate.participations:
        election_result = await db.execute(select(Election).where(Election.id == p.election_id))
        election = election_result.scalar_one()
        if election.starts_at <= now <= election.ends_at:
            raise HTTPException(status_code=400, detail="Cannot delete candidate while their election is running")

    await db.delete(candidate)
    await db.commit()
    
    # Create notification for candidate deletion
    try:
        notification_service = NotificationService(db)
        candidate_notification_data = CandidateNotificationData(
            candidate_id=candidate.hashed_national_id,
            candidate_name=candidate.name
        )
        await notification_service.create_candidate_deleted_notification(
            organization_id=organization_id,
            candidate_data=candidate_notification_data
        )
    except Exception as e:
        print(f"Warning: Failed to create notification: {e}")


@router.post("/bulk", response_model=List[CandidateRead], status_code=status.HTTP_201_CREATED)
async def create_candidates_bulk(
    candidates_data: List[CandidateCreate],
    db: db_dependency,
    current_user: organization_dependency
):
    """Create multiple candidates at once"""
    # Store organization_id early to avoid expired attribute issues
    organization_id = current_user.id
    
    created_candidates = []
    
    for candidate_data in candidates_data:
        # Check if candidate already exists
        result = await db.execute(
            select(Candidate).where(
                Candidate.hashed_national_id == candidate_data.hashed_national_id
            )
        )
        existing_candidate = result.scalar_one_or_none()
        
        if existing_candidate:
            continue  # Skip existing candidates or raise error based on requirements
        
        # Create new candidate
        new_candidate = Candidate(
            hashed_national_id=candidate_data.hashed_national_id,
            name=candidate_data.name,
            district=candidate_data.district,
            governorate=candidate_data.governorate,
            country=candidate_data.country,
            party=candidate_data.party,
            symbol_name=candidate_data.symbol_name,
            symbol_icon_url=str(candidate_data.symbol_icon_url) if candidate_data.symbol_icon_url else None,
            photo_url=str(candidate_data.photo_url) if candidate_data.photo_url else None,
            birth_date=candidate_data.birth_date,
            description=candidate_data.description,
            organization_id=organization_id,
        )
        
        db.add(new_candidate)
        created_candidates.append(new_candidate)
    
    await db.commit()
    
    for candidate in created_candidates:
        await db.refresh(candidate)
    
    return created_candidates
