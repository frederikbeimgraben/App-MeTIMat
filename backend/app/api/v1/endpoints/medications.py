from typing import Any, List

from app.api import deps
from app.models.master_data import Medication as MedicationModel
from app.models.user import User as UserModel
from app.schemas.master_data import Medication, MedicationCreate, MedicationUpdate
from fastapi import APIRouter, Depends, HTTPException, status
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
    Retrieve medications.
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
    Create new medication (Admin only).
    """
    medication = MedicationModel(**medication_in.model_dump())
    db.add(medication)
    db.commit()
    db.refresh(medication)
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
    Update a medication (Admin only).
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
