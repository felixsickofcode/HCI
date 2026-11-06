from pydantic import BaseModel, EmailStr, Field
from app.schemas.base import CamelModel

class RegisterRequest(CamelModel):
    email: EmailStr
    full_name: str | None = Field(default=None, max_length=100)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(CamelModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
