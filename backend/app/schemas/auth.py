from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    household_name: str
    name: str
    email: EmailStr
    password: str


class InviteRequest(BaseModel):
    """Adds another login to the current user's household (e.g. a spouse)."""

    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
