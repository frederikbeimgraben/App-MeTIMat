"""
Physical location management endpoints for the MeTIMat API.

This module provides routes for retrieving pharmacies and vending machines,
checking inventory availability at locations, and administrative routes
for managing location data.
"""

from typing import Any, List

from app.api import deps
from app.models.location import Location as LocationModel
from app.models.user import User as UserModel
from app.schemas.location import Location, LocationCreate, LocationUpdate
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/", response_model=List[Location])
def read_locations(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    medication_ids: str | None = None,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve a list of locations (Pharmacies/Vending Machines).

    If a comma-separated list of medication IDs is provided, the service
    calculates whether all those items are currently in stock at each location.

    Args:
        db: Database session.
        skip: Number of records to skip for pagination.
        limit: Maximum number of records to return.
        medication_ids: Optional comma-separated string of Medication IDs to check for availability.
        current_user: The currently authenticated user.

    Returns:
        List[Location]: A list of location objects, each with an 'is_available' flag.
    """
    locations = db.query(LocationModel).offset(skip).limit(limit).all()

    if medication_ids:
        from app.models.inventory import Inventory as InventoryModel

        ids = [int(i) for i in medication_ids.split(",") if i.strip()]

        for loc in locations:
            # Check if all requested medications are in stock (quantity > 0)
            available_items = (
                db.query(InventoryModel.medication_id)
                .filter(
                    InventoryModel.location_id == loc.id,
                    InventoryModel.medication_id.in_(ids),
                    InventoryModel.quantity > 0,
                )
                .all()
            )

            # Convert query result to a set of IDs
            available_set = {item[0] for item in available_items}
            loc.is_available = all(mid in available_set for mid in ids)
    else:
        for loc in locations:
            loc.is_available = True

    return locations


@router.post("/", response_model=Location)
def create_location(
    *,
    db: Session = Depends(deps.get_db),
    location_in: LocationCreate,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create a new location entry. Accessible only by superusers.

    Args:
        db: Database session.
        location_in: Location creation schema.
        current_user: The authenticated superuser.

    Returns:
        Location: The newly created location object.
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
    Update an existing location entry. Accessible only by superusers.

    Args:
        db: Database session.
        id: The ID of the location to update.
        location_in: Location update schema.
        current_user: The authenticated superuser.

    Returns:
        Location: The updated location object.

    Raises:
        HTTPException: If the location with the specified ID does not exist.
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
    Delete a location entry. Accessible only by superusers.

    Args:
        db: Database session.
        id: The ID of the location to delete.
        current_user: The authenticated superuser.

    Returns:
        Location: The deleted location object.

    Raises:
        HTTPException: If the location with the specified ID does not exist.
    """
    location = db.query(LocationModel).filter(LocationModel.id == id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    db.delete(location)
    db.commit()
    return location
