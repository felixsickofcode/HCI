from sqlalchemy.exc import IntegrityError

from app.core.exceptions import DisplaySettingsNotFoundError, UserNotFoundError
from app.models.display_settings import UserDisplaySettings
from app.models.user import utcnow
from app.repositories.display_settings_repository import DisplaySettingsRepository
from app.schemas.display_settings import DISPLAY_SETTINGS_VERSION, DisplaySettings


class DisplaySettingsService:
    def __init__(self, repo: DisplaySettingsRepository):
        self.repo = repo

    def get(self, user_id: int) -> UserDisplaySettings:
        record = self.repo.get_by_user_id(user_id)
        if not record:
            raise DisplaySettingsNotFoundError()
        return record

    def save(self, user_id: int, data: DisplaySettings) -> UserDisplaySettings:
        """Lưu (thay toàn bộ) cài đặt của user: chưa có thì tạo, có rồi thì cập nhật."""
        # Lưu theo camelCase để dữ liệu trong DB giống JSON mà frontend dùng
        payload = data.model_dump(by_alias=True, mode="json")

        record = self.repo.get_by_user_id(user_id)
        if record is None:
            record = UserDisplaySettings(
                user_id=user_id,
                schema_version=DISPLAY_SETTINGS_VERSION,
                settings=payload,
            )
            try:
                return self.repo.create(record)
            except IntegrityError:
                # Một yêu cầu khác vừa tạo dòng này trước -> chuyển sang cập nhật.
                # Nếu vẫn không thấy dòng nào thì nghĩa là user vừa bị xóa.
                existing = self.repo.get_by_user_id(user_id)
                if existing is None:
                    raise UserNotFoundError()
                record = existing

        record.schema_version = DISPLAY_SETTINGS_VERSION
        record.settings = payload
        record.updated_at = utcnow()
        return self.repo.update(record)

    def reset(self, user_id: int) -> None:
        """Đặt lại mặc định = xóa bản đã lưu. Gọi nhiều lần vẫn an toàn."""
        record = self.repo.get_by_user_id(user_id)
        if record:
            self.repo.delete(record)
