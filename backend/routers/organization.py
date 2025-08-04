from fastapi import APIRouter
from sqlalchemy import select

from database import db_dependency
from models.organization import Organization

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("/")
async def get_all_organizations(db: db_dependency):
    result = await db.execute(select(Organization))
    return result.scalars().all()
