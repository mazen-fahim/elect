from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models.organization import Organization
from database import get_db  

router = APIRouter(prefix="/organizations", tags=["organizations"])

@router.get("/")
def get_all_organizations(db: Session = Depends(get_db)):
    return db.query(Organization).all()



