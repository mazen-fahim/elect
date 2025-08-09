from fastapi import APIRouter, HTTPException, status
from sqlalchemy.future import select

from core.dependencies import db_dependency
from models.election import Election
from schemas.election import ElectionCreate, ElectionOut, ElectionUpdate

router = APIRouter(
    prefix="/election",
    tags=["elections"],
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


@router.get("/", 
            response_model=list[ElectionOut],
            summary="Get all elections",
    description="Retrieve a list of all elections in the system",
    responses={
        status.HTTP_200_OK: {
            "description": "Successful response with list of elections",
            "content": {
                "application/json": {
                    "example": [{
                        "id": 1,
                        "title": "Annual Board Election",
                        "status": "pending"
                    }]
                }
            }
        }
    })
async def get_all_elections(db: db_dependency):
    result = await db.execute(select(Election))
    elections = result.scalars().all()
    return elections

@router.get("/{election_id}",
    response_model=ElectionOut,
   summary="Get specific election",
    description="Retrieve details of a specific election by its ID",
    responses={
        status.HTTP_200_OK: {
            "description": "Successful response with election details",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "title": "Annual Board Election",
                        "status": "pending"
                    }
                }
            }
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "Election not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Election not found"}
                }
            }
        }
    }
             
             
)
async def get_specific_election(election_id: int, db: db_dependency):
    result = await db.execute(select(Election).where(Election.id == election_id))
    election = result.scalar_one_or_none()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return election


@router.post("/",
              response_model=ElectionOut, 
             status_code=status.HTTP_201_CREATED,
    summary="Create new election",
    description="Create a new election with the provided details",
    responses={
        status.HTTP_201_CREATED: {
            "description": "Election created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "title": "New Election",
                        "status": "pending"
                    }
                }
            }
        },
        status.HTTP_400_BAD_REQUEST: {
            "description": "Invalid input data",
            "content": {
                "application/json": {
                    "examples": {
                        "invalid_dates": {
                            "value": {
                                "detail": "End date must be after start date"
                            }
                        },
                        "missing_fields": {
                            "value": {
                                "detail": "Title is required"
                            }
                        }
                    }
                }
            }
        }
    }
)

async def create_election(election_data: ElectionCreate, db: db_dependency):
    if election_data.ends_at <= election_data.starts_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )

    new_election = Election(
        title=election_data.title,
        types=election_data.types,
        organization_id=election_data.organization_id,
        starts_at=election_data.starts_at,
        ends_at=election_data.ends_at,
        num_of_votes_per_voter=election_data.num_of_votes_per_voter,
        potential_number_of_voters=election_data.potential_number_of_voters,
        status="pending",
        create_req_status="pending",
    )

    db.add(new_election)
    await db.commit()
    await db.refresh(new_election)
    return new_election


@router.put("/{election_id}", 
            response_model=ElectionOut,
            summary="Update election",
    description="Update details of an existing election",
    responses={
        status.HTTP_200_OK: {
            "description": "Election updated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "title": "Updated Election",
                        "status": "active"
                    }
                }
            }
        },
        status.HTTP_400_BAD_REQUEST: {
            "description": "Invalid input data",
            "content": {
                "application/json": {
                    "examples": {
                        "invalid_dates": {
                            "value": {
                                "detail": "End date must be after start date"
                            }
                        },
                        "invalid_status": {
                            "value": {
                                "detail": "Cannot change status from completed to active"
                            }
                        }
                    }
                }
            }
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "Election not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Election not found"}
                }
      
            }
        }
    }
            )
async def update_election(election_id: int, election_data: ElectionUpdate, db: db_dependency):
    result = await db.execute(select(Election).where(Election.id == election_id))
    election = result.scalar_one_or_none()
    if not election:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Election not found"
        )
    if election_data.starts_at and election_data.ends_at:
        if election_data.ends_at <= election_data.starts_at:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End date must be after start date"
            )
    elif (
        election_data.starts_at
        and election.ends_at <= election_data.starts_at
        or election_data.ends_at
        and election_data.ends_at <= election.starts_at
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )


    for field, value in election_data.model_dump(exclude_unset=True).items():
        setattr(election, field, value)

    await db.commit()
    await db.refresh(election)
    return election


@router.delete("/{election_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete election",
    description="Delete an election by its ID",
    responses={
        status.HTTP_204_NO_CONTENT: {
            "description": "Election deleted successfully"
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "Election not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Election not found"}
                }
            }
        },
        status.HTTP_403_FORBIDDEN: {
            "description": "Cannot delete election in progress",
            "content": {
                "application/json": {
                    "example": {"detail": "Cannot delete election in 'active' status"}
                }
            }
        }
    }

)
async def delete_election(election_id: int, db: db_dependency):
    result = await db.execute(select(Election).where(Election.id == election_id))
    election = result.scalar_one_or_none()
    if not election:
         raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Election not found"
        )
    await db.delete(election)
    await db.commit()
    

    # Add business logic to prevent deletion of active elections
    if election.status == 'active':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete election in 'active' status"
        )

    await db.delete(election)
    await db.commit()
    return {"detail": "Election deleted successfully"}