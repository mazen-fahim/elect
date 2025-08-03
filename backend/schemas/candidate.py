from pydantic import BaseModel , HttpUrl
from typing import Optional
from datetime import date


class CandidateBase(BaseModel):
    hashed_national_id : str 
    name : str 
    district : Optional[str] = None
    governorate : Optional[str] = None
    country : str 
    party : str 
    symbol_icon_url : Optional[HttpUrl] = None
    photo_url : Optional[HttpUrl] = None 
    birth_date : Optional[date] = None
    description : Optional[str] = None

class CandidateCreate(CandidateBase):
    pass 


class CandidateRead(CandidateBase):
    class Config: 
        orm_mode = True

        
