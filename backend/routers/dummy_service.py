from datetime import datetime, timezone
from typing import List, Optional, Annotated
import json
import hashlib
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.future import select
from sqlalchemy import and_
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import db_dependency, admin_dependency
from models.dummy_candidate import DummyCandidate
from models.dummy_voter import DummyVoter
from schemas.api_election import (
    VoterVerificationRequest,
    VoterVerificationResponse,
    CandidateInfo,
    DummyCandidateCreate,
    DummyVoterCreate,
    DummyCandidateOut,
    DummyVoterOut
)

router = APIRouter(prefix="/dummy-service", tags=["dummy-service"])


def _hash_identifier(value: str) -> str:
    """Hash a national ID to create a hashed identifier"""
    return hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()


@router.post("/verify-voter", response_model=VoterVerificationResponse)
async def verify_voter_eligibility(
    request: VoterVerificationRequest,
    db: db_dependency,
    _: admin_dependency
):
    """
    Dummy service endpoint that simulates an organization's voter verification API.
    This endpoint checks if a voter exists in our dummy database and returns their eligibility.
    """
    try:
        # Hash the national ID for lookup
        hashed_id = _hash_identifier(request.voter_national_id)
        
        # Look up voter in the specific election
        voter_result = await db.execute(
            select(DummyVoter).where(
                and_(
                    DummyVoter.voter_hashed_national_id == hashed_id,
                    DummyVoter.election_id == request.election_id
                )
            )
        )
        voter = voter_result.scalar_one_or_none()
        
        if not voter:
            return VoterVerificationResponse(
                is_eligible=False,
                error_message="Voter not found in our system for this election"
            )
        
        # Get eligible candidates for this voter in this election
        eligible_candidates = []
        if voter.eligible_candidates:
            candidate_ids = json.loads(voter.eligible_candidates)
            candidates_result = await db.execute(
                select(DummyCandidate).where(
                    and_(
                        DummyCandidate.hashed_national_id.in_(candidate_ids),
                        DummyCandidate.election_id == request.election_id
                    )
                )
            )
            candidates = candidates_result.scalars().all()
            
            # Convert to CandidateInfo objects
            for candidate in candidates:
                eligible_candidates.append(CandidateInfo(
                    hashed_national_id=candidate.hashed_national_id,
                    name=candidate.name,
                    district=candidate.district,
                    governorate=candidate.governorate,
                    country=candidate.country,
                    party=candidate.party,
                    symbol_icon_url=candidate.symbol_icon_url,
                    symbol_name=candidate.symbol_name,
                    photo_url=candidate.photo_url,
                    birth_date=candidate.birth_date.isoformat() if candidate.birth_date else None,
                    description=candidate.description
                ))
        
        return VoterVerificationResponse(
            is_eligible=True,
            phone_number=voter.phone_number,
            eligible_candidates=eligible_candidates
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying voter: {str(e)}"
        )


@router.post("/candidates", response_model=DummyCandidateOut, status_code=status.HTTP_201_CREATED)
async def create_dummy_candidate(
    candidate_data: DummyCandidateCreate,
    db: db_dependency,
    _: admin_dependency
):
    """Create a dummy candidate for testing"""
    try:
        # Parse birth date if provided
        birth_date = None
        if candidate_data.birth_date:
            birth_date = datetime.fromisoformat(candidate_data.birth_date.replace("Z", "+00:00"))
        
        # Hash the national ID before storing
        hashed_national_id = _hash_identifier(candidate_data.hashed_national_id)
        
        # Check if candidate already exists
        existing_result = await db.execute(
            select(DummyCandidate).where(DummyCandidate.hashed_national_id == hashed_national_id)
        )
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Candidate with this ID already exists"
            )
        
        # Create new candidate
        new_candidate = DummyCandidate(
            hashed_national_id=hashed_national_id,
            name=candidate_data.name,
            district=candidate_data.district,
            governorate=candidate_data.governorate,
            country=candidate_data.country,
            party=candidate_data.party,
            symbol_icon_url=candidate_data.symbol_icon_url,
            symbol_name=candidate_data.symbol_name,
            photo_url=candidate_data.photo_url,
            birth_date=birth_date,
            description=candidate_data.description,
            election_id=candidate_data.election_id
        )
        
        db.add(new_candidate)
        await db.commit()
        await db.refresh(new_candidate)
        
        return DummyCandidateOut(
            hashed_national_id=new_candidate.hashed_national_id,
            name=new_candidate.name,
            district=new_candidate.district,
            governorate=new_candidate.governorate,
            country=new_candidate.country,
            party=new_candidate.party,
            symbol_icon_url=new_candidate.symbol_icon_url,
            symbol_name=new_candidate.symbol_name,
            photo_url=new_candidate.photo_url,
            birth_date=new_candidate.birth_date.isoformat() if new_candidate.birth_date else None,
            description=new_candidate.description,
            created_at=new_candidate.created_at.isoformat(),
            election_id=new_candidate.election_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating candidate: {str(e)}"
        )


