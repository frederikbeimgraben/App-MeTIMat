"""
Dependency injection functions for the MeTIMat API.

This module provides common dependencies used in FastAPI endpoints,
such as database sessions and authentication/authorization checks.
"""

from typing import Generator

from app.core.config import settings
from app.core.security import ALGORITHM
from app.db.session import SessionLocal
from app.models.user import User
from app.schemas.user import TokenPayload
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session

# OAuth2 scheme for token-based authentication
reusable_oauth2 = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


def get_db() -> Generator:
    """
    Dependency to provide a SQLAlchemy database session.

    Yields:
        Session: A database session that is automatically closed after use.
    """
    db: Session | None = None
    try:
        db = SessionLocal()
        yield db
    finally:
        if db is not None:
            db.close()


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> User:
    """
    Dependency to retrieve the currently authenticated user from the JWT token.

    Args:
        db: Database session.
        token: JWT access token.

    Returns:
        User: The authenticated user instance.

    Raises:
        HTTPException: If the token is invalid, user doesn't exist, or user is inactive.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = db.query(User).filter(User.id == token_data.sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:  # type: ignore
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to verify that the current user has superuser privileges.

    Args:
        current_user: The authenticated user from get_current_user.

    Returns:
        User: The authenticated superuser.

    Raises:
        HTTPException: If the user does not have superuser privileges.
    """
    if not current_user.is_superuser:  # type: ignore
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user
