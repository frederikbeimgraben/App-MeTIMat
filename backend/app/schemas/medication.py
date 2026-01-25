from pydantic import BaseModel


# Medication Schemas
class MedicationBase(BaseModel):
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
    pass


class MedicationUpdate(BaseModel):
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
    id: int

    class Config:
        from_attributes = True


class Medication(MedicationInDBBase):
    pass
