
from fastapi import APIRouter, File, HTTPException, UploadFile, Form, Depends, Query
from sqlalchemy.future import select
from sqlalchemy import and_, or_
from datetime import datetime
import pandas as pd
from typing import Optional, List

from core.dependencies import db_dependency, organization_dependency
from core.shared import Country
from models.candidate import Candidate
from models.candidate_participation import CandidateParticipation
from models.election import Election
from models.voter import Voter
from schemas.election import ElectionCreate, ElectionOut, ElectionUpdate, ElectionListResponse, ElectionStatus
from services.csv_handler import CSVHandler
from services.notification import NotificationService
from schemas.notification import ElectionNotificationData
from sqlalchemy import func

router = APIRouter(prefix="/election", tags=["elections"])


async def _get_actual_candidate_count(election_id: int, db) -> int:
    """Get the actual count of candidates for an election from the participation table"""
    result = await db.execute(
        select(func.count(CandidateParticipation.candidate_hashed_national_id))
        .where(CandidateParticipation.election_id == election_id)
    )
    return result.scalar() or 0


async def _sync_election_candidate_count(election: Election, db) -> None:
    """Sync the election's candidate count with the actual count from participations"""
    actual_count = await _get_actual_candidate_count(election.id, db)
    election.number_of_candidates = actual_count


@router.get("/", response_model=list[ElectionOut])
async def get_all_elections(
    db: db_dependency,
    current_user: organization_dependency
):
    # Only return elections from the current user's organization
    result = await db.execute(
        select(Election).where(Election.organization_id == current_user.id)
    )
    elections = result.scalars().all()
    return elections


