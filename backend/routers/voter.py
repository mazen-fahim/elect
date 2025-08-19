from datetime import datetime, timedelta, timezone
import random
import os
from twilio.rest import Client
import hashlib
import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from core.dependencies import db_dependency, get_twilio_client
from models.voter import Voter
from twilio.http.async_http_client import AsyncTwilioHttpClient  # Add this import
from schemas.voter import VoterCreate, VoterOut, VoterUpdate

router = APIRouter(prefix="/voters", tags=["voters"])


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
    return voter


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

    for field, value in voter_data.model_dump(exclude_unset=True).items():
        setattr(voter, field, value)

    await db.commit()
    await db.refresh(voter)
    # Set election title after refresh to avoid expired ORM issues
    voter.election_title = voter.election.title
    return voter


def _hash_identifier(value: str) -> str:
    return hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()

# Improved voter OTP request endpoint with security and consistency
logger = logging.getLogger(__name__)

@router.post("/login/request-otp",
    response_model=Dict[str, Any],
    responses={
        200: {"description": "OTP processed successfully"},
        400: {"description": "Invalid request parameters"},
        429: {"description": "Too many OTP requests"},
        500: {"description": "Internal server error"}
    }
)
async def request_voter_otp(
    election_id: int,
    phone_number: str,
    db: db_dependency,
    twilio_client: Client = Depends(get_twilio_client),  # Proper dependency injection
    voter_hashed_national_id: str | None = None,
    national_id: str | None = None,
    email: str | None = None,
    id: str | None = None,
):
    """
    Request OTP for voter login with improved security and consistency.
    """
    # Validate phone number format
    if not (phone_number.startswith('+') and phone_number[1:].isdigit() and len(phone_number) > 8):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number must be in valid E.164 format"
        )

    # Resolve voter identifier
    try:
        if not voter_hashed_national_id:
            if national_id:
                voter_hashed_national_id = _hash_identifier(national_id)
            elif email:
                voter_hashed_national_id = _hash_identifier(email)
            elif id:
                voter_hashed_national_id = id if len(id) >= 32 else _hash_identifier(id)
            else:
                raise ValueError("Missing voter identifier")
    except Exception as e:
        logger.warning(f"Invalid voter identifier: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid voter identifier"
        )

    # Database operations
    async with db.begin():
        try:
            result = await db.execute(
                select(Voter).where(
                    Voter.voter_hashed_national_id == voter_hashed_national_id, 
                    Voter.election_id == election_id
                )
            )
            voter = result.scalar_one_or_none()
            
            if not voter:
                voter = Voter(
                    voter_hashed_national_id=voter_hashed_national_id, 
                    phone_number=phone_number, 
                    election_id=election_id
                )
                db.add(voter)
            else:
                # Rate limiting: 3 minutes between OTP requests
                if voter.otp_code and voter.otp_expires_at > datetime.now(timezone.utc):
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Please wait before requesting a new OTP"
                    )
                voter.phone_number = phone_number
                voter.is_verified = False

            # Generate 6-digit OTP
            code = f"{random.randint(100000, 999999)}"
            voter.otp_code = code
            voter.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=3)
            await db.commit()
            logger.info(f"OTP generated for {voter_hashed_national_id[:8]}...")
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Database error: {str(e)}")
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to process OTP request"
            )

    # Send SMS
    sms_status = {"status": "not_attempted"}
    try:
        message = await twilio_client.messages.create_async(
            body=f"Your voting OTP is {code}. Valid for 3 minutes.",
            from_=os.getenv("TWILIO_PHONE_NUMBER"),
            to=phone_number
        )
        sms_status = {
            "status": message.status,
            "sid": message.sid,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        logger.info(f"SMS sent to {phone_number}")
    except Exception as e:
        logger.error(f"SMS failed to {phone_number}: {str(e)}")
        sms_status = {
            "status": "failed",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    return {
        "message": "OTP generated successfully",
        "expires_in_minutes": 3,
        "sms_status": sms_status
    }