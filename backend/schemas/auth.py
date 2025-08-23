import enum

from pydantic import BaseModel, EmailStr, HttpUrl, field_validator

from core.shared import Country


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
    first_name: str | None = None
    last_name: str | None = None
    country: Country
    address: str | None = None
    description: str | None = None

    @field_validator("description", mode="before")
    def empty_string_to_none(cls, v: str):
        if v == "":
            return None
        return v

    class config:
        use_enum_values: True


class FieldNames(enum.Enum):
    org_name = "name"
    email = "email"


class RegisterOrganizationErrorResponse(BaseModel):
    field: FieldNames
    error_message: str

    class Config:
        use_enum_values: bool = True


class LoginErrorResponse(BaseModel):
    error_message: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    new_password: str
    confirm_password: str

    @field_validator("confirm_password")
    def passwords_match(cls, v, values, **kwargs):
        if "new_password" in values and v != values["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class SuccessMessage(BaseModel):
    success: bool
    status_code: int
    message: str


class CurrentUserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    organization_id: int | None = None
    organization_name: str | None = None
