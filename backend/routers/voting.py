from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.future import select
from sqlalchemy import and_, func

from core.dependencies import db_dependency
from models.voting_process import VotingProcess
from models.candidate_participation import CandidateParticipation
from models.candidate import Candidate
from models.election import Election
from models.voter import Voter
from schemas.voting import VoteRequest, VoteResponse, CandidateVoteInfo

router = APIRouter(prefix="/voting", tags=["voting"])


@router.get("/election/{election_id}/candidates", response_model=dict)
async def get_election_candidates(election_id: int, db: db_dependency):
    """Get all candidates for an election that voters can vote for"""
    
    # Check if election exists and is currently running
    election_result = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = election_result.scalar_one_or_none()
    
    if not election:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Election not found")
    
    now = datetime.now(timezone.utc)
    if now < election.starts_at or now > election.ends_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Election is not currently running")
    
    # Get candidates participating in this election
    candidates_result = await db.execute(
        select(Candidate, CandidateParticipation.vote_count)
        .join(CandidateParticipation, CandidateParticipation.candidate_hashed_national_id == Candidate.hashed_national_id)
        .where(CandidateParticipation.election_id == election_id)
        .order_by(Candidate.name)
    )
    
    candidates = candidates_result.all()
    
    return {
        "election_info": {
            "id": election.id,
            "title": election.title,
            "num_of_votes_per_voter": election.num_of_votes_per_voter
        },
        "candidates": [
            CandidateVoteInfo(
                hashed_national_id=candidate.hashed_national_id,
                name=candidate.name,
                party=candidate.party,
                symbol_name=candidate.symbol_name,
                symbol_icon_url=candidate.symbol_icon_url,
                photo_url=candidate.photo_url,
                current_vote_count=vote_count or 0
            )
            for candidate, vote_count in candidates
        ]
    }


@router.post("/election/{election_id}/vote", response_model=VoteResponse)
async def cast_vote(election_id: int, vote_request: VoteRequest, db: db_dependency):
    """Cast a vote in an election"""
    
    # Check if election exists and is currently running
    election_result = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = election_result.scalar_one_or_none()
    
    if not election:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Election not found")
    
    now = datetime.now(timezone.utc)
    if now < election.starts_at or now > election.ends_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Election is not currently running")
    
    # Check if voter exists and is verified for this election
    voter_result = await db.execute(
        select(Voter).where(
            and_(
                Voter.voter_hashed_national_id == vote_request.voter_hashed_national_id,
                Voter.election_id == election_id,
                Voter.is_verified == True
            )
        )
    )
    voter = voter_result.scalar_one_or_none()
    
    if not voter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voter not found or not verified for this election")
    
    # Check if voter has already voted in this election
    existing_vote_result = await db.execute(
        select(VotingProcess).where(
            and_(
                VotingProcess.voter_hashed_national_id == vote_request.voter_hashed_national_id,
                VotingProcess.election_id == election_id
            )
        )
    )
    
    if existing_vote_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Voter has already voted in this election")
    
    # Validate number of candidates selected
    if len(vote_request.candidate_hashed_national_ids) != election.num_of_votes_per_voter:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Must select exactly {election.num_of_votes_per_voter} candidate(s)"
        )
    
    # Validate that all selected candidates are participating in this election
    for candidate_id in vote_request.candidate_hashed_national_ids:
        participation_result = await db.execute(
            select(CandidateParticipation).where(
                and_(
                    CandidateParticipation.candidate_hashed_national_id == candidate_id,
                    CandidateParticipation.election_id == election_id
                )
            )
        )
        
        if not participation_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Candidate {candidate_id} is not participating in this election"
            )
    
    try:
        # Record the voting process
        voting_process = VotingProcess(
            voter_hashed_national_id=vote_request.voter_hashed_national_id,
            election_id=election_id,
            created_at=now
        )
        db.add(voting_process)
        
        # Update vote counts for selected candidates
        for candidate_id in vote_request.candidate_hashed_national_ids:
            participation_result = await db.execute(
                select(CandidateParticipation).where(
                    and_(
                        CandidateParticipation.candidate_hashed_national_id == candidate_id,
                        CandidateParticipation.election_id == election_id
                    )
                )
            )
            participation = participation_result.scalar_one_or_none()
            if participation:
                participation.vote_count += 1
        
        # Update election total vote count
        election.total_vote_count += 1
        
        await db.commit()
        
        return VoteResponse(
            message="Vote cast successfully",
            election_id=election_id,
            voter_hashed_national_id=vote_request.voter_hashed_national_id,
            candidates_selected=vote_request.candidate_hashed_national_ids,
            timestamp=now
        )
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cast vote. Please try again."
        )


@router.get("/election/{election_id}/voter/{voter_hashed_national_id}/status")
async def get_voter_voting_status(election_id: int, voter_hashed_national_id: str, db: db_dependency):
    """Check if a voter has already voted in an election"""
    
    # Check if election exists
    election_result = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = election_result.scalar_one_or_none()
    
    if not election:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Election not found")
    
    # Check if voter has voted
    voting_process_result = await db.execute(
        select(VotingProcess).where(
            and_(
                VotingProcess.voter_hashed_national_id == voter_hashed_national_id,
                VotingProcess.election_id == election_id
            )
        )
    )
    
    has_voted = voting_process_result.scalar_one_or_none() is not None
    
    return {
        "election_id": election_id,
        "voter_hashed_national_id": voter_hashed_national_id,
        "has_voted": has_voted,
        "votes_allowed": election.num_of_votes_per_voter
    }
