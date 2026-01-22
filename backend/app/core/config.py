import os
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "MeTIMat Backend"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.environ["SECRET_KEY"]
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # Mocking
    ENABLE_MOCK_PRESCRIPTIONS: bool = (
        os.getenv("ENABLE_MOCK_PRESCRIPTIONS", "True").lower() == "true"
    )
    MOCK_PRESCRIPTION_PZN: str = os.getenv("MOCK_PRESCRIPTION_PZN", "87654321")
    MOCK_PRESCRIPTION_NAME: str = os.getenv(
        "MOCK_PRESCRIPTION_NAME", "Amoxicillin 1000mg"
    )
    ADMIN_PASS: str = os.getenv(
        "ADMIN_PW", "6cd53aa5ef5ffb1fd309de0943c13338c4c05aa5f5f03745282e6a94731ffed2"
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
