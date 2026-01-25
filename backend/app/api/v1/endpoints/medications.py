"""
Medication catalog endpoints for the MeTIMat API.

This module provides routes for browsing the medication catalog,
as well as administrative routes for managing medication entries.
"""

from typing import Any, List

from app.api import deps
from app.models.medication import Medication as MedicationModel
from app.models.user import User as UserModel
from app.schemas.medication import Medication, MedicationCreate, MedicationUpdate
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/", response_model=List[Medication])
def read_medications(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve a list of medications.

    Args:
        db: Database session.
        skip: Number of records to skip for pagination.
        limit: Maximum number of records to return.
        current_user: The currently authenticated user.

    Returns:
        List[Medication]: A list of medication objects.
    """
    medications = db.query(MedicationModel).offset(skip).limit(limit).all()
    return medications


@router.post("/", response_model=Medication)
def create_medication(
    *,
    db: Session = Depends(deps.get_db),
    medication_in: MedicationCreate,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create a new medication entry. Accessible only by superusers.

    Args:
        db: Database session.
        medication_in: Medication creation schema.
        current_user: The authenticated superuser.

    Returns:
        Medication: The newly created medication object.
    """
    medication = MedicationModel(**medication_in.model_dump())
    db.add(medication)
    db.commit()
    db.refresh(medication)
    return medication


@router.get("/{id}", response_model=Medication)
def read_medication(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve a specific medication by its ID.

    Args:
        db: Database session.
        id: The ID of the medication to retrieve.
        current_user: The currently authenticated user.

    Returns:
        Medication: The medication object.

    Raises:
        HTTPException: If the medication with the specified ID does not exist.
    """
    medication = db.query(MedicationModel).filter(MedicationModel.id == id).first()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    return medication


@router.put("/{id}", response_model=Medication)
def update_medication(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    medication_in: MedicationUpdate,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update an existing medication entry. Accessible only by superusers.

    Args:
        db: Database session.
        id: The ID of the medication to update.
        medication_in: Medication update schema.
        current_user: The authenticated superuser.

    Returns:
        Medication: The updated medication object.

    Raises:
        HTTPException: If the medication with the specified ID does not exist.
    """
    medication = db.query(MedicationModel).filter(MedicationModel.id == id).first()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    update_data = medication_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(medication, field, value)

    db.add(medication)
    db.commit()
    db.refresh(medication)
    return medication


@router.delete("/{id}", response_model=Medication)
def delete_medication(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Delete a medication entry. Accessible only by superusers.

    Args:
        db: Database session.
        id: The ID of the medication to delete.
        current_user: The authenticated superuser.

    Returns:
        Medication: The deleted medication object.

    Raises:
        HTTPException: If the medication with the specified ID does not exist.
    """
    medication = db.query(MedicationModel).filter(MedicationModel.id == id).first()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    db.delete(medication)
    db.commit()
    return medication
