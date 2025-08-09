from fastapi import APIRouter, HTTPException, status
from sqlalchemy.future import select

from core.dependencies import db_dependency
from models.election import Election
from schemas.election import ElectionCreate, ElectionOut, ElectionUpdate

router = APIRouter(prefix="/election", tags=["elections"])


@router.get("/", response_model=list[ElectionOut])
async def get_all_elections(db: db_dependency):
    result = await db.execute(select(Election))
    elections = result.scalars().all()
    return elections

@router.get("/{election_id}",
    response_model=ElectionOut,
   responses={
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
              status_code=201,
              responses={
        status.HTTP_400_BAD_REQUEST: {
            "description": "End date must be after start date",
            "content": {
                "application/json": {
                    "example": {"detail": "End date must be after start date"}
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
            responses={
        status.HTTP_404_NOT_FOUND: {
            "description": "Election not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Election not found"}
                }
            }
        },
        status.HTTP_400_BAD_REQUEST: {
            "description": "End date must be after start date",
            "content": {
                "application/json": {
                    "example": {"detail": "End date must be after start date"}
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
    status_code=204,
     responses={
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
    return {"detail": "Election deleted successfully"}