@router.post("/voters", response_model=DummyVoterOut, status_code=status.HTTP_201_CREATED)
async def create_dummy_voter(
    voter_data: DummyVoterCreate,
    db: db_dependency,
    _: admin_dependency
):
    """Create a dummy voter for testing"""
    try:
        # Hash the national ID before storing
        hashed_id = _hash_identifier(voter_data.voter_hashed_national_id)
        
        # Check if voter already exists
        existing_result = await db.execute(
            select(DummyVoter).where(DummyVoter.voter_hashed_national_id == hashed_id)
        )
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voter with this ID already exists"
            )
        
        # Create new voter
        new_voter = DummyVoter(
            voter_hashed_national_id=hashed_id,
            phone_number=voter_data.phone_number,
            governerate=voter_data.governerate,
            district=voter_data.district,
            eligible_candidates=json.dumps(voter_data.eligible_candidates) if voter_data.eligible_candidates else None,
            election_id=voter_data.election_id
        )
        
        db.add(new_voter)
        await db.commit()
        await db.refresh(new_voter)
        
        return DummyVoterOut(
            voter_hashed_national_id=new_voter.voter_hashed_national_id,
            phone_number=new_voter.phone_number,
            governerate=new_voter.governerate,
            district=new_voter.district,
            eligible_candidates=json.loads(new_voter.eligible_candidates) if new_voter.eligible_candidates else None,
            created_at=new_voter.created_at.isoformat(),
            election_id=new_voter.election_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating voter: {str(e)}"
        )


@router.get("/candidates", response_model=List[DummyCandidateOut])
async def list_dummy_candidates(
    db: db_dependency,
    _: admin_dependency
):
    """List all dummy candidates"""
    result = await db.execute(
        select(DummyCandidate)
        .order_by(DummyCandidate.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    candidates = result.scalars().all()
    
    return [
        DummyCandidateOut(
            hashed_national_id=c.hashed_national_id,
            name=c.name,
            district=c.district,
            governorate=c.governorate,
            country=c.country,
            party=c.party,
            symbol_icon_url=c.symbol_icon_url,
            symbol_name=c.symbol_name,
            photo_url=c.photo_url,
            birth_date=c.birth_date.isoformat() if c.birth_date else None,
            description=c.description,
            created_at=c.created_at.isoformat(),
            election_id=c.election_id
        )
        for c in candidates
    ]


@router.get("/candidates/{candidate_id}", response_model=DummyCandidateOut)
async def get_dummy_candidate(
    candidate_id: str,
    db: db_dependency,
    _: admin_dependency
):
    """Get a specific dummy candidate by ID"""
    result = await db.execute(
        select(DummyCandidate).where(DummyCandidate.hashed_national_id == candidate_id)
    )
    candidate = result.scalar_one_or_none()
    
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    return DummyCandidateOut(
        hashed_national_id=candidate.hashed_national_id,
        name=candidate.name,
        district=candidate.district,
        governorate=candidate.governorate,
        country=candidate.country,
        party=candidate.party,
        symbol_icon_url=candidate.symbol_icon_url,
        symbol_name=candidate.symbol_name,
        photo_url=candidate.photo_url,
        birth_date=candidate.birth_date.isoformat() if candidate.birth_date else None,
        description=candidate.description,
        created_at=candidate.created_at.isoformat(),
        election_id=candidate.election_id
    )


@router.get("/voters", response_model=List[DummyVoterOut])
async def list_dummy_voters(
    db: db_dependency,
    _: admin_dependency
):
    """List all dummy voters"""
    result = await db.execute(
        select(DummyVoter)
        .order_by(DummyVoter.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    voters = result.scalars().all()
    
    return [
        DummyVoterOut(
            voter_hashed_national_id=v.voter_hashed_national_id,
            phone_number=v.phone_number,
            governerate=v.governerate,
            district=v.district,
            eligible_candidates=json.loads(v.eligible_candidates) if v.eligible_candidates else None,
            created_at=v.created_at.isoformat(),
            election_id=v.election_id
        )
        for v in voters
    ]


@router.delete("/candidates/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dummy_candidate(
    candidate_id: str,
    db: db_dependency,
    _: admin_dependency
):
    """Delete a dummy candidate"""
    result = await db.execute(
        select(DummyCandidate).where(DummyCandidate.hashed_national_id == candidate_id)
    )
    candidate = result.scalar_one_or_none()
    
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    await db.delete(candidate)
    await db.commit()


@router.delete("/voters/{voter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dummy_voter(
    voter_id: str,
    db: db_dependency,
    _: admin_dependency
):
    """Delete a dummy voter"""
    result = await db.execute(
        select(DummyVoter).where(DummyVoter.voter_hashed_national_id == voter_id)
    )
    voter = result.scalar_one_or_none()
    
    if not voter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voter not found"
        )
    
    await db.delete(voter)
    await db.commit()
