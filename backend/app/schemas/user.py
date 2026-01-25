"""
Pydantic schemas for User models in the MeTIMat application.

This module defines the data structures used for data validation,
serialization, and deserialization of user-related data in the API.
"""

from pydantic import BaseModel, EmailStr


# Shared properties
class UserBase(BaseModel):
    """
    Base properties for a User, shared across creation and updates.

    Attributes:
        email: Email address of the user.
        is_active: Whether the user account is active.
        is_superuser: Whether the user has administrative privileges.
        full_name: The user's full name.
        is_verified: Whether the user's email has been verified.
        newsletter: Whether the user is subscribed to the newsletter.
        accepted_terms: Whether the user has accepted terms and conditions.
    """

    email: EmailStr | None = None
    is_active: bool | None = True
    is_superuser: bool = False
    full_name: str | None = None
    is_verified: bool = False
    newsletter: bool = False
    accepted_terms: bool = False


# Properties to receive via API on creation
class UserCreate(UserBase):
    """
    Schema for creating a new user via the API.

    Attributes:
        email: Required email address.
        password: Plain text password to be hashed.
    """

    email: EmailStr
    password: str


# Properties to receive via API on update
class UserUpdate(UserBase):
    """
    Schema for updating an existing user via the API.

    Attributes:
        password: Optional new plain text password.
    """

    password: str | None = None


class UserInDBBase(UserBase):
    """
    Base schema for user data as stored in the database.

    Attributes:
        id: The unique identifier assigned by the database.
    """

    id: int | None = None

    class Config:
        from_attributes = True


# Additional properties to return via API
class User(UserInDBBase):
    """
    Schema for user data returned to the client via the API.
    """

    pass


# Additional properties stored in DB
class UserInDB(UserInDBBase):
    """
    Schema for user data including the hashed password for internal use.

    Attributes:
        hashed_password: The bcrypt hashed password string.
    """

    hashed_password: str


# Token schemas
class Token(BaseModel):
    """
    Schema for the authentication token returned after successful login.

    Attributes:
        access_token: The JWT access token string.
        token_type: The type of token (e.g., "bearer").
    """

    access_token: str
    token_type: str


class TokenPayload(BaseModel):
    """
    Schema for the payload contained within a decoded JWT.

    Attributes:
        sub: The subject of the token (typically the user ID).
    """

    sub: int | None = None
