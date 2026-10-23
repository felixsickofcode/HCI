from sqlalchemy.exc import IntegrityError

from app.core.exceptions import EmailAlreadyExistsError, UserNotFoundError
from app.core.security import hash_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    def __init__(self, repo: UserRepository):
        self.repo = repo

    def get_user(self, user_id: int) -> User:
        user = self.repo.get_by_id(user_id)
        if not user:
            raise UserNotFoundError()
        return user

    def list_users(self, skip: int, limit: int) -> list[User]:
        return self.repo.list(skip, limit)

    def create_user(self, data: UserCreate) -> User:
        if self.repo.get_by_email(data.email):
            raise EmailAlreadyExistsError()
        user = User(
            email=data.email,
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
        )
        try:
            return self.repo.create(user)
        except IntegrityError:
            raise EmailAlreadyExistsError()

    def update_user(self, user_id: int, data: UserUpdate) -> User:
        user = self.get_user(user_id)
        changes = data.model_dump(exclude_unset=True)

        new_email = changes.get("email")
        if new_email and new_email != user.email and self.repo.get_by_email(new_email):
            raise EmailAlreadyExistsError()

        if "password" in changes:
            user.hashed_password = hash_password(changes.pop("password"))

        for field, value in changes.items():
            setattr(user, field, value)

        try:
            return self.repo.update(user)
        except IntegrityError:
            raise EmailAlreadyExistsError()

    def delete_user(self, user_id: int) -> None:
        user = self.get_user(user_id)
        self.repo.delete(user)