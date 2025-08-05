from pydantic import BaseModel


class LoginResponse(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    email: str
    password: str


class CreateOrganizationRequest(BaseModel):
    pass
