import os
import subprocess
from typing import Optional

from pydantic import EmailStr
from pydantic_settings import BaseSettings


def get_commit_sha() -> str:
    """Attempt to get the current git commit SHA."""
    sha = os.getenv("COMMIT_SHA")
    if sha:
        return sha
    try:
        return (
            subprocess.check_output(["git", "rev-parse", "--short", "HEAD"])
            .decode("ascii")
            .strip()
        )
    except Exception:
        return "dev"


class Settings(BaseSettings):
    PROJECT_NAME: str = "MeTIMat"
    COMMIT_SHA: str = get_commit_sha()
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.environ["SECRET_KEY"]
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    FRONTEND_HOST: str = os.getenv("FRONTEND_HOST", "http://localhost:8081")

    # Mocking
    ENABLE_MOCK_PRESCRIPTIONS: bool = (
        os.getenv("ENABLE_MOCK_PRESCRIPTIONS", "True").lower() == "true"
    )
    MOCK_PRESCRIPTION_PZN: str = os.getenv("MOCK_PRESCRIPTION_PZN", "87654321")
    MOCK_PRESCRIPTION_NAME: str = os.getenv(
        "MOCK_PRESCRIPTION_NAME", "Amoxicillin 1000mg"
    )
    ADMIN_PASS: str = os.environ["ADMIN_PW"]

    # Database
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "postgresql")
    POSTGRES_USER: str = os.getenv("DB_USERNAME", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("DB_DATABASE", "metimat")
    SQLALCHEMY_DATABASE_URI: str = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}/{POSTGRES_DB}"

    # FHIR Settings
    FHIR_PROFILE_VERSION: str = "1.6.1"
    FHIR_BASE_URL: str = "https://gematik.de/fhir/erezept-workflow"

    # SMTP Settings
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "True").lower() == "true"
    SMTP_PORT: Optional[int] = int(os.getenv("SMTP_PORT", "587"))
    SMTP_HOST: Optional[str] = os.getenv("SMTP_HOST")
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    EMAILS_FROM_EMAIL: Optional[EmailStr] = os.getenv("EMAILS_FROM_EMAIL")
    EMAILS_FROM_NAME: Optional[str] = os.getenv("EMAILS_FROM_NAME", "MeTIMat")

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
