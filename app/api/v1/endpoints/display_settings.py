from fastapi import APIRouter, status

from app.api.deps import CurrentUserIdDep, DisplaySettingsServiceDep
from app.schemas.display_settings import DisplaySettingsRead, DisplaySettingsWrite

# "/me" = người dùng hiện tại (xác định trong deps.get_current_user_id)
router = APIRouter(prefix="/me/display-settings", tags=["display-settings"])


@router.get("", response_model=DisplaySettingsRead)
def get_display_settings(user_id: CurrentUserIdDep, service: DisplaySettingsServiceDep):
    """Lấy cài đặt đã lưu. Chưa lưu lần nào thì 404 (frontend dùng mặc định)."""
    return DisplaySettingsRead.from_record(service.get(user_id))


@router.put("", response_model=DisplaySettingsRead)
def save_display_settings(
        data: DisplaySettingsWrite,
        user_id: CurrentUserIdDep,
        service: DisplaySettingsServiceDep,
):
    """Lưu (thay toàn bộ) cài đặt hiển thị."""
    return DisplaySettingsRead.from_record(service.save(user_id, data.display))


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def reset_display_settings(user_id: CurrentUserIdDep, service: DisplaySettingsServiceDep):
    """Đặt lại mặc định (xóa bản đã lưu)."""
    service.reset(user_id)
