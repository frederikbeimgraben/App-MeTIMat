from typing import Any, Dict, List, Optional

from app.api import deps
from app.core.config import settings
from app.models.medication import Medication as MedicationModel
from app.models.order import Order as OrderModel
from app.models.prescription import Prescription as PrescriptionModel
from app.models.user import User as UserModel
from app.schemas.prescription import Prescription, PrescriptionCreate
from app.services.fhir_service import fhir_service
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

router = APIRouter()


class QRImportRequest(BaseModel):
    qr_data: str


@router.get("/", response_model=List[Prescription])
def read_prescriptions(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve prescriptions belonging to the current user's orders.
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
    Simulates importing prescriptions from an electronic health card (eGK).
    In a real scenario, this would interface with the TI connector.
    This creates a mock order and populates it with prescriptions from the mock FHIR bundle.
    """
    if not settings.ENABLE_MOCK_PRESCRIPTIONS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mock prescription creation is disabled.",
        )

    # 1. Generate mock FHIR data
    bundle = fhir_service.create_mock_prescription(
        patient_name=current_user.full_name or "Max Mustermann"
    )

    imported_prescriptions = []

    # 2. Process bundle and save to DB
    for entry in bundle.get("entry", []):
        resource = entry.get("resource", {})
        if resource.get("resourceType") == "MedicationRequest":
            # Extract basic info for convenience columns
            med_name = settings.MOCK_PRESCRIPTION_NAME
            pzn = settings.MOCK_PRESCRIPTION_PZN

            # Try to get better info from the resource
            if "medication" in resource and "concept" in resource["medication"]:
                codings = resource["medication"]["concept"].get("coding", [])
                if codings:
                    med_name = codings[0].get("display", med_name)
                    pzn = codings[0].get("code", pzn)

            # Check if medication exists in our DB
            medication = (
                db.query(MedicationModel).filter(MedicationModel.pzn == pzn).first()
            )

            db_prescription = PrescriptionModel(
                user_id=current_user.id,
                order_id=None,
                medication_id=medication.id if medication else None,
                medication_name=med_name,
                pzn=pzn,
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
    Simulates scanning a physical prescription (e.g. via QR or NFC).
    Creates a mock prescription in the database.
    """
    if not settings.ENABLE_MOCK_PRESCRIPTIONS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mock prescription creation is disabled.",
        )

    # Generate mock FHIR
    bundle = fhir_service.create_mock_prescription(
        patient_name=current_user.full_name or "Max Mustermann"
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

    # Check if medication exists in our DB
    medication = (
        db.query(MedicationModel)
        .filter(MedicationModel.pzn == settings.MOCK_PRESCRIPTION_PZN)
        .first()
    )

    db_prescription = PrescriptionModel(
        user_id=current_user.id,
        order_id=None,
        medication_id=medication.id if medication else None,
        medication_name=settings.MOCK_PRESCRIPTION_NAME,
        pzn=settings.MOCK_PRESCRIPTION_PZN,
        fhir_data=jsonable_encoder(resource),
    )
    db.add(db_prescription)
    db.commit()
    db.refresh(db_prescription)

    return db_prescription


@router.get("/config")
def get_prescription_config():
    """
    Returns frontend relevant configuration for prescriptions.
    """
    return {
        "mock_enabled": settings.ENABLE_MOCK_PRESCRIPTIONS,
        "profile_version": settings.FHIR_PROFILE_VERSION,
    }
