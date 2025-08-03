from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.election import Election
from database import get_db
from schemas.election import ElectionCreate, ElectionUpdate, ElectionOut

router = APIRouter(prefix="/election", tags=["elections"])


@router.get("/", response_model=list[ElectionOut])
def get_all_elections(db: Session = Depends(get_db)):
    return db.query(Election).all()


@router.get("/{election_id}", response_model=ElectionOut)
def get_specific_election(election_id: int, db: Session = Depends(get_db)):
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return election


@router.put("/{election_id}", response_model=ElectionOut)
def update_election(
    election_id: int, election_data: ElectionUpdate, db: Session = Depends(get_db)
):
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    for field, value in election_data.dict(exclude_unset=True).items():
        setattr(election, field, value)

    db.commit()
    db.refresh(election)
    return election


@router.delete("/{election_id}", status_code=204)
def delete_election(election_id: int, db: Session = Depends(get_db)):
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    db.delete(election)
    db.commit()
    return None
