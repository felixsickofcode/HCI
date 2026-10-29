from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.display_settings_repository import DisplaySettingsRepository
from app.repositories.user_repository import UserRepository
from app.services.display_settings_service import DisplaySettingsService
from app.services.user_service import UserService

DbSession = Annotated[Session, Depends(get_db)]


def get_user_service(db: DbSession) -> UserService:
    return UserService(UserRepository(db))


UserServiceDep = Annotated[UserService, Depends(get_user_service)]


def get_display_settings_service(db: DbSession) -> DisplaySettingsService:
    return DisplaySettingsService(DisplaySettingsRepository(db))


DisplaySettingsServiceDep = Annotated[
    DisplaySettingsService, Depends(get_display_settings_service)
]


# TẠM THỜI (chờ FR-01): đọc id người dùng từ header X-User-Id.
# Không an toàn, chỉ dùng khi phát triển. Khi FR-01 xong thì viết lại hàm này
# để đọc id từ token đăng nhập.
def get_current_user_id(
    user_service: UserServiceDep,
    x_user_id: Annotated[
        int, Header(description="TẠM THỜI: id người dùng, sẽ thay bằng token (FR-01)")
    ],
) -> int:
    return user_service.get_user(x_user_id).id  # không tồn tại -> 404


CurrentUserIdDep = Annotated[int, Depends(get_current_user_id)]