from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.organization import Organization
from database import get_db
from schemas.organization import OrganizationCreate, OrganizationUpdate, OrganizationOut

router = APIRouter(prefix="/organization", tags=["organizations"])

# 1. Get all
@router.get("/", response_model=list[OrganizationOut])
def get_all_organizations(db: Session = Depends(get_db)):
    return db.query(Organization).all()

# 2. Get specific
@router.get("/{organization_id}", response_model=OrganizationOut)
def get_organization(organization_id: int, db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org

# 3. Create new
@router.post("/", response_model=OrganizationOut)
def create_organization(data: OrganizationCreate, db: Session = Depends(get_db)):
    org = Organization(**data.dict())
    db.add(org)
    db.commit()
    db.refresh(org)
    return org

# 4. Update
@router.put("/{organization_id}", response_model=OrganizationOut)
def update_organization(organization_id: int, data: OrganizationUpdate, db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(org, key, value)
    db.commit()
    db.refresh(org)
    return org

# 5. Delete
@router.delete("/{organization_id}", status_code=204)
def delete_organization(organization_id: int, db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    db.delete(org)
    db.commit()
    return None
