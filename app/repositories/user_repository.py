from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email))

    def list(self, skip: int = 0, limit: int = 20) -> list[User]:
        stmt = select(User).order_by(User.id).offset(skip).limit(limit)
        return list(self.db.scalars(stmt))

    def _commit(self) -> None:
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise

    def create(self, user: User) -> User:
        self.db.add(user)
        self._commit()
        self.db.refresh(user)
        return user

    def update(self, user: User) -> User:
        self._commit()
        self.db.refresh(user)
        return user

    def delete(self, user: User) -> None:
        self.db.delete(user)
        self._commit()