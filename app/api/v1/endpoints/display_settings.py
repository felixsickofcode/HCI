from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DisplaySettingsServiceDep
from app.schemas.display_settings import DisplaySettingsRead, DisplaySettingsWrite

router = APIRouter(prefix="/me/display-settings", tags=["display-settings"])


@router.get("", response_model=DisplaySettingsRead)
def get_display_settings(current_user: CurrentUser, service: DisplaySettingsServiceDep):
    """Lấy cài đặt đã lưu. Chưa lưu lần nào thì 404 (frontend dùng mặc định)."""
    return DisplaySettingsRead.from_record(service.get(current_user.id))


@router.put("", response_model=DisplaySettingsRead)
def save_display_settings(
        data: DisplaySettingsWrite,
        current_user: CurrentUser,
        service: DisplaySettingsServiceDep,
):
    """Lưu (thay toàn bộ) cài đặt hiển thị."""
    return DisplaySettingsRead.from_record(service.save(current_user.id, data.display))


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def reset_display_settings(current_user: CurrentUser, service: DisplaySettingsServiceDep):
    """Đặt lại mặc định (xóa bản đã lưu)."""
    service.reset(current_user.id)