from fastapi import APIRouter, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from database import db_dependency
from models import Candidate
from schemas.candidate import CandidateRead

router = APIRouter(prefix="/candidates", tags=["Candidate"])


# @router.post("/", response_model=CandidateRead, status_code=status.HTTP_201_CREATED)
# async def create_candidate(candidate_in: CandidateCreate, db: db_dependency):
#     existing_candidate = (
#         await db.execute(select(Candidate).where(Candidate.hashed_national_id == candidate_in.hashed_national_id))
#     ).first()
#
#     if existing_candidate:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST, detail="A candidate with this national ID already exists"
#         )
#
#     new_candidate = Candidate(
#         name=candidate_in.name, hashed_national_id=candidate_in.hashed_national_id, email=candidate_in.email
#     )
#
#     db.add(new_candidate)
#     await db.commit()
#     await db.refresh(new_candidate)


@router.get("/", response_model=list[CandidateRead])
async def get_all_candidates(db: db_dependency, skip: int = 0, limit: int = 100):
    query = (
        select(Candidate)
        .offset(skip)
        .limit(limit)
        .options(selectinload(Candidate.participations), selectinload(Candidate.organization))
    )

    result = await db.execute(query)
    candidates = result.scalars().all()
    return candidates


@router.get("/{hashed_national_id}", response_model=CandidateRead)
async def get_candidate_by_id(hashed_national_id: str, db: db_dependency):
    query = (
        select(Candidate)
        .where(Candidate.hashed_national_id == hashed_national_id)
        .options(
            selectinload(Candidate.participations),
            selectinload(Candidate.organization),
            selectinload(Candidate.organization_admin),
        )
    )

    result = await db.execute(query)
    candidate = result.scalars().first()

    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found ")

    return candidate
