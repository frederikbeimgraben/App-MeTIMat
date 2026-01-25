"""
Authentication endpoints for the MeTIMat API.

This module provides routes for user login (issuing JWT tokens),
registration, token testing, and email verification.
"""

from datetime import timedelta
from typing import Any

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User as UserModel
from app.schemas.user import Token, UserCreate
from app.schemas.user import User as UserSchema
from app.services.email import send_verification_email
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

router = APIRouter()


@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.

    Args:
        db: Database session.
        form_data: OAuth2 password request form containing username (email) and password.

    Returns:
        Token: A dictionary containing the access token and token type.

    Raises:
        HTTPException: If credentials are incorrect, user is inactive, or email is not verified.
    """
    user = db.query(UserModel).filter(UserModel.email == form_data.username).first()
    if not user or not security.verify_password(
        form_data.password,
        user.hashed_password,  # type: ignore
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )
    elif not user.is_active:  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    elif not user.is_verified:  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not verified",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }


@router.post("/test-token", response_model=UserSchema)
def test_token(current_user: UserModel = Depends(deps.get_current_user)) -> Any:
    """
    Test access token by returning the current user.

    Args:
        current_user: The currently authenticated user.

    Returns:
        UserSchema: The user object.
    """
    return current_user


@router.post("/register", response_model=UserSchema)
def register_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
) -> Any:
    """
    Register a new user and send a verification email.

    Args:
        db: Database session.
        user_in: User creation schema.

    Returns:
        UserSchema: The newly created user object.

    Raises:
        HTTPException: If a user with the provided email already exists.
    """
    user = db.query(UserModel).filter(UserModel.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )

    db_obj = UserModel(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        is_superuser=False,
        is_active=True,
        is_verified=False,
        newsletter=user_in.newsletter,
        accepted_terms=user_in.accepted_terms,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    verification_token = security.generate_verification_token(user_in.email)
    send_verification_email(email_to=user_in.email, token=verification_token)

    return db_obj


@router.get("/verify-email")
def verify_email(
    token: str,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Verify a user's email address using a verification token.

    Args:
        token: The verification JWT token from the email link.
        db: Database session.

    Returns:
        dict: A success message.

    Raises:
        HTTPException: If the token is invalid/expired or the user does not exist.
    """
    email = security.verify_verification_token(token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )
    user = db.query(UserModel).filter(UserModel.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    user.is_verified = True  # type: ignore
    db.add(user)
    db.commit()
    return {"message": "Email verified successfully"}
