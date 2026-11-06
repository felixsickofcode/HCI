from datetime import datetime
from pydantic import ConfigDict, EmailStr, Field
from app.schemas.base import CamelModel

class UserBase(CamelModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=100)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserUpdate(CamelModel):
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    is_active: bool | None = None


class UserRead(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    # Kế thừa ConfigDict từ CamelModel, chỉ cần thêm from_attributes
    model_config = ConfigDict(from_attributes=True)