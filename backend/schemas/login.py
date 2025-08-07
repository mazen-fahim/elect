from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, validator 

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: int
    email: str
    role: str
    organization_id: Optional[int] = None

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    last_access_at: datetime


class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str
    confirm_password: str

    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError("Passwords do not match")
        return v
  