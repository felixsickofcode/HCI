from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "HCI Backend"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str
    SECRET_KEY: str = "dev-secret-change-me-please-set-a-long-random-value"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    MAX_UPLOAD_MB: int = 10
    MAX_PDF_PAGES: int = 100
    MAX_OCR_PAGES: int = 10
    OCR_LANGUAGES: str = "vie+eng"
    TESSERACT_CMD: str | None = None


    model_config = SettingsConfigDict(env_file=".env")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()