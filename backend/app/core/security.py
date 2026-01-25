"""
Security utilities for the MeTIMat application.

This module provides functions for password hashing, password verification,
and the creation and validation of JSON Web Tokens (JWT) for authentication
and email verification.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Union

from app.core.config import settings
from jose import JWTError, jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def create_access_token(
    subject: Union[str, Any], expires_delta: timedelta | None = None
) -> str:
    """
    Generate a JSON Web Token (JWT) for authentication.

    Args:
        subject: The subject of the token (typically the user ID).
        expires_delta: Optional override for token expiration time.

    Returns:
        str: The encoded JWT.
    """
    if expires_delta is not None:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain text password against a hashed password.

    Args:
        plain_password: The password in plain text.
        hashed_password: The hashed password to compare against.

    Returns:
        bool: True if the password matches, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: The plain text password to hash.

    Returns:
        str: The hashed password.
    """
    return pwd_context.hash(password)


def generate_verification_token(email: str) -> str:
    """
    Generate a JWT for email verification purposes.

    Args:
        email: The email address to associate with the verification token.

    Returns:
        str: The encoded verification JWT.
    """
    delta = timedelta(hours=24)
    now = datetime.now(timezone.utc)
    expires = now + delta
    exp = expires.timestamp()
    encoded_jwt = jwt.encode(
        {"exp": exp, "nbf": now, "sub": email}, settings.SECRET_KEY, algorithm=ALGORITHM
    )
    return encoded_jwt


def verify_verification_token(token: str) -> str | None:
    """
    Verify an email verification token and extract the email.

    Args:
        token: The JWT verification token.

    Returns:
        str | None: The email address if the token is valid, otherwise None.
    """
    try:
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return decoded_token["sub"]
    except JWTError:
        return None
