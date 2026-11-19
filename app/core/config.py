from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator

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

    SUMMARY_USE_LLM: bool = False
    SUMMARY_MAX_CHARS: int = 50_000
    SUMMARY_MAX_SEGMENTS: int = 300
    SUMMARY_MIN_CHARS: int = 300

    SUMMARY_TIMEOUT_SECONDS: float = Field(30.0, gt=0)   
    SUMMARY_RATE_LIMIT: int = Field(10, ge=1)              
    SUMMARY_RATE_WINDOW_SECONDS: int = Field(600, ge=1)

    LLM_API_KEY: str | None = None
    LLM_MODEL: str = "gemini-3.1-flash-lite"
    LLM_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"
    LLM_MAX_CONCURRENT: int = Field(2, ge=1)
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    GROQ_TIMEOUT_SECONDS: float = 20
    ASSIST_HOURLY_LIMIT: int = 20


    model_config = SettingsConfigDict(env_file=".env")


    @model_validator(mode="after")
    def _llm_needs_key(self) -> "Settings":
        if self.SUMMARY_USE_LLM and not self.LLM_API_KEY:
            raise ValueError("SUMMARY_USE_LLM=true nhưng chưa đặt LLM_API_KEY trong .env")
        return self
    
    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
