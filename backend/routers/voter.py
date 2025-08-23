from datetime import datetime, timedelta, timezone
import random
from twilio.rest import Client
import hashlib
import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.future import select
from sqlalchemy import and_
from sqlalchemy.orm import selectinload

from core.dependencies import db_dependency, get_twilio_client
from core.settings import settings
from core.shared import hash_national_id
from models.voter import Voter
from models.voting_process import VotingProcess
from models.election import Election
from twilio.http.async_http_client import AsyncTwilioHttpClient  # Add this import
from schemas.voter import VoterCreate, VoterOut, VoterUpdate
from services.api_election_service import APIElectionService

router = APIRouter(prefix="/voters", tags=["voters"])

# Initialize logger
logger = logging.getLogger(__name__)


@router.post(
    "/",
    response_model=VoterOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new voter",
    description="Registers a new voter for a specific election",
    responses={
        status.HTTP_201_CREATED: {
            "description": "Voter registered successfully",
            "content": {
                "application/json": {
                    "example": {
                        "voter_hashed_national_id": "a1b2c3d4...",
                        "election_id": 1,
                        "election_title": "Annual Board Election",
                        "has_voted": False,
                        "created_at": "2023-01-01T00:00:00",
                    }
                }
            },
        },
        status.HTTP_400_BAD_REQUEST: {
            "description": "Invalid request",
            "content": {
                "application/json": {
                    "examples": {
                        "duplicate_voter": {"value": {"detail": "Voter already registered for this election"}},
                        "invalid_election": {"value": {"detail": "Election does not exist or is not active"}},
                    }
                }
            },
        },
    },
)
async def create_voter(voter_data: VoterCreate, db: db_dependency):
    # Check if voter already exists
    result = await db.execute(
        select(Voter).where(
            Voter.voter_hashed_national_id == voter_data.voter_hashed_national_id,
            Voter.election_id == voter_data.election_id,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Voter already registered for this election"
        )

    new_voter = Voter(**voter_data.model_dump())
    db.add(new_voter)
    await db.commit()
    await db.refresh(new_voter)

    # Include election title in response (after refresh to avoid expired ORM issues)
    voter_out = new_voter
    voter_out.election_title = new_voter.election.title
    return voter_out


@router.get("/{voter_id}", response_model=VoterOut)
async def get_voter(voter_id: str, election_id: int, db: db_dependency):
    result = await db.execute(
        select(Voter).where(Voter.voter_hashed_national_id == voter_id, Voter.election_id == election_id)
    )
    voter = result.scalar_one_or_none()
    if not voter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voter not found")

    voter.election_title = voter.election.title
    
    # Extract all attributes to avoid MissingGreenlet errors
    voter_data = {
        "voter_hashed_national_id": voter.voter_hashed_national_id,
        "election_id": voter.election_id,
        "election_title": voter.election_title,
        "has_voted": voter.has_voted,
        "created_at": voter.created_at
    }
    
    return voter_data


@router.patch(
    "/{voter_id}",
    response_model=VoterOut,
    summary="Update voter details",
    description="Updates specific voter information (e.g., has_voted status)",
    responses={
        status.HTTP_200_OK: {
            "description": "Voter updated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "voter_hashed_national_id": "a1b2c3d4...",
                        "election_id": 1,
                        "election_title": "Annual Board Election",
                        "has_voted": True,
                        "created_at": "2023-01-01T00:00:00",
                    }
                }
            },
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "Voter not found",
            "content": {"application/json": {"example": {"detail": "Voter not found"}}},
        },
        status.HTTP_400_BAD_REQUEST: {
            "description": "Invalid update request",
            "content": {
                "application/json": {"example": {"detail": "Cannot modify voter_hashed_national_id or election_id"}}
            },
        },
    },
)
async def update_voter(voter_id: str, election_id: int, voter_data: VoterUpdate, db: db_dependency):
    result = await db.execute(
        select(Voter).where(Voter.voter_hashed_national_id == voter_id, Voter.election_id == election_id)
    )
    voter = result.scalar_one_or_none()
    if not voter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voter not found")
    
    # Prevent modification of certain fields
    if any(field in voter_data.model_dump(exclude_unset=True) for field in ["voter_hashed_national_id", "election_id"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify voter_hashed_national_id or election_id"
        )

    # Update voter fields
    for field, value in voter_data.model_dump(exclude_unset=True).items():
        setattr(voter, field, value)
    
    await db.commit()
    await db.refresh(voter)
    
    # Set election title after refresh to avoid expired ORM object issues
    voter.election_title = voter.election.title
    
    # Extract all attributes to avoid MissingGreenlet errors
    voter_data = {
        "voter_hashed_national_id": voter.voter_hashed_national_id,
        "election_id": voter.election_id,
        "election_title": voter.election_title,
        "has_voted": voter.has_voted,
        "created_at": voter.created_at
    }
    
    return voter_data


def _hash_identifier(value: str) -> str:
    # Use centralized hashing function to ensure consistency
    return hash_national_id(value)


def _resolve_voter_identifier(
    voter_hashed_national_id: str | None = None,
    national_id: str | None = None,
    email: str | None = None,
    id: str | None = None,
) -> str:
    """
    Resolves and returns the voter's hashed ID from one of the provided identifiers.
    Raises HTTPException if no valid identifier is found.
    """
    try:
        if voter_hashed_national_id:
            return voter_hashed_national_id
        if national_id:
            return _hash_identifier(national_id)
        if email:
            return _hash_identifier(email)
        if id:
            # Assume if id is long enough, it's already a hash
            return id if len(id) >= 32 else _hash_identifier(id)

        raise ValueError("Missing voter identifier. Please provide one of: national_id, email, or id.")
    except ValueError as e:
        logger.warning(f"Voter identifier error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# Improved voter OTP request endpoint with security and consistency


@router.post(
    "/login/request-otp",
    response_model=Dict[str, Any],
    responses={
        200: {"description": "OTP processed successfully"},
        400: {"description": "Invalid request parameters"},
        404: {"description": "Voter not found for this election"},
        429: {"description": "Too many OTP requests"},
        500: {"description": "Internal server errorrrrrrr"},
    },
)
async def request_voter_otp(
    election_id: int,
    db: db_dependency,
    twilio_client: Client = Depends(get_twilio_client),  # Proper dependency injection
    voter_hashed_national_id: str | None = None,
    national_id: str | None = None,
    email: str | None = None,
    id: str | None = None,
    phone_number: str | None = None,  # Add phone_number parameter
):
    """
    Request OTP for voter login with improved security and consistency.
    Voter must already exist in the election's voter list to receive an OTP.
    """
    # Resolve voter identifier
    voter_hashed_id = _resolve_voter_identifier(
        voter_hashed_national_id, national_id, email, id
    )

    code = ""  # Define code to be accessible for SMS sending
    voter = None  # Initialize voter variable
    phone_number = None  # Initialize phone_number variable
    
    # Database operations
    try:
        # First, get the election to check if it's API-based
        election_result = await db.execute(
            select(Election).where(Election.id == election_id)
        )
        election = election_result.scalar_one_or_none()
        
        if not election:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Election not found"
            )
        
        # Check if this is an API-based election
        if election.method == "api" and election.api_endpoint:
            # Handle API-based election
            # Since the frontend now calls the dummy service directly, 
            # we just need to create/update the voter record and generate OTP
            api_service = APIElectionService(db)
            
            # For API elections, we need the national ID (not hashed) to call the org's API
            if not national_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="For API-based elections, please provide the national ID (not hashed)"
                )
            
            # The frontend has already verified the voter with the dummy service,
            # so we just need to create/update the voter record
            try:
                # Use the phone number provided by the frontend (from dummy service)
                if not phone_number:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Organization API did not provide phone number"
                    )
                
                # Create a minimal API response for voter creation
                # The actual verification was done by the frontend
                from schemas.api_election import VoterVerificationResponse, CandidateInfo
                
                # Create a minimal response - the frontend already verified eligibility
                api_response = VoterVerificationResponse(
                    is_eligible=True,
                    phone_number=phone_number,  # Use the phone number from frontend
                    eligible_candidates=[]  # Will be populated from dummy service
                )
                
                voter = await api_service.create_voter_from_api_response(
                    election_id, national_id, api_response
                )
                if not voter:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to create voter record from API response"
                    )
                phone_number = voter.phone_number
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error creating voter from API response: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to process voter information from organization API"
                )
        else:
            # Handle CSV-based election (existing logic)
            result = await db.execute(
                select(Voter).where(
                    Voter.voter_hashed_national_id == voter_hashed_id, Voter.election_id == election_id
                )
            )
            voter = result.scalar_one_or_none()

            if not voter:
                # Voter not found - they are not allowed to vote in this election
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, 
                    detail="Voter not found in our system for this election"
                )
            else:
                # Voter exists, use stored phone number
                if not voter.phone_number:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Voter does not have a phone number registered"
                    )
                phone_number = voter.phone_number
                
                # Rate limiting: 3 minutes between OTP requests
                if voter.otp_code and voter.otp_expires_at and voter.otp_expires_at > datetime.now(timezone.utc):
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Please wait before requesting a new OTP"
                    )
                voter.is_verified = False  # Reset verification status on new OTP request

        # Ensure phone_number is defined
        if not phone_number:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Phone number not available for OTP delivery"
            )

        # Ensure voter object is defined
        if not voter:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Voter object not available"
            )

        # Generate 6-digit OTP and set expiry
        code = f"{random.randint(100000, 999999)}"
        voter.otp_code = code
        voter.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=3)

        await db.commit()
        logger.info(f"OTP generated for {voter_hashed_id[:8]}...")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error during OTP request: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to process OTP request in database"
        )

    # Send SMS
    sms_status = {"status": "not_attempted"}
    try:
        message = await twilio_client.messages.create_async(
            body=f"Your voting OTP is {code}. Valid for 3 minutes.",
            from_=settings.TWILIO_PHONE_NUMBER,
            to=phone_number,
        )
        sms_status = {"status": message.status, "sid": message.sid, "timestamp": datetime.now(timezone.utc).isoformat()}
        logger.info(f"SMS sent to {phone_number}")
    except Exception as e:
        logger.error(f"SMS failed to {phone_number}: {str(e)}")
        sms_status = {"status": "failed", "error": str(e), "timestamp": datetime.now(timezone.utc).isoformat()}

    # For testing purposes, include OTP in response
    response_data = {"message": "OTP generated successfully", "expires_in_minutes": 3, "sms_status": sms_status}
    
    # Add OTP to response for testing (this should be removed in production)
    response_data["otp_code"] = code
    
    return response_data


