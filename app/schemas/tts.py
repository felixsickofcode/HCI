from pydantic import Field

from app.schemas.base import CamelModel


class SpeechRequest(CamelModel):
    """Một đoạn văn cần đọc thành tiếng.

    `rate` là phần trăm so với tốc độ gốc, giống núm tốc độ của trang đọc.
    """

    text: str = Field(min_length=1)
    voice: str | None = None
    rate: int = Field(default=0, ge=-50, le=50)


class SpeechBoundary(CamelModel):
    text: str
    offset_ms: int
    duration_ms: int


class SpeechResponse(CamelModel):
    audio_base64: str
    mime_type: str = "audio/mpeg"
    voice: str
    duration_ms: int
    boundaries: list[SpeechBoundary] = Field(default_factory=list)
    cached: bool = False


class VoiceList(CamelModel):
    voices: list[str]
    default: str
