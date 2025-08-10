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

router = APIRouter(
    prefix="/candidates",
    tags=["candidates"],
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
            response_model=list[CandidateRead],
            summary="List all candidates",
    description="Retrieve a paginated list of all candidates",
    responses={
        status.HTTP_200_OK: {
            "description": "Successful response with list of candidates",
            "content": {
                "application/json": {
                    "example": [{
                        "id": 1,
                        "name": "John Doe",
                        "hashed_national_id": "a1b2c3d4...",
                        "photo_url": "https://example.com/photo.jpg",
                        "country": "US",
                        "status": "active"
                    }]
                }
            }
        }
    }
            )
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


@router.get("/{hashed_national_id}", 
    response_model=CandidateRead,
    summary="Get candidate details",
    description="Retrieve detailed information about a specific candidate",
    responses={
        status.HTTP_200_OK: {
            "description": "Successful response with candidate details",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "John Doe",
                        "hashed_national_id": "a1b2c3d4...",
                        "photo_url": "https://example.com/photo.jpg",
                        "country": "US",
                        "status": "active"
                    }
                }
            }
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "Candidate not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Candidate not found"}
                }
            }
        }
    })
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
@router.post("/", response_model=CandidateRead, 
             status_code=status.HTTP_201_CREATED,
             summary="Create a new candidate",
    description="Register a new candidate with their details and upload images",
    responses={
        status.HTTP_201_CREATED: {
            "description": "Candidate created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "John Doe",
                        "hashed_national_id": "a1b2c3d4...",
                        "photo_url": "https://example.com/photo.jpg",
                        "country": "US",
                        "status": "pending"
                    }
                }
            }
        },
        status.HTTP_400_BAD_REQUEST: {
            "description": "Invalid request",
            "content": {
                "application/json": {
                    "examples": {
                        "duplicate_candidate": {
                            "value": {
                                "detail": "A candidate with this national ID already exists"
                            }
                        },          "invalid_image": {
                            "value": {
                                "detail": "Invalid image file provided"
                            }
                        }
                    }
                }
            }
        },
        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE: {
            "description": "Image file too large",
            "content": {
                "application/json": {
                    "example": {"detail": "Image size exceeds maximum allowed"}
                }
            }
        }
    })

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
    photo_url = None
    symbol_icon_url = None

    try:
        if photo:
            photo_url = await image_service.upload_image(photo)
        if symbol_icon:
            symbol_icon_url = await image_service.upload_image(symbol_icon)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process image upload"
        )

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


@router.patch(
    "/{hashed_national_id}",
    response_model=CandidateRead,
    summary="Update candidate details",
    description="Update information for an existing candidate",
    responses={
        status.HTTP_200_OK: {
            "description": "Candidate updated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "Updated Name",
                        "hashed_national_id": "a1b2c3d4...",
                        "photo_url": "https://example.com/new_photo.jpg",
                        "country": "US",
                        "status": "active"
                    }
                }
            }
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "Candidate not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Candidate not found"}
                }
            }
        },
        status.HTTP_400_BAD_REQUEST: {
            "description": "Invalid request",
            "content": {
                "application/json": {
                    "examples": {
                        "invalid_status": {
                            "value": {"detail": "Invalid status transition"}
                        },
                        "invalid_image": {
                            "value": {"detail": "Invalid image file provided"}
                        }
                    }
                }
            }
        },
        status.HTTP_403_FORBIDDEN: {
            "description": "Forbidden operation",
            "content": {
                "application/json": {
                    "example": {"detail": "Cannot modify hashed_national_id"}
                }
            }
        }
    }
)
async def update_candidate(
    hashed_national_id: str,
    db: db_dependency,
    name: Annotated[Optional[str], Form(None, max_length=100)] = None,
    country: Annotated[Optional[Country], Form(None)] = None,
    party: Annotated[Optional[str], Form(None, max_length=100)] = None,
    description: Annotated[Optional[str], Form(None, max_length=500)] = None,
    organization_id: Annotated[Optional[int], Form(None)] = None,
    symbol_icon: Annotated[Optional[UploadFile], File(None)] = None,
    photo: Annotated[Optional[UploadFile], File(None)] = None,
    status: Annotated[Optional[Status], Form(None)] = None,
):
    # Get existing candidate
    result = await db.execute(
        select(Candidate)
        .where(Candidate.hashed_national_id == hashed_national_id)
        .options(selectinload(Candidate.organization)))
    candidate = result.scalars().first()

    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )

    # Check if organization exists

    if organization_id is not None:
        organization = (
            await db.execute(select(Organization).where(Organization.id == organization_id))
        ).scalar_one_or_none()
        if not organization:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        candidate.organization = organization
    else:
        candidate.organization = None   
    # Validate country
    if country and country not in Country:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid country"
        )
    candidate.country = country if country else candidate.country

    # Handle image uploads
    image_service = ImageService()
    try:
        if photo:
            candidate.photo_url = await image_service.upload_image(photo)
        if symbol_icon:
            candidate.symbol_icon_url = await image_service.upload_image(symbol_icon)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Update fields
    update_data = {
        "name": name,
        "country": country,
        "birth_date": birth_date,
        "party": party,
        "symbol_name": symbol_name,
        "description": description,
        "organization_id": organization_id,
        "status": status
    }

    for field, value in update_data.items():
        if value is not None:
            setattr(candidate, field, value)

    await db.commit()
    await db.refresh(candidate)
    return candidate

def is_valid_status_transition(current_status: Status, new_status: Status) -> bool:
    """Validate if the status transition is allowed"""
    status_flow = {
        Status.pending: [Status.active, Status.rejected],
        Status.active: [Status.suspended, Status.inactive],
        Status.suspended: [Status.active, Status.inactive],
        # Add other valid transitions as needed
    }
    return new_status in status_flow.get(current_status, [])


@router.delete(
    "/{hashed_national_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a candidate",
    description="Permanently delete a candidate from the system",
    responses={
        status.HTTP_204_NO_CONTENT: {
            "description": "Candidate deleted successfully"
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "Candidate not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Candidate not found"}
                }
            }
        },
        status.HTTP_403_FORBIDDEN: {
            "description": "Operation not allowed",
            "content": {
                "application/json": {
                    "examples": {
                        "active_candidate": {
                            "value": {"detail": "Cannot delete candidate with active status"}
                        },
                        "participation_exists": {
                            "value": {"detail": "Candidate has existing participations"}
                        }
                    }
                }
            }
        }
    }
)
async def delete_candidate(
    hashed_national_id: str,
    db: db_dependency
):
    # Get the candidate with related data
    result = await db.execute(
        select(Candidate)
        .where(Candidate.hashed_national_id == hashed_national_id)
        .options(
            selectinload(Candidate.participations),
            selectinload(Candidate.organization)
        )
    )
    candidate = result.scalars().first()

    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )

    # Business rule: Prevent deletion of active candidates
    if candidate.status == Status.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete candidate with active status"
        )

    # Business rule: Check for existing participations
    if candidate.participations and len(candidate.participations) > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidate has existing participations in elections"
        )

    # Delete associated images if they exist
    image_service = ImageService()
    try:
        if candidate.photo_url:
            await image_service.delete_image(candidate.photo_url)
        if candidate.symbol_icon_url:
            await image_service.delete_image(candidate.symbol_icon_url)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting candidate assets: {str(e)}"
        )

    # Delete the candidate
    await db.delete(candidate)
    await db.commit()

    # 204 responses should have no content
    return None
