"""
User management endpoints for the MeTIMat API.

This module provides routes for administrators to manage users (list, create, update, delete)
and for users to manage their own profiles.
"""

from typing import Any, List

from app.api import deps
from app.core import security
from app.models.order import Order as OrderModel
from app.models.prescription import Prescription as PrescriptionModel
from app.models.user import User as UserModel
from app.schemas.user import User, UserCreate, UserUpdate
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/", response_model=List[User])
def read_users(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve a list of all users. Accessible only by superusers.

    Args:
        db: Database session.
        skip: Number of records to skip for pagination.
        limit: Maximum number of records to return.
        current_user: The authenticated superuser.

    Returns:
        List[User]: A list of user objects.
    """
    users = db.query(UserModel).offset(skip).limit(limit).all()
    return users


@router.post("/", response_model=User)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create a new user. Accessible only by superusers.

    Args:
        db: Database session.
        user_in: User creation schema.
        current_user: The authenticated superuser.

    Returns:
        User: The newly created user object.

    Raises:
        HTTPException: If a user with the same email already exists.
    """
    user = db.query(UserModel).filter(UserModel.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )

    db_obj = UserModel(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        is_superuser=user_in.is_superuser,
        is_active=user_in.is_active,
        is_verified=user_in.is_verified,
        newsletter=user_in.newsletter,
        accepted_terms=user_in.accepted_terms,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.get("/me", response_model=User)
def read_user_me(
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Get the profile information of the currently authenticated user.

    Args:
        current_user: The currently authenticated user.

    Returns:
        User: The user object.
    """
    return current_user


@router.put("/me", response_model=User)
def update_user_me(
    *,
    db: Session = Depends(deps.get_db),
    password: str | None = None,
    full_name: str | None = None,
    email: str | None = None,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Update the profile of the currently authenticated user.

    Args:
        db: Database session.
        password: New password (optional).
        full_name: New full name (optional).
        email: New email address (optional).
        current_user: The currently authenticated user.

    Returns:
        User: The updated user object.
    """
    if password:
        current_user.hashed_password = security.get_password_hash(password)  # type: ignore
    if full_name:
        current_user.full_name = full_name  # type: ignore
    if email:
        current_user.email = email  # type: ignore

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/{user_id}", response_model=User)
def read_user_by_id(
    user_id: int,
    current_user: UserModel = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Get a specific user by ID. Users can view their own profile,
    but only superusers can view others.

    Args:
        user_id: The ID of the user to retrieve.
        current_user: The currently authenticated user.
        db: Database session.

    Returns:
        User: The user object.

    Raises:
        HTTPException: If the user is not a superuser and tries to access another's profile.
    """
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if user == current_user:
        return user
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return user


@router.put("/{user_id}", response_model=User)
def update_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update a user's information. Accessible only by superusers.

    Args:
        db: Database session.
        user_id: The ID of the user to update.
        user_in: User update schema.
        current_user: The authenticated superuser.

    Returns:
        User: The updated user object.

    Raises:
        HTTPException: If the user with the specified ID does not exist.
    """
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )

    update_data = user_in.model_dump(exclude_unset=True)
    if "password" in update_data:
        hashed_password = security.get_password_hash(update_data["password"])
        del update_data["password"]
        user.hashed_password = hashed_password  # type: ignore

    for field, value in update_data.items():
        setattr(user, field, value)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=User)
def delete_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Delete a user and their associated data. Accessible only by superusers.

    Args:
        db: Database session.
        user_id: The ID of the user to delete.
        current_user: The authenticated superuser.

    Returns:
        User: The deleted user object.

    Raises:
        HTTPException: If the user does not exist or if a superuser tries to delete themselves.
    """
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Users cannot delete themselves")

    # Manually delete associated data to avoid foreign key violations
    # since the database schema might not have been migrated with CASCADE yet.
    db.query(PrescriptionModel).filter(PrescriptionModel.user_id == user_id).delete()
    db.query(OrderModel).filter(OrderModel.user_id == user_id).delete()

    db.delete(user)
    db.commit()
    return user
