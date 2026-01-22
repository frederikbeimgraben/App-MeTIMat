import os
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "MeTIMat Backend"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # Mocking
    ENABLE_MOCK_PRESCRIPTIONS: bool = (
        os.getenv("ENABLE_MOCK_PRESCRIPTIONS", "True").lower() == "true"
    )
    MOCK_PRESCRIPTION_PZN: str = os.getenv("MOCK_PRESCRIPTION_PZN", "12345678")
    MOCK_PRESCRIPTION_NAME: str = os.getenv(
        "MOCK_PRESCRIPTION_NAME", "Ibuprofen 400mg Akut"
    )

    # Database
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "postgresql")
    POSTGRES_USER: str = os.getenv("DB_USERNAME", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("DB_DATABASE", "metimat")
    SQLALCHEMY_DATABASE_URI: str = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}/{POSTGRES_DB}"

    # FHIR Settings
    FHIR_PROFILE_VERSION: str = "1.6.1"
    FHIR_BASE_URL: str = "https://gematik.de/fhir/erezept-workflow"

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
