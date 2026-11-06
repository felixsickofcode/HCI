from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.display_settings import UserDisplaySettings


class DisplaySettingsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_user_id(self, user_id: int) -> UserDisplaySettings | None:
        # user_id là khóa chính nên dùng db.get
        return self.db.get(UserDisplaySettings, user_id)

    def _commit(self) -> None:
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise

    def create(self, record: UserDisplaySettings) -> UserDisplaySettings:
        self.db.add(record)
        self._commit()
        self.db.refresh(record)
        return record

    def update(self, record: UserDisplaySettings) -> UserDisplaySettings:
        self._commit()
        self.db.refresh(record)
        return record

    def delete(self, record: UserDisplaySettings) -> None:
        self.db.delete(record)
        self._commit()
