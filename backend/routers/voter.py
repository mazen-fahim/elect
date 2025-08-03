# routers/voter.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from models.voter import Voter
from database import get_db
from schemas.voter import VoterCreate, VoterOut, VoterUpdate

router = APIRouter(prefix="/voters", tags=["voters"])

@router.post("/", response_model=VoterOut, status_code=status.HTTP_201_CREATED)
async def create_voter(
    voter_data: VoterCreate,
    db: AsyncSession = Depends(get_db)
):
    # Check if voter already exists
    result = await db.execute(
        select(Voter).where(
            Voter.voter_hashed_national_id == voter_data.voter_hashed_national_id,
            Voter.election_id == voter_data.election_id
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Voter already registered for this election"
        )

    new_voter = Voter(**voter_data.dict())
    db.add(new_voter)
    await db.commit()
    await db.refresh(new_voter)
    
    # Include election title in response
    voter_out = new_voter
    voter_out.election_title = new_voter.election.title
    return voter_out

@router.get("/{voter_id}", response_model=VoterOut)
async def get_voter(
    voter_id: str,
    election_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Voter).where(
            Voter.voter_hashed_national_id == voter_id,
            Voter.election_id == election_id
        )
    )
    voter = result.scalar_one_or_none()
    if not voter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voter not found"
        )
    
    voter.election_title = voter.election.title
    return voter

@router.patch("/{voter_id}", response_model=VoterOut)
async def update_voter(
    voter_id: str,
    election_id: int,
    voter_data: VoterUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Voter).where(
            Voter.voter_hashed_national_id == voter_id,
            Voter.election_id == election_id
        )
    )
    voter = result.scalar_one_or_none()
    if not voter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voter not found"
        )

    for field, value in voter_data.dict(exclude_unset=True).items():
        setattr(voter, field, value)

    await db.commit()
    await db.refresh(voter)
    voter.election_title = voter.election.title
    return voter