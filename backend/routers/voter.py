from fastapi import APIRouter, HTTPException, status
from sqlalchemy.future import select

from core.dependencies import db_dependency
from models.voter import Voter
from schemas.voter import VoterCreate, VoterOut, VoterUpdate

router = APIRouter(prefix="/voters", tags=["voters"])


@router.post("/", response_model=VoterOut,
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
                        "duplicate_voter": {
                            "value": {
                                "detail": "Voter already registered for this election"
                            }
                        },
                        "invalid_election": {
                            "value": {
                                "detail": "Election does not exist or is not active"
                            }
                        }
                    }
                }
            }
    }
})
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

    # Include election title in response
    voter_out = new_voter
    voter_out.election_title = new_voter.election.title
    return voter_out


@router.get("/{voter_hashed_national_id}", 
            response_model=VoterOut,
           summary="Get voter details",
    description="Retrieves voter details for a specific election",
    responses={
        status.HTTP_200_OK: {
            "description": "Successful response with voter details",
            "content": {
                "application/json": {
                    "example": {
                        "voter_hashed_national_id": "a1b2c3d4...",
                        "election_id": 1,
                        "election_title": "Annual Board Election",
                        "has_voted": False,
                        "created_at": "2023-01-01T00:00:00"
                    }
                }
            }
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "Voter not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Voter not found"}
                }
            }
        }
    })
async def get_voter(voter_id: str, election_id: int, db: db_dependency):
    result = await db.execute(
        select(Voter).where(Voter.voter_hashed_national_id == voter_id, Voter.election_id == election_id)
    )
    voter = result.scalar_one_or_none()
    if not voter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voter not found")

    voter.election_title = voter.election.title
    return voter


@router.patch("/{voter_id}", 
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
                        "created_at": "2023-01-01T00:00:00"
                    }
                }
            }
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "Voter not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Voter not found"}
                }
            }
        },
        status.HTTP_400_BAD_REQUEST: {
            "description": "Invalid update request",
            "content": {
                "application/json": {
                    "example": {"detail": "Cannot modify voter_hashed_national_id or election_id"}
                }
            }
        }
    }
)

async def update_voter(voter_id: str, election_id: int, voter_data: VoterUpdate, db: db_dependency):
    result = await db.execute(
        select(Voter).where(Voter.voter_hashed_national_id == voter_id, Voter.election_id == election_id)
    )
    voter = result.scalar_one_or_none()
    if not voter:
         raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voter not found"
        )
    # Prevent modification of certain fields
    if any(field in voter_data.model_dump(exclude_unset=True) 
           for field in ['voter_hashed_national_id', 'election_id']):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify voter_hashed_national_id or election_id"
        )


    for field, value in voter_data.model_dump(exclude_unset=True).items():
        setattr(voter, field, value)

    await db.commit()
    await db.refresh(voter)
    voter.election_title = voter.election.title
    return voter
