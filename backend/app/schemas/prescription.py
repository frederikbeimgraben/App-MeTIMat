"""
Pydantic schemas for Prescription models in the MeTIMat application.

This module defines the data structures used for data validation,
serialization, and deserialization of prescription-related data,
including FHIR-compliant e-prescription information.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class PrescriptionBase(BaseModel):
    """
    Base properties for a Prescription, shared across creation and updates.

    Attributes:
        medication_name: Name of the medication as specified in the prescription.
        pzn: Pharma-Zentral-Nummer associated with the medication.
        fhir_data: JSON-compatible dictionary containing the full FHIR resource data.
    """

    medication_name: str | None = None
    pzn: str | None = None
    fhir_data: Dict[str, Any] | None = None


class PrescriptionCreate(PrescriptionBase):
    """
    Schema for creating a new prescription via the API.

    Attributes:
        order_id: Optional ID of an order to link this prescription to.
        medication_id: Optional ID of a matched medication in the system catalog.
    """

    order_id: int | None = None
    medication_id: int | None = None


class PrescriptionUpdate(PrescriptionBase):
    """
    Schema for updating an existing prescription via the API.
    """

    pass


class PrescriptionInDBBase(PrescriptionBase):
    """
    Base schema for prescription data as stored in the database.

    Attributes:
        id: The unique identifier assigned by the database.
        order_id: The ID of the associated order, if any.
        medication_id: The ID of the associated catalog medication, if any.
        created_at: Timestamp of when the record was created.
        updated_at: Timestamp of when the record was last updated.
    """

    id: int
    order_id: int | None = None
    medication_id: int | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Prescription(PrescriptionInDBBase):
    """
    Schema for prescription data returned to the client via the API.
    """

    pass
