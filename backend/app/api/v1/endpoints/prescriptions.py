"""
Prescription management endpoints for the MeTIMat API.

This module provides routes for retrieving user prescriptions and simulating
the importation of electronic prescriptions (e-Rezept) from various sources
like electronic health cards (eGK) or scanned QR codes.
"""

import random
from typing import Any, List

from app.api import deps
from app.core.config import settings
from app.models.medication import Medication as MedicationModel
from app.models.order import Order as OrderModel
from app.models.prescription import Prescription as PrescriptionModel
from app.models.user import User as UserModel
from app.schemas.prescription import Prescription
from app.services.fhir_service import fhir_service
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

router = APIRouter()


class QRImportRequest(BaseModel):
    """
    Schema for a prescription import request via QR code.

    Attributes:
        qr_data: The encoded string data from the scanned QR code.
    """

    qr_data: str


@router.get("/", response_model=List[Prescription])
def read_prescriptions(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve prescriptions associated with the current user.

    Fetches prescriptions that either directly belong to the user or are linked
    to one of the user's orders.

    Args:
        db: Database session.
        skip: Number of records to skip for pagination.
        limit: Maximum number of records to return.
        current_user: The currently authenticated user.

    Returns:
        List[Prescription]: A list of prescription objects.
    """
    prescriptions = (
        db.query(PrescriptionModel)
        .outerjoin(OrderModel)
        .filter(
            or_(
                OrderModel.user_id == current_user.id,
                PrescriptionModel.user_id == current_user.id,
            )
        )
        .offset(skip)
        .limit(limit)
        .all()
    )
    return prescriptions


@router.post("/import/egk", response_model=List[Prescription])
def import_egk_prescriptions(
    *,
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Simulate importing prescriptions from an electronic health card (eGK).

    In a production scenario, this would interface with the Telematics Infrastructure (TI).
    Currently, it generates mock prescriptions based on available medications in the database.

    Args:
        db: Database session.
        current_user: The currently authenticated user.

    Returns:
        List[Prescription]: A list of the imported mock prescriptions.

    Raises:
        HTTPException: If mock prescriptions are disabled or no suitable medications exist.
    """
    if not settings.ENABLE_MOCK_PRESCRIPTIONS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mock prescription creation is disabled.",
        )

    # 1. Select a random prescription-required medication from the DB
    rx_medications = (
        db.query(MedicationModel).filter(MedicationModel.prescription_required).all()
    )

    if not rx_medications:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No prescription-required medications found in database.",
        )

    selected_med = random.choice(rx_medications)

    # 2. Generate mock FHIR data
    bundle = fhir_service.create_mock_prescription(
        patient_name=current_user.full_name or "Max Mustermann",  # type: ignore
        medication_name=selected_med.name,  # type: ignore
        medication_pzn=selected_med.pzn,  # type: ignore
    )

    imported_prescriptions = []

    # 3. Process bundle and save to DB
    for entry in bundle.get("entry", []):
        resource = entry.get("resource", {})
        if resource.get("resourceType") == "MedicationRequest":
            db_prescription = PrescriptionModel(
                user_id=current_user.id,
                order_id=None,
                medication_id=selected_med.id,
                medication_name=selected_med.name,
                pzn=selected_med.pzn,
                fhir_data=jsonable_encoder(resource),
            )
            db.add(db_prescription)
            imported_prescriptions.append(db_prescription)

    db.commit()
    for p in imported_prescriptions:
        db.refresh(p)

    return imported_prescriptions


@router.post("/import/scan", response_model=Prescription)
def import_scanned_prescription(
    *,
    db: Session = Depends(deps.get_db),
    import_in: QRImportRequest,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Simulate scanning a physical prescription QR code.

    Creates a mock prescription in the database using the provided QR data.

    Args:
        db: Database session.
        import_in: Data from the scanned QR code.
        current_user: The currently authenticated user.

    Returns:
        Prescription: The newly created mock prescription.

    Raises:
        HTTPException: If mock prescriptions are disabled or no suitable medications exist.
    """
    if not settings.ENABLE_MOCK_PRESCRIPTIONS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mock prescription creation is disabled.",
        )

    # 1. Select a random prescription-required medication from the DB
    rx_medications = (
        db.query(MedicationModel).filter(MedicationModel.prescription_required).all()
    )

    if not rx_medications:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No prescription-required medications found in database.",
        )

    selected_med = random.choice(rx_medications)

    # 2. Generate mock FHIR
    bundle = fhir_service.create_mock_prescription(
        patient_name=current_user.full_name or "Max Mustermann",  # type: ignore
        medication_name=selected_med.name,  # type: ignore
        medication_pzn=selected_med.pzn,  # type: ignore
    )

    # Take the first MedicationRequest from the bundle
    resource = next(
        (
            e["resource"]
            for e in bundle.get("entry", [])
            if e["resource"]["resourceType"] == "MedicationRequest"
        ),
        {},
    )

    db_prescription = PrescriptionModel(
        user_id=current_user.id,
        order_id=None,
        medication_id=selected_med.id,
        medication_name=selected_med.name,
        pzn=selected_med.pzn,
        fhir_data=jsonable_encoder(resource),
    )
    db.add(db_prescription)
    db.commit()
    db.refresh(db_prescription)

    return db_prescription


@router.get("/config")
def get_prescription_config():
    """
    Get prescription-related configuration for the frontend.

    Returns:
        dict: Configuration settings including mock status and FHIR version.
    """
    return {
        "mock_enabled": settings.ENABLE_MOCK_PRESCRIPTIONS,
        "profile_version": settings.FHIR_PROFILE_VERSION,
    }
