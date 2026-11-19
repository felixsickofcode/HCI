from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, UserServiceDep
from app.core.exceptions import UserNotFoundError
from app.schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead])
def list_users(
        current_user: CurrentUser,
        service: UserServiceDep,
        skip: int = Query(0, ge=0),
        limit: int = Query(20, ge=1, le=100),
):
    return [current_user] if skip == 0 else []  # No admin role: only expose self.


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: int, current_user: CurrentUser, service: UserServiceDep):
    if user_id != current_user.id:
        raise UserNotFoundError()
    return service.get_user(user_id)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, service: UserServiceDep):
    return service.create_user(data)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: int, data: UserUpdate, current_user: CurrentUser, service: UserServiceDep):
    if user_id != current_user.id:
        raise UserNotFoundError()
    return service.update_user(user_id, data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, current_user: CurrentUser, service: UserServiceDep):
    if user_id != current_user.id:
        raise UserNotFoundError()
    service.delete_user(user_id)
