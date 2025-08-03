from pydantic import BaseModel , HttpUrl
from typing import Optional , List, TYPE_CHECKING
from ..core.shared import Status , Country 
from datetime import datetime
from ..models.candidate_participation import CandidateParticipation

if TYPE_CHECKING:
    from ..models.organization import Organization
    from ..models.organization_admin import OrganizationAdmin
class CandidateBase(BaseModel):
    hashed_national_id : str 
    name : str 
    district : Optional[str] = None
    governorate : Optional[str] = None
    country : Country 
    party : str 
    organization_id: int
    symbol_icon_url : Optional[HttpUrl] = None
    symbol_name: Optional[str] = None
    photo_url : Optional[HttpUrl] = None 
    birth_date: datetime
    description : Optional[str] = None
    organization_admin_id: Optional[int] = None 

class CandidateCreate(CandidateBase):
    pass 


class CandidateRead(CandidateBase):

    id : str
    create_req_status : Status 
    create_at : datetime

    participations : List[CandidateParticipation] = []
    organization : "Organization"
    organization_admin : Optional["OrganizationAdmin"] = None 
    class Config: 
        orm_mode = True
        use_enum_values = True



