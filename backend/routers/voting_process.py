from fastapi import APIRouter, HTTPException, status
from sqlalchemy.future import select

from core.dependencies import db_dependency
from models.voting_process import VotingProcess
from schemas.voting_process import VotingProcessCreate, VotingProcessOut
from typing import List


router = APIRouter(
    prefix="/voting-processes",
    tags=["voting_processes"],
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "description": "Not authenticated",
            "content": {
                "application/json": {
                    "example": {"detail": "Not authenticated"}
                }
            }
        },
        status.HTTP_403_FORBIDDEN: {
            "description": "Permission denied",
            "content": {
                "application/json": {
                    "example": {"detail": "Permission denied"}
                }
            }
        }
    }
)


@router.post("/", response_model=VotingProcessOut, 
    status_code=status.HTTP_201_CREATED,
    summary="Create a new voting process",
    description="Creates a new voting process record for a voter in an election",
    responses={
        status.HTTP_201_CREATED: {
            "description": "Voting process created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "voter_hashed_national_id": "a1b2c3d4...",
                        "election_id": 1,
                        "election_status": "active",
                        "created_at": "2023-01-01T00:00:00"
                    }
                }
            }
        },
        status.HTTP_400_BAD_REQUEST: {
            "description": "Invalid request",
            "content": {
                "application/json": {
                    "examples": {
                        "existing_process": {
                            "value": {
                                "detail": "Voting process already exists"
                            }
                        },
                        "invalid_election": {
                            "value": {
                                "detail": "Election does not exist"
                            }
                        }
                    }
                }
            }
        },

    }
)


async def create_voting_process(process_data: VotingProcessCreate, db: db_dependency):
    # Check if voting process already exists
    result = await db.execute(
        select(VotingProcess).where(
            VotingProcess.voter_hashed_national_id == process_data.voter_hashed_national_id,
            VotingProcess.election_id == process_data.election_id,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Voting process already exists"
        )

    new_process = VotingProcess(**process_data.model_dump())
    db.add(new_process)
    await db.commit()
    await db.refresh(new_process)

    # Include election status in response
    process_out = VotingProcessOut(
        voter_hashed_national_id=new_process.voter_hashed_national_id,
        election_id=new_process.election_id,
        election_status=new_process.election.status,
        created_at=new_process.created_at,
    )
    return process_out
@router.get(
    "/{voter_hashed_national_id}",
    response_model=VotingProcessOut,
    summary="Get voting process details",
    description="Retrieves voting process details for a specific voter and election",
    responses={
        status.HTTP_200_OK: {
            "description": "Successful response with voting process details",
            "content": {
                "application/json": {
                    "example": {
                        "voter_hashed_national_id": "a1b2c3d4...",
                        "election_id": 1,
                        "election_status": "active",
                        "created_at": "2023-01-01T00:00:00"
                    }
                }
            }
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "Voting process not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Voting process not found"}
                }
            }
        }
    }
)
async def get_voting_process(
    voter_hashed_national_id: str,
    election_id: int,
    db: db_dependency
):
    result = await db.execute(
        select(VotingProcess).where(
            VotingProcess.voter_hashed_national_id == voter_hashed_national_id,
            VotingProcess.election_id == election_id
        )
    )
    process = result.scalar_one_or_none()
    
    if not process:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voting process not found"
        )

    return VotingProcessOut(
        voter_hashed_national_id=process.voter_hashed_national_id,
        election_id=process.election_id,
        election_status=process.election.status,
        created_at=process.created_at,
    )


