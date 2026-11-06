from datetime import datetime
from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

if TYPE_CHECKING:
    from app.models.display_settings import UserDisplaySettings

# Tăng số này khi đổi cấu trúc cài đặt (xem mục 1.3 của tài liệu thiết kế FR-03).
DISPLAY_SETTINGS_VERSION = 1


class CamelModel(BaseModel):
    """JSON gửi/nhận dùng camelCase (fontSize) để khớp với frontend."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class FocusSettings(CamelModel):
    enabled: bool = False
    dim_opacity: float = Field(default=0.6, ge=0.5, le=0.8)
    follow_pointer: bool = False


class DisplaySettings(CamelModel):
    """Bộ cài đặt hiển thị. Trường thiếu sẽ lấy giá trị mặc định."""

    font_family: Literal["lexend", "arial", "verdana", "opendyslexic"] = "lexend"
    font_size: int = Field(default=20, ge=16, le=32)
    line_height: float = Field(default=1.8, ge=1.5, le=2.5)
    letter_spacing: float = Field(default=0.08, ge=0, le=0.2)
    theme: Literal["cream", "softGray", "dark"] = "cream"
    column_width: int = Field(default=60, ge=30, le=80)
    focus: FocusSettings = Field(default_factory=FocusSettings)


class DisplaySettingsWrite(CamelModel):
    """Nội dung gửi lên khi lưu: PUT /me/display-settings."""

    display: DisplaySettings


class DisplaySettingsRead(CamelModel):
    """Nội dung trả về khi đọc/lưu."""

    version: int
    updated_at: datetime
    display: DisplaySettings

    @classmethod
    def from_record(cls, record: "UserDisplaySettings") -> "DisplaySettingsRead":
        return cls(
            version=record.schema_version,
            updated_at=record.updated_at,
            display=DisplaySettings.model_validate(record.settings),
        )