@router.get("/organization", response_model=List[ElectionListResponse])
async def get_organization_elections(
    db: db_dependency,
    current_user: organization_dependency,
    search: Optional[str] = Query(None, description="Search by election title"),
    status_filter: Optional[ElectionStatus] = Query(None, description="Filter by computed status (upcoming, running, finished)"),
    election_type: Optional[str] = Query(None, description="Filter by election type"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get elections for the authenticated organization with search and filtering"""
    
    # Base query for organization's elections
    query = select(Election).where(Election.organization_id == current_user.id)
    
    # Apply search filter if provided
    if search:
        query = query.where(Election.title.ilike(f"%{search}%"))
    
    # Apply election type filter if provided
    if election_type:
        query = query.where(Election.types == election_type)
    
    # Execute query
    result = await db.execute(query.offset(offset).limit(limit).order_by(Election.created_at.desc()))
    elections = result.scalars().all()
    
    # Transform to response format with computed status
    from datetime import timezone
    now = datetime.now(timezone.utc)
    response_elections = []
    
    for election in elections:
        # Compute status based on dates
        if now < election.starts_at:
            computed_status = ElectionStatus.UPCOMING
        elif now >= election.starts_at and now <= election.ends_at:
            computed_status = ElectionStatus.RUNNING
        else:
            computed_status = ElectionStatus.FINISHED
        
        # Apply status filter if provided
        if status_filter and computed_status != status_filter:
            continue
            
        response_elections.append(ElectionListResponse(
            id=election.id,
            title=election.title,
            types=election.types,
            status=election.status,
            computed_status=computed_status,
            starts_at=election.starts_at,
            ends_at=election.ends_at,
            created_at=election.created_at,
            total_vote_count=election.total_vote_count,
            number_of_candidates=election.number_of_candidates,
            potential_number_of_voters=election.potential_number_of_voters,
            num_of_votes_per_voter=election.num_of_votes_per_voter,
            method=election.method
        ))
    
    return response_elections


@router.get("/{election_id}", response_model=ElectionOut)
async def get_specific_election(
    election_id: int, 
    db: db_dependency,
    current_user: organization_dependency
):
    # Only allow access to elections from the current user's organization
    result = await db.execute(
        select(Election)
        .where(Election.id == election_id)
        .where(Election.organization_id == current_user.id)
    )
    election = result.scalar_one_or_none()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return election


async def _create_candidates_from_data(
    candidates_data: list[dict], election_id: int, organization_id: int, db
) -> list[Candidate]:
    """Helper function to create candidates and their participations"""
    created_candidates = []

    for candidate_data in candidates_data:
        # Check if candidate already exists
        result = await db.execute(
            select(Candidate).where(Candidate.hashed_national_id == candidate_data["hashed_national_id"])
        )
        existing_candidate = result.scalar_one_or_none()

        if existing_candidate:
            candidate = existing_candidate
        else:
            # Create new candidate
            candidate = Candidate(
                hashed_national_id=candidate_data["hashed_national_id"],
                name=candidate_data["name"],
                district=candidate_data.get("district"),
                governorate=candidate_data.get("governorate"),
                country=Country(candidate_data["country"]),
                party=candidate_data.get("party"),
                symbol_name=candidate_data.get("symbol_name"),
                symbol_icon_url=candidate_data.get("symbol_icon_url"),
                photo_url=candidate_data.get("photo_url"),
                birth_date=candidate_data["birth_date"],
                description=candidate_data.get("description"),
                organization_id=organization_id,
            )
            db.add(candidate)
            created_candidates.append(candidate)

        # Create candidate participation in election
        participation = CandidateParticipation(
            candidate_hashed_national_id=candidate.hashed_national_id, election_id=election_id
        )
        db.add(participation)

    return created_candidates


async def _create_voters_from_data(voters_data: list[dict], election_id: int, db) -> list[Voter]:
    """Helper function to create voters"""
    created_voters = []

    for voter_data in voters_data:
        voter = Voter(
            voter_hashed_national_id=voter_data["voter_hashed_national_id"],
            phone_number=voter_data["phone_number"],
            governerate=voter_data.get("governorate"),
            election_id=election_id,
        )
        db.add(voter)
        created_voters.append(voter)

    return created_voters


@router.post("/", response_model=ElectionOut, status_code=201)
async def create_election(election_data: ElectionCreate, db: db_dependency, current_user: organization_dependency):
    """Create election with optional candidates and voters"""
    if election_data.ends_at <= election_data.starts_at:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    # Use the organization ID from the authenticated user
    organization_id = current_user.id

    # Create the election
    new_election = Election(
        title=election_data.title,
        types=election_data.types,
        organization_id=organization_id,
        starts_at=election_data.starts_at,
        ends_at=election_data.ends_at,
        num_of_votes_per_voter=election_data.num_of_votes_per_voter,
        potential_number_of_voters=election_data.potential_number_of_voters,
        method=election_data.method.value,
        api_endpoint=election_data.api_endpoint,
        status="upcoming",
    )

    db.add(new_election)
    await db.flush()  # Flush to get the election ID

    # Handle candidates if provided
    candidates_count = 0
    if election_data.candidates:
        candidates_data = [candidate.model_dump() for candidate in election_data.candidates]
        await _create_candidates_from_data(candidates_data, new_election.id, organization_id, db)

    # Handle voters if provided
    voters_count = 0
    if election_data.voters:
        voters_data = [voter.model_dump() for voter in election_data.voters]
        await _create_voters_from_data(voters_data, new_election.id, db)
        voters_count = len(voters_data)

    # Sync election counts with actual data
    await _sync_election_candidate_count(new_election, db)
    if voters_count > 0:
        new_election.potential_number_of_voters = voters_count

    await db.commit()
    await db.refresh(new_election)
    
    # Create notification for election creation
    notification_service = NotificationService(db)
    election_notification_data = ElectionNotificationData(
        election_id=new_election.id,
        election_title=new_election.title,
        start_time=new_election.starts_at,
        end_time=new_election.ends_at
    )
    await notification_service.create_election_created_notification(
        organization_id=organization_id,
        election_data=election_notification_data
    )
    
    return new_election


@router.put("/{election_id}", response_model=ElectionOut)
async def update_election(election_id: int, election_data: ElectionUpdate, db: db_dependency, current_user: organization_dependency):
    result = await db.execute(select(Election).where(Election.id == election_id, Election.organization_id == current_user.id))
    election = result.scalar_one_or_none()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Only allow editing upcoming elections
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    if not (now < election.starts_at):
        raise HTTPException(status_code=400, detail="Only upcoming elections can be edited")

    if election_data.starts_at and election_data.ends_at:
        if election_data.ends_at <= election_data.starts_at:
            raise HTTPException(status_code=400, detail="End date must be after start date")
    elif (
        election_data.starts_at
        and election.ends_at <= election_data.starts_at
        or election_data.ends_at
        and election_data.ends_at <= election.starts_at
    ):
        raise HTTPException(status_code=400, detail="End date must be after start date")

    # Check if election type is changing and validate CSV compatibility
    if election_data.types and election_data.types != election.types and election.method == "csv":
        await _validate_type_change_compatibility(db, election, election_data.types)

    # Track changes for notification
    update_data = election_data.model_dump(exclude_unset=True)
    changes_made = list(update_data.keys())
    
    for field, value in update_data.items():
        setattr(election, field, value)

    await db.commit()
    await db.refresh(election)
    
    # TODO: Create notification for election update (temporarily disabled due to async issues)
    # if changes_made:
    #     notification_service = NotificationService(db)
    #     election_notification_data = ElectionNotificationData(
    #         election_id=election.id,
    #         election_title=election.title,
    #         start_time=election.starts_at,
    #         end_time=election.ends_at
    #     )
    #     await notification_service.create_election_updated_notification(
    #         organization_id=current_user.id,
    #         election_data=election_notification_data,
    #         changes_made=changes_made
    #     )
    
    return election


@router.delete("/{election_id}", status_code=204)
async def delete_election(election_id: int, db: db_dependency, current_user: organization_dependency):
    """
    Delete an election and all its associated records (candidates, voters, voting processes, notifications).
    Only allows deletion of upcoming elections.
    """
    result = await db.execute(select(Election).where(Election.id == election_id, Election.organization_id == current_user.id))
    election = result.scalar_one_or_none()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Only allow deleting upcoming elections
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    if not (now < election.starts_at):
        raise HTTPException(status_code=400, detail="Only upcoming elections can be deleted")

    # Store election info for notification before deletion
    election_title = election.title
    election_id_for_notification = election.id
    
    try:
        # Manually delete all related records to avoid CASCADE issues
        
        # 1. Delete candidate participations
        from models.candidate_participation import CandidateParticipation
        participations_result = await db.execute(
            select(CandidateParticipation).where(CandidateParticipation.election_id == election_id)
        )
        participations = participations_result.scalars().all()
        for participation in participations:
            await db.delete(participation)
        
        # 2. Delete voters
        voters_result = await db.execute(select(Voter).where(Voter.election_id == election_id))
        voters = voters_result.scalars().all()
        for voter in voters:
            await db.delete(voter)
        
        # 3. Delete voting processes
        from models.voting_process import VotingProcess
        voting_processes_result = await db.execute(select(VotingProcess).where(VotingProcess.election_id == election_id))
        voting_processes = voting_processes_result.scalars().all()
        for voting_process in voting_processes:
            await db.delete(voting_process)
        
        # 4. Delete notifications related to this election
        from models.notification import Notification
        notifications_result = await db.execute(select(Notification).where(Notification.election_id == election_id))
        notifications = notifications_result.scalars().all()
        for notification in notifications:
            await db.delete(notification)
        
        # 5. Create notification before deleting the election
        try:
            notification_service = NotificationService(db)
            await notification_service.create_election_deleted_notification(
                organization_id=current_user.id,
                election_title=election_title,
                election_id=None  # Set to None since election will be deleted
            )
        except Exception as notification_error:
            print(f"Warning: Failed to create deletion notification: {notification_error}")
        
        # 6. Finally delete the election itself
        await db.delete(election)
        
        # Commit all deletions and the notification
        await db.commit()
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete election: {str(e)}")


@router.put("/{election_id}/replace-csv", response_model=ElectionOut)
async def replace_election_csv_data(
    election_id: int,
    db: db_dependency,
    current_user: organization_dependency,
    title: str = Form(...),
    types: str = Form(...),
    starts_at: str = Form(...),
    ends_at: str = Form(...),
    potential_number_of_voters: int = Form(...),
    candidates_file: UploadFile = File(...),
    voters_file: UploadFile = File(...),
    num_of_votes_per_voter: int = Form(1)
):
    """Replace election's CSV data (candidates and voters) with new files"""
    
    # Get the election
    result = await db.execute(select(Election).where(Election.id == election_id, Election.organization_id == current_user.id))
    election = result.scalar_one_or_none()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Only allow editing upcoming elections
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    if not (now < election.starts_at):
        raise HTTPException(status_code=400, detail="Only upcoming elections can be edited")

    # Validate that this is a CSV-based election
    if election.method != "csv":
        raise HTTPException(status_code=400, detail="CSV replacement is only available for CSV-based elections")

    # Parse dates
    try:
        starts_at_dt = datetime.fromisoformat(starts_at.replace('Z', '+00:00'))
        ends_at_dt = datetime.fromisoformat(ends_at.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    if ends_at_dt <= starts_at_dt:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    # Validate file types
    if not candidates_file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Candidates file must be a CSV")
    if not voters_file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Voters file must be a CSV")

    try:
        # Step 1: Delete existing candidates and voters for this election
        # Delete candidate participations
        from models.candidate_participation import CandidateParticipation
        participations_result = await db.execute(
            select(CandidateParticipation).where(CandidateParticipation.election_id == election_id)
        )
        participations = participations_result.scalars().all()
        for participation in participations:
            await db.delete(participation)
        
        # Delete voters
        voters_result = await db.execute(select(Voter).where(Voter.election_id == election_id))
        voters = voters_result.scalars().all()
        for voter in voters:
            await db.delete(voter)
        
        # Delete voting processes
        from models.voting_process import VotingProcess
        voting_processes_result = await db.execute(select(VotingProcess).where(VotingProcess.election_id == election_id))
        voting_processes = voting_processes_result.scalars().all()
        for voting_process in voting_processes:
            await db.delete(voting_process)

        # Step 2: Update election basic info
        election.title = title
        election.types = types
        election.starts_at = starts_at_dt
        election.ends_at = ends_at_dt
        election.num_of_votes_per_voter = num_of_votes_per_voter
        election.potential_number_of_voters = potential_number_of_voters

        # Step 3: Process new CSV files
        import pandas as pd
        import io
        
        # Read candidates CSV
        candidates_content = await candidates_file.read()
        candidates_df = pd.read_csv(io.StringIO(candidates_content.decode('utf-8')))
        
        # Read voters CSV
        voters_content = await voters_file.read()
        voters_df = pd.read_csv(io.StringIO(voters_content.decode('utf-8')))
        
        # Validate required columns based on election type
        await _validate_csv_columns(candidates_df, voters_df, types)
        
        # Create new candidates and voters
        candidates_count = await _create_candidates_from_csv(db, election_id, current_user.id, candidates_df)
        voters_count = await _create_voters_from_csv(db, election_id, voters_df)
        
        # Sync election counts with actual data
        await _sync_election_candidate_count(election, db)
        election.potential_number_of_voters = voters_count
        
        await db.commit()
        await db.refresh(election)
        
        # TODO: Create notification for election update (temporarily disabled due to async issues)
        # try:
        #     notification_service = NotificationService(db)
        #     election_notification_data = ElectionNotificationData(
        #         election_id=election.id,
        #         election_title=election.title,
        #         start_time=election.starts_at,
        #         end_time=election.ends_at
        #     )
        #     await notification_service.create_election_updated_notification(
        #         organization_id=current_user.id,
        #         election_data=election_notification_data,
        #         changes_made=["csv_data_replaced", "candidates", "voters"]
        #     )
        # except Exception as notification_error:
        #     print(f"Warning: Failed to create update notification: {notification_error}")
        
        return election
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error processing CSV files: {str(e)}")


@router.post("/{election_id}/candidates/csv", status_code=201)
async def upload_candidates_csv(
    election_id: int, db: db_dependency, current_user: organization_dependency, file: UploadFile = File(...)
):
    """Upload candidates for an election via CSV file"""
    # Verify election exists and belongs to organization
    result = await db.execute(select(Election).where(Election.id == election_id))
    election = result.scalar_one_or_none()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    if election.organization_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this election")

    # Process CSV file
    candidates_data = await CSVHandler.process_candidates_csv(file)

    # Create candidates
    await _create_candidates_from_data(candidates_data, election_id, current_user.id, db)

    # Sync candidate count with actual data
    await _sync_election_candidate_count(election, db)

    await db.commit()
    return {"message": f"Successfully added {len(candidates_data)} candidates"}


@router.post("/{election_id}/voters/csv", status_code=201)
async def upload_voters_csv(
    election_id: int, db: db_dependency, current_user: organization_dependency, file: UploadFile = File(...)
):
    """Upload voters for an election via CSV file"""
    # Verify election exists and belongs to organization
    result = await db.execute(select(Election).where(Election.id == election_id))
    election = result.scalar_one_or_none()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    if election.organization_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this election")

    # Process CSV file
    voters_data = await CSVHandler.process_voters_csv(file)

    # Create voters
    await _create_voters_from_data(voters_data, election_id, db)

    # Update voter count
    election.potential_number_of_voters += len(voters_data)

    await db.commit()
    return {"message": f"Successfully added {len(voters_data)} voters"}


@router.get("/templates/candidates-csv")
async def get_candidates_csv_template():
    """Get CSV template for candidates upload"""
    return {"template": CSVHandler.get_candidates_csv_template()}


@router.get("/templates/voters-csv")
async def get_voters_csv_template():
    """Get CSV template for voters upload"""
    return {"template": CSVHandler.get_voters_csv_template()}


@router.post("/create-with-csv", response_model=ElectionOut, status_code=201)
async def create_election_with_csv(
    db: db_dependency,
    current_user: organization_dependency,
    title: str = Form(...),
    types: str = Form(...),
    starts_at: str = Form(...),
    ends_at: str = Form(...),
    potential_number_of_voters: int = Form(...),
    candidates_file: UploadFile = File(...),
    voters_file: UploadFile = File(...),
    num_of_votes_per_voter: int = Form(1)
):
    """Create election with CSV files for candidates and voters"""
    from datetime import datetime
    import pandas as pd
    import io
    
    # Parse dates
    try:
        starts_at_dt = datetime.fromisoformat(starts_at.replace('Z', '+00:00'))
        ends_at_dt = datetime.fromisoformat(ends_at.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    if ends_at_dt <= starts_at_dt:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    # Validate file types
    if not candidates_file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Candidates file must be a CSV")
    if not voters_file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Voters file must be a CSV")

    organization_id = current_user.id

    # Create the election
    new_election = Election(
        title=title,
        types=types,
        organization_id=organization_id,
        starts_at=starts_at_dt,
        ends_at=ends_at_dt,
        num_of_votes_per_voter=num_of_votes_per_voter,
        potential_number_of_voters=potential_number_of_voters,
        method="csv",
        api_endpoint=None,
        status="upcoming",  # Always start as upcoming, computed status will override this
    )

    db.add(new_election)
    await db.flush()

    # Process CSV files
    try:
        # Read candidates CSV
        candidates_content = await candidates_file.read()
        candidates_df = pd.read_csv(io.StringIO(candidates_content.decode('utf-8')))
        
        # Read voters CSV
        voters_content = await voters_file.read()
        voters_df = pd.read_csv(io.StringIO(voters_content.decode('utf-8')))
        
        # Validate required columns based on election type
        await _validate_csv_columns(candidates_df, voters_df, types)
        
        # Create candidates and voters
        candidates_count = await _create_candidates_from_csv(db, new_election.id, organization_id, candidates_df)
        voters_count = await _create_voters_from_csv(db, new_election.id, voters_df)
        
        # Update election with actual counts
        new_election.number_of_candidates = candidates_count
        new_election.potential_number_of_voters = voters_count
        
        await db.commit()
        await db.refresh(new_election)
        
        # Create notification for election creation
        notification_service = NotificationService(db)
        election_notification_data = ElectionNotificationData(
            election_id=new_election.id,
            election_title=new_election.title,
            start_time=new_election.starts_at,
            end_time=new_election.ends_at
        )
        await notification_service.create_election_created_notification(
            organization_id=organization_id,
            election_data=election_notification_data
        )
        
        return new_election
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error processing CSV files: {str(e)}")


async def _validate_csv_columns(candidates_df, voters_df, election_type):
    """Validate that CSV files have required columns based on election type"""
    
    # Required columns for candidates
    required_candidate_cols = ['hashed_national_id', 'name', 'country', 'birth_date']
    if election_type == 'district_based':
        required_candidate_cols.append('district')
    elif election_type == 'governorate_based':
        required_candidate_cols.append('governorate')
    
    # Required columns for voters
    required_voter_cols = ['voter_hashed_national_id', 'phone_number']
    if election_type == 'district_based':
        required_voter_cols.append('district')
    elif election_type == 'governorate_based':
        required_voter_cols.append('governorate')
    
    # Check candidates columns
    missing_candidate_cols = [col for col in required_candidate_cols if col not in candidates_df.columns]
    if missing_candidate_cols:
        raise ValueError(f"Missing required columns in candidates CSV: {missing_candidate_cols}")
    
    # Check voters columns
    missing_voter_cols = [col for col in required_voter_cols if col not in voters_df.columns]
    if missing_voter_cols:
        raise ValueError(f"Missing required columns in voters CSV: {missing_voter_cols}")


async def _validate_type_change_compatibility(db, election, new_election_type):
    """
    Validate that changing election type is compatible with existing CSV data.
    Raises HTTPException if CSV files need to be replaced.
    """
    # Get current type requirements
    current_type = election.types
    
    # Determine what additional columns are needed for the new type
    def get_required_additional_columns(election_type):
        if election_type == 'district_based':
            return {'candidates': ['district'], 'voters': ['district']}
        elif election_type == 'governorate_based':
            return {'candidates': ['governorate'], 'voters': ['governorate']}
        else:  # simple or api_managed
            return {'candidates': [], 'voters': []}
    
    current_requirements = get_required_additional_columns(current_type)
    new_requirements = get_required_additional_columns(new_election_type)
    
    # Check if new type requires additional columns that current type doesn't have
    additional_candidate_cols = set(new_requirements['candidates']) - set(current_requirements['candidates'])
    additional_voter_cols = set(new_requirements['voters']) - set(current_requirements['voters'])
    
    if additional_candidate_cols or additional_voter_cols:
        # Check if we have any candidates or voters in the election
        from models.candidate_participation import CandidateParticipation
        candidates_result = await db.execute(
            select(CandidateParticipation).where(CandidateParticipation.election_id == election.id)
        )
        has_candidates = len(candidates_result.scalars().all()) > 0
        
        voters_result = await db.execute(select(Voter).where(Voter.election_id == election.id))
        has_voters = len(voters_result.scalars().all()) > 0
        
        if has_candidates or has_voters:
            # Build error message
            error_parts = []
            if additional_candidate_cols:
                error_parts.append(f"candidates CSV must include columns: {', '.join(additional_candidate_cols)}")
            if additional_voter_cols:
                error_parts.append(f"voters CSV must include columns: {', '.join(additional_voter_cols)}")
            
            error_message = f"Cannot change election type from '{current_type}' to '{new_election_type}' because existing CSV data is incompatible. " + \
                          f"To change to '{new_election_type}' type, the {' and '.join(error_parts)}. " + \
                          "Please upload new CSV files that include the required columns."
            
            raise HTTPException(
                status_code=400, 
                detail={
                    "error": "csv_compatibility_error",
                    "message": error_message,
                    "current_type": current_type,
                    "new_type": new_election_type,
                    "required_csv_replacement": True,
                    "missing_candidate_columns": list(additional_candidate_cols),
                    "missing_voter_columns": list(additional_voter_cols)
                }
            )


async def _create_candidates_from_csv(db, election_id, organization_id, candidates_df):
    """Create candidates from CSV data and link them to the election via participations.

    Returns the number of participations created for this election (used as election.number_of_candidates).
    """
    from datetime import datetime
    from models.candidate_participation import CandidateParticipation

    participations_created = 0

    for idx, row in candidates_df.iterrows():
        try:
            # Parse birth_date
            birth_date = datetime.fromisoformat(str(row['birth_date']).replace('Z', '+00:00'))

            hashed_id = str(row['hashed_national_id'])

            # Check if candidate exists
            existing = await db.execute(select(Candidate).where(Candidate.hashed_national_id == hashed_id))
            candidate = existing.scalar_one_or_none()

            if not candidate:
                candidate = Candidate(
                    hashed_national_id=hashed_id,
                    name=str(row['name']),
                    district=str(row.get('district', '')) if pd.notna(row.get('district')) else None,
                    governorate=str(row.get('governorate', '')) if pd.notna(row.get('governorate')) else None,
                    country=str(row['country']),
                    party=str(row.get('party', '')) if pd.notna(row.get('party')) else None,
                    symbol_name=str(row.get('symbol_name', '')) if pd.notna(row.get('symbol_name')) else None,
                    birth_date=birth_date,
                    description=str(row.get('description', '')) if pd.notna(row.get('description')) else None,
                    organization_id=organization_id,
                )
                db.add(candidate)

            # Create participation if not exists
            existing_p = await db.execute(
                select(CandidateParticipation).where(
                    CandidateParticipation.candidate_hashed_national_id == candidate.hashed_national_id,
                    CandidateParticipation.election_id == election_id,
                )
            )
            if existing_p.scalar_one_or_none() is None:
                db.add(
                    CandidateParticipation(
                        candidate_hashed_national_id=candidate.hashed_national_id,
                        election_id=election_id,
                    )
                )
                participations_created += 1

        except Exception as e:
            raise ValueError(f"Error processing candidate row {idx + 1}: {str(e)}")

    return participations_created


async def _create_voters_from_csv(db, election_id, voters_df):
    """Create voters from CSV data"""
    
    voters_count = 0
    for _, row in voters_df.iterrows():
        try:
            # Handle both 'district' and 'governorate' columns - store in governerate field
            location_value = None
            if 'district' in voters_df.columns and pd.notna(row.get('district')):
                location_value = str(row['district'])
            elif 'governorate' in voters_df.columns and pd.notna(row.get('governorate')):
                location_value = str(row['governorate'])
            
            voter = Voter(
                voter_hashed_national_id=str(row['voter_hashed_national_id']),
                phone_number=str(row['phone_number']),
                governerate=location_value,
                election_id=election_id
            )
            db.add(voter)
            voters_count += 1
            
        except Exception as e:
            raise ValueError(f"Error processing voter row {voters_count + 1}: {str(e)}")
    
    return voters_count
