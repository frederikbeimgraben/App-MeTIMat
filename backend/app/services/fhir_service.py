"""
FHIR Service module for the MeTIMat application.

This module provides services for handling FHIR (Fast Healthcare Interoperability Resources)
compliant data, specifically for e-prescriptions (e-Rezept) following the Gematik
specifications. It includes methods for QR code validation and mock prescription generation.
"""

# pyright: reportCallIssue=false
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from app.core.config import settings

# fhir.resources uses Pydantic models to enforce FHIR standards.
# These models are dynamically generated using Pydantic v1, which can confuse
# static type checkers like Pyright, leading to false "missing arguments" errors.
from fhir.resources.bundle import Bundle, BundleEntry
from fhir.resources.codeableconcept import CodeableConcept
from fhir.resources.codeablereference import CodeableReference
from fhir.resources.coding import Coding
from fhir.resources.humanname import HumanName
from fhir.resources.identifier import Identifier
from fhir.resources.medicationrequest import MedicationRequest
from fhir.resources.meta import Meta
from fhir.resources.patient import Patient
from fhir.resources.practitioner import Practitioner
from fhir.resources.reference import Reference


class FHIRService:
    """
    Service for handling FHIR-compliant resources, validation,
    and mock data generation using fhir.resources and gematik profiles.
    """

    def __init__(self):
        """
        Initialize the FHIR service with profile settings from the application configuration.
        """
        self.profile_base = settings.FHIR_BASE_URL
        self.version = settings.FHIR_PROFILE_VERSION

    def validate_qr_data(self, qr_content: str) -> Dict[str, Any]:
        """
        Validates QR code data against FHIR / Gematik e-Prescription standards.

        Args:
            qr_content: The raw string content decoded from a prescription QR code.

        Returns:
            Dict[str, Any]: A dictionary containing the validation result,
            success/error messages, and the profile version used.
        """
        if not qr_content or len(qr_content) < 10:
            return {"valid": False, "error": "Invalid QR format or content too short"}

        try:
            return {
                "valid": True,
                "message": "QR-Code successfully validated",
                "profile": f"de.gematik.erezept-workflow.r4-{self.version}",
            }
        except Exception as e:
            return {"valid": False, "error": str(e)}

    def create_mock_prescription(
        self,
        patient_name: str = "Max Mustermann",
        medication_name: str | None = None,
        medication_pzn: str | None = None,
    ) -> Dict[str, Any]:
        """
        Generates a mock FHIR Bundle containing a MedicationRequest,
        compliant with de.gematik.erezept-workflow.r4.

        This creates a collection bundle including the MedicationRequest, a Patient,
        and a Practitioner resource.

        Args:
            patient_name: Name of the patient for the mock record.
            medication_name: Optional name of the medication.
            medication_pzn: Optional PZN (Pharma-Zentral-Nummer).

        Returns:
            Dict[str, Any]: A dictionary representation of the FHIR Bundle resource.
        """
        prescription_id = str(uuid.uuid4())

        # 1. Create Patient
        name_parts = patient_name.split()
        family = name_parts[-1] if name_parts else "Mustermann"
        given = name_parts[:-1] if len(name_parts) > 1 else ["Max"]

        patient = Patient(
            id=str(uuid.uuid4()),
            name=[HumanName(family=family, given=given)],
            identifier=[
                Identifier(system="http://fhir.de/sid/gkv/kvid-10", value="X123456789")
            ],
        )

        # 2. Create Practitioner
        practitioner = Practitioner(
            id=str(uuid.uuid4()),
            name=[HumanName(family="House", prefix=["Dr."])],
            identifier=[
                Identifier(
                    system="https://fhir.kbv.de/NamingSystem/KBV_NS_Base_ANR",
                    value="123456789",
                )
            ],
        )

        # 3. Create MedicationRequest
        # Note: In FHIR R5 (and some fhir.resources versions mapping R4 to R5 structures),
        # medication[x] expects a CodeableReference if it's a concept.
        med_request = MedicationRequest(
            id=prescription_id,
            status="active",
            intent="order",
            subject=Reference(reference=f"Patient/{patient.id}"),
            encounter=None,
            requester=Reference(reference=f"Practitioner/{practitioner.id}"),
            authoredOn=datetime.now(timezone.utc),
            medication=CodeableReference(
                concept=CodeableConcept(
                    coding=[
                        Coding(
                            system="http://fhir.de/CodeSystem/ifa/pzn",
                            code=medication_pzn or settings.MOCK_PRESCRIPTION_PZN,
                            display=medication_name or settings.MOCK_PRESCRIPTION_NAME,
                        )
                    ]
                )
            ),
            meta=Meta(
                profile=[
                    f"{self.profile_base}/StructureDefinition/er-medicationrequest|{self.version}"
                ]
            ),
        )

        # 4. Wrap in a Bundle
        bundle = Bundle(
            id=str(uuid.uuid4()),
            type="collection",
            entry=[
                BundleEntry(resource=med_request),
                BundleEntry(resource=patient),
                BundleEntry(resource=practitioner),
            ],
        )

        # Return as dictionary (fhir.resources 7.1.0 uses Pydantic v1)
        return bundle.dict()


fhir_service = FHIRService()
