from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from core.dependencies import db_dependency
from core.shared import Country, Status
from models import Candidate, Country, Status
from schemas.candidate import CandidateRead
from services.image import ImageService

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
        )
    )

    result = await db.execute(query)
    candidate = result.scalars().first()

    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found ")

    return candidate


# API to upload candidate image
@router.post("/", response_model=CandidateRead, status_code=status.HTTP_201_CREATED)
async def create_candidate(
    db: db_dependency,
    hashed_national_id: Annotated[str, Form(...)],
    name: Annotated[str, Form(...)],
    country: Annotated[Country, Form(...)],
    birth_date: Annotated[datetime, Form(...)],
    party: Annotated[str | None, Form(None)],
    symbol_name: Annotated[str | None, Form(None)],
    description: Annotated[str | None, Form(None)],
    organization_id: Annotated[int, Form(...)],
    symbol_icon: Annotated[UploadFile | None, File(None)],
    photo: Annotated[UploadFile | None, File(None)],
):
    # Check if the candidate already exists
    existing_candidate = (
        await db.execute(select(Candidate).where(Candidate.hashed_national_id == hashed_national_id))
    ).scalar_one_or_none()

    if existing_candidate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="A candidate with this national ID already exists"
        )

    image_service = ImageService()
    # Save profile picture

    photo_url = await image_service.upload_image(photo)

    # Save the election symbol icon
    symbol_icon_url = await image_service.upload_image(symbol_icon)

    # Create a new Candidate
    new_candidate = Candidate(
        hashed_national_id=hashed_national_id,
        name=name,
        country=country,
        birth_date=birth_date,
        party=party,
        symbol_name=symbol_name,
        description=description,
        organization_id=organization_id,
        photo_url=photo_url,
        symbol_icon_url=symbol_icon_url,
        create_req_status=Status.pending,
    )

    db.add(new_candidate)
    await db.commit()
    await db.refresh(new_candidate)

    return new_candidate
