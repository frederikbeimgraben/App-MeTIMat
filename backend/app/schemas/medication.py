from typing import Optional

from pydantic import BaseModel


# Medication Schemas
class MedicationBase(BaseModel):
    name: str
    pzn: str
    description: Optional[str] = None
    dosage_form: Optional[str] = None
    manufacturer: Optional[str] = None
    package_size: Optional[str] = None
    price: Optional[float] = 0.0
    is_active: Optional[bool] = True


class MedicationCreate(MedicationBase):
    pass


class MedicationUpdate(MedicationBase):
    name: Optional[str] = None
    pzn: Optional[str] = None
    price: Optional[float] = None


class MedicationInDBBase(MedicationBase):
    id: int

    class Config:
        from_attributes = True


class Medication(MedicationInDBBase):
    pass