@router.post(
    "/login/verify-otp",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Verify OTP for voter login",
    description="Verifies the OTP sent to the voter and marks them as verified.",
)
async def verify_voter_otp(
    election_id: int,
    code: str,
    db: db_dependency,
    voter_hashed_national_id: str | None = None,
    national_id: str | None = None,
    email: str | None = None,
    id: str | None = None,
):
    """
    Verify a previously issued OTP for a voter. One of voter_hashed_national_id, national_id, email, or id must be provided.
    """
    # Resolve voter identifier
    voter_hashed_id = _resolve_voter_identifier(
        voter_hashed_national_id, national_id, email, id
    )

    # Load voter
    result = await db.execute(
        select(Voter).where(
            Voter.voter_hashed_national_id == voter_hashed_id,
            Voter.election_id == election_id,
        )
    )
    voter = result.scalar_one_or_none()
    if not voter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voter not found")

    # Validate OTP
    now = datetime.now(timezone.utc)
    if not voter.otp_code or not voter.otp_expires_at or voter.otp_expires_at < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired or not requested")
    if voter.otp_code != code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP code")

    # Store values before commit to avoid expired ORM object issues
    voter_hashed_id = voter.voter_hashed_national_id
    election_id_value = voter.election_id
    
    # Check if voter has already voted in this election
    existing_vote_result = await db.execute(
        select(VotingProcess).where(
            and_(
                VotingProcess.voter_hashed_national_id == voter_hashed_id,
                VotingProcess.election_id == election_id_value
            )
        )
    )
    
    if existing_vote_result.scalar_one_or_none():
        # Voter has already voted, don't mark as verified
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already cast your vote on this election"
        )
    
    # Mark verified and clear OTP fields
    voter.is_verified = True
    voter.last_verified_at = now
    voter.otp_code = None
    voter.otp_expires_at = None

    await db.commit()

    return {
        "message": "OTP verified successfully",
        "voter_hashed_national_id": voter_hashed_id,
        "election_id": election_id_value,
        "redirect_to_voting": True
    }
