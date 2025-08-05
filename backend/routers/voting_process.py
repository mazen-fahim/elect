from fastapi import APIRouter, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.future import select
import json
from datetime import datetime
from app.dependencies import rate_limit_voting
from database import db_dependency, manager
from models.voting_process import VotingProcess
from models.election import Election
from models.candidate import Candidate
from schemas.voting_process import VotingProcessCreate, VotingProcessOut
from schemas.websocket import WSMessage, NewVoteData, CandidateUpdateData

router = APIRouter(prefix="/voting-processes", tags=["voting_processes"])

@router.post("/", response_model=VotingProcessOut, status_code=status.HTTP_201_CREATED)
async def create_voting_process(process_data: VotingProcessCreate, db: db_dependency):
    # Check if voting process already exists
    result = await db.execute(
        select(VotingProcess).where(
            VotingProcess.voter_hashed_national_id == process_data.voter_hashed_national_id,
            VotingProcess.election_id == process_data.election_id,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Voting process already exists")

    new_process = VotingProcess(**process_data.model_dump())
    db.add(new_process)
    await db.commit()
    await db.refresh(new_process)

    # Include election status in response
    process_out = VotingProcessOut(
        voter_hashed_national_id=new_process.voter_hashed_national_id,
        election_id=new_process.election_id,
        election_status=new_process.election.status,
        created_at=new_process.created_at
    )
    return process_out

@router.get("/{voter_id}", response_model=VotingProcessOut)
async def get_voting_process(voter_id: str, election_id: int, db: db_dependency):
    result = await db.execute(
        select(VotingProcess).where(
            VotingProcess.voter_hashed_national_id == voter_id,
            VotingProcess.election_id == election_id
        )
    )
    process = result.scalar_one_or_none()
    if not process:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voting process not found")

    return VotingProcessOut(
        voter_hashed_national_id=process.voter_hashed_national_id,
        election_id=process.election_id,
        election_status=process.election.status,
        created_at=process.created_at
    )

@router.websocket("/ws/{election_id}")
async def election_updates_ws(websocket: WebSocket, election_id: int):
    await manager.connect(websocket, election_id)
    try:
        while True:
            await websocket.receive_text()  # Just maintain connection
    except WebSocketDisconnect:
        manager.disconnect(websocket, election_id)

@router.websocket("/ws/candidate-updates/{election_id}")
async def candidate_updates_ws(websocket: WebSocket, election_id: int):
    await manager.connect(websocket, election_id)
    try:
        while True:
            data = await websocket.receive_json()
            # Could add validation here if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket, election_id)

@router.post("/vote", response_model=VotingProcessOut,
    dependencies=[Depends(rate_limit_voting)])
   
async def submit_vote(vote_data: VotingProcessCreate, db: db_dependency):
    try:
        async with db.begin():  # Start transaction
            # -- Existing validation checks --
            
            # Get election and candidate with lock
            election = await db.get(Election, vote_data.election_id, with_for_update=True)
            candidate = await db.get(Candidate, vote_data.candidate_id, with_for_update=True)
            
            # Update counts
            election.total_vote_count += 1
            candidate.vote_count += 1
            
            # Create vote record
            new_process = VotingProcess(
                voter_hashed_national_id=vote_data.voter_hashed_national_id,
                election_id=vote_data.election_id,
                # candidate_id=vote_data.candidate_id
            )
            db.add(new_process)
            
            # Prepare WebSocket messages
            vote_msg = WSMessage(
                type="NEW_VOTE",
                election_id=election.id,
                data=NewVoteData(
                    total_votes=election.total_vote_count,
                    voter_id=vote_data.voter_hashed_national_id[-4:],
                    candidate_id=vote_data.candidate_id
                ).dict()
            )
            
            candidate_msg = WSMessage(
                type="CANDIDATE_UPDATE",
                election_id=election.id,
                data=CandidateUpdateData(
                    candidate_id=candidate.id,
                    vote_count=candidate.vote_count,
                    vote_change=1
                ).dict()
            )
            
            await db.commit()  # Commit transaction
            
        # Broadcast after successful commit
        await manager.broadcast(json.dumps(vote_msg.dict()), election.id)
        await manager.broadcast(json.dumps(candidate_msg.dict()), election.id)
        
        return VotingProcessOut(
            voter_hashed_national_id=new_process.voter_hashed_national_id,
            election_id=new_process.election_id,
            election_status=election.status,
            created_at=datetime.utcnow()
        )
        
    except Exception as e:
        await db.rollback()
        error_msg = WSMessage(
            type="SYSTEM_ALERT",
            election_id=vote_data.election_id,
            data=SystemAlertData(
                severity="critical",
                message=f"Vote failed: {str(e)}",
                component="voting"
            ).dict()
        )
        await manager.broadcast(json.dumps(error_msg.dict()), vote_data.election_id)
        raise HTTPException(status_code=400, detail="Vote processing failed")