from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "HCI Backend"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str
    SECRET_KEY: str = "dev-secret-change-me-please-set-a-long-random-value"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    BACKEND_CORS_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173"
    )

    MAX_UPLOAD_MB: int = 10
    MAX_PDF_PAGES: int = 100
    MAX_OCR_PAGES: int = 10
    OCR_LANGUAGES: str = "vie+eng"
    TESSERACT_CMD: str | None = None

    SUMMARY_MAX_CHARS: int = 50_000
    SUMMARY_MAX_SEGMENTS: int = 500
    SUMMARY_MIN_CHARS: int = 300

    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    GROQ_TIMEOUT_SECONDS: float = Field(20.0, gt=0)

    ASSIST_HOURLY_LIMIT: int = Field(20, ge=1)
    TTS_DEFAULT_VOICE: str = "vi-VN-HoaiMyNeural"
    TTS_VOICES: str = "vi-VN-HoaiMyNeural,vi-VN-NamMinhNeural"
    TTS_MAX_CHARS: int = Field(2000, ge=1)
    TTS_HOURLY_LIMIT: int = Field(60, ge=1)
    TTS_CACHE_ITEMS: int = Field(64, ge=1)
    TTS_CACHE_BYTES: int = Field(32 * 1024 * 1024, ge=1)
    TTS_TIMEOUT_SECONDS: float = Field(20.0, gt=0)

    model_config = SettingsConfigDict(env_file=".env")

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.BACKEND_CORS_ORIGINS.split(",")
            if origin.strip()
        ]


settings = Settings()