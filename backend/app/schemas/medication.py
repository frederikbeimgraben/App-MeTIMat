"""
Pydantic schemas for Medication models in the MeTIMat application.

This module defines the data structures used for data validation,
serialization, and deserialization of medication-related data in the API.
"""

from pydantic import BaseModel


# Medication Schemas
class MedicationBase(BaseModel):
    """
    Base properties for a Medication, shared across creation and updates.

    Attributes:
        name: Common name of the medication.
        pzn: Pharma-Zentral-Nummer (unique identification number).
        description: Detailed description of the medication.
        dosage: Strength of the medication (e.g., "400mg").
        dosage_form: Physical form (e.g., "Tablet", "Syrup").
        manufacturer: Company that produces the medication.
        package_size: Quantity per package.
        price: Unit price of the medication.
        category: Therapeutic or storage category.
        prescription_required: Whether the medication requires a prescription.
        is_active: Whether the medication is currently available.
    """

    name: str
    pzn: str
    description: str | None = None
    dosage: str | None = None
    dosage_form: str | None = None
    manufacturer: str | None = None
    package_size: str | None = None
    price: float | None = 0.0
    category: str | None = "all"
    prescription_required: bool | None = False
    is_active: bool | None = True


class MedicationCreate(MedicationBase):
    """
    Schema for creating a new medication via the API.
    """

    pass


class MedicationUpdate(BaseModel):
    """
    Schema for updating an existing medication via the API.
    All fields are optional.
    """

    name: str | None = None
    pzn: str | None = None
    description: str | None = None
    dosage: str | None = None
    dosage_form: str | None = None
    manufacturer: str | None = None
    package_size: str | None = None
    price: float | None = None
    category: str | None = None
    prescription_required: bool | None = None
    is_active: bool | None = None


class MedicationInDBBase(MedicationBase):
    """
    Base schema for medication data as stored in the database.

    Attributes:
        id: The unique identifier assigned by the database.
    """

    id: int

    class Config:
        from_attributes = True


class Medication(MedicationInDBBase):
    """
    Schema for medication data returned to the client via the API.
    """

    pass
