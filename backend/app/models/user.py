"""
User model for the MeTIMat application.

This module defines the SQLAlchemy model for users, including their
authentication details, profile information, and status flags.
"""

from app.db.session import Base
from sqlalchemy import Boolean, Column, Integer, String


class User(Base):
    """
    SQLAlchemy model representing a User in the system.

    Attributes:
        id: Unique identifier for the user.
        full_name: The user's full name.
        email: Unique email address used for login and notifications.
        hashed_password: The bcrypt hashed password.
        is_active: Whether the user account is currently active.
        is_superuser: Whether the user has administrative privileges.
        is_verified: Whether the user's email address has been verified.
        newsletter: Whether the user has opted into the newsletter.
        accepted_terms: Whether the user has accepted the terms of service.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean(), default=True)
    is_superuser = Column(Boolean(), default=False)
    is_verified = Column(Boolean(), default=False)
    newsletter = Column(Boolean(), default=False)
    accepted_terms = Column(Boolean(), default=False)
