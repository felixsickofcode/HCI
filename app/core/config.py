from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "HCI Backend"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()