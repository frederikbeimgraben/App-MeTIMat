from typing import Any, Dict, List, Optional

from app.api import deps
from app.core.config import settings
from app.models.user import User as UserModel
from app.services.fhir_service import fhir_service
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

router = APIRouter()


class QRValidationRequest(BaseModel):
    qr_data: str


class QRValidationResponse(BaseModel):
    valid: bool
    message: str
    profile: Optional[str] = None
    error: Optional[str] = None


@router.get("/", response_model=List[Dict[str, Any]])
def read_prescriptions(
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve prescriptions for the current user.
    """
    if settings.ENABLE_MOCK_PRESCRIPTIONS:
        bundle = fhir_service.create_mock_prescription(
            patient_name=current_user.full_name or "Max Mustermann"
        )
        # Extract MedicationRequest resources from the bundle to return as a list
        prescriptions = [
            entry["resource"]
            for entry in bundle.get("entry", [])
            if entry.get("resource", {}).get("resourceType") == "MedicationRequest"
        ]
        return prescriptions
    return []


@router.post("/validate-qr", response_model=QRValidationResponse)
def validate_qr(
    *,
    qr_request: QRValidationRequest,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Validates QR-Code data against FHIR Gematik profiles.
    """
    result = fhir_service.validate_qr_data(qr_request.qr_data)
    return result


@router.post("/mock-scan", response_model=Dict[str, Any])
def mock_scan_prescription(
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Endpoint for WebNFC mock scanner.
    Creates a FHIR-compliant mock prescription if enabled in settings.
    """
    if not settings.ENABLE_MOCK_PRESCRIPTIONS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mock prescription creation is disabled in server configuration.",
        )

    # Generate a mock FHIR Bundle
    prescription_bundle = fhir_service.create_mock_prescription(
        patient_name=current_user.full_name or "Max Mustermann"
    )

    return {
        "status": "success",
        "message": "Mock prescription created and added to account",
        "resource": prescription_bundle,
    }


@router.get("/config")
def get_prescription_config():
    """
    Returns frontend relevant configuration for prescriptions.
    """
    return {
        "mock_enabled": settings.ENABLE_MOCK_PRESCRIPTIONS,
        "profile_version": settings.FHIR_PROFILE_VERSION,
    }
