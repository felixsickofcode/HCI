from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User
from app.repositories.display_settings_repository import DisplaySettingsRepository
from app.repositories.user_repository import UserRepository
from app.services.display_settings_service import DisplaySettingsService
from app.services.user_service import UserService

DbSession = Annotated[Session, Depends(get_db)]

bearer_scheme = HTTPBearer(auto_error=False)


def get_user_service(db: DbSession) -> UserService:
    return UserService(UserRepository(db))


UserServiceDep = Annotated[UserService, Depends(get_user_service)]


def get_display_settings_service(db: DbSession) -> DisplaySettingsService:
    return DisplaySettingsService(DisplaySettingsRepository(db))


DisplaySettingsServiceDep = Annotated[
    DisplaySettingsService, Depends(get_display_settings_service)
]


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    try:
        user_id = decode_token(credentials.credentials)
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = UserRepository(db).get_by_id(user_id)
    if not user or not user.is_active:
        raise unauthorized
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]