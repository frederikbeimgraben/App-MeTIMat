from typing import Any, List

from app.api import deps
from app.models.master_data import Location as LocationModel
from app.models.user import User as UserModel
from app.schemas.master_data import Location, LocationCreate, LocationUpdate
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/", response_model=List[Location])
def read_locations(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve locations (Pharmacies/Doctors).
    """
    locations = db.query(LocationModel).offset(skip).limit(limit).all()
    return locations


@router.post("/", response_model=Location)
def create_location(
    *,
    db: Session = Depends(deps.get_db),
    location_in: LocationCreate,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create new location (Admin only).
    """
    location = LocationModel(**location_in.model_dump())
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


@router.put("/{id}", response_model=Location)
def update_location(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    location_in: LocationUpdate,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update a location (Admin only).
    """
    location = db.query(LocationModel).filter(LocationModel.id == id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    update_data = location_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(location, field, value)

    db.add(location)
    db.commit()
    db.refresh(location)
    return location


@router.delete("/{id}", response_model=Location)
def delete_location(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Delete a location (Admin only).
    """
    location = db.query(LocationModel).filter(LocationModel.id == id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    db.delete(location)
    db.commit()
    return location
