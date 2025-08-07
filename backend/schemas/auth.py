from pydantic import BaseModel, EmailStr, HttpUrl, field_validator


# Login
class LoginResponse(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# Register
class RegisterOrganizationRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str
    address: str
    country: str
    description: str | None = None
    api_endpoint: HttpUrl | None = None

    @field_validator("description", "api_endpoint", mode="before")
    def empty_string_to_none(cls, v: str):
        if v == "":
            return None
        return v


class RegisterOrganizationResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: str
    address: str
    country: str
    description: str | None = None
    api_endpoint: HttpUrl | None = None

    class Config:
        orm_mode: bool = True
        allow_population_by_field_name: bool = True
