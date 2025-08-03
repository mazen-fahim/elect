from pydantic import BaseModel
from typing import Optional
from core.shared import Status, Country

class OrganizationBase(BaseModel):
    name: str
    status: Status
    payment_status: Status
    api_endpoint: Optional[str]
    country: Country

class OrganizationCreate(OrganizationBase):
    user_id: int  # required for creation

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[Status] = None
    payment_status: Optional[Status] = None
    api_endpoint: Optional[str] = None
    country: Optional[Country] = None

class OrganizationOut(OrganizationBase):
    user_id: int

    class Config:
        orm_mode = True
