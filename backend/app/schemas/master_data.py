from typing import Optional

from pydantic import BaseModel


# Medication Schemas
class MedicationBase(BaseModel):
    name: str
    pzn: str
    description: Optional[str] = None
    dosage_form: Optional[str] = None
    is_active: Optional[bool] = True


class MedicationCreate(MedicationBase):
    pass


class MedicationUpdate(MedicationBase):
    name: Optional[str] = None
    pzn: Optional[str] = None


class MedicationInDBBase(MedicationBase):
    id: int

    class Config:
        from_attributes = True


class Medication(MedicationInDBBase):
    pass


# Location Schemas
class LocationBase(BaseModel):
    name: str
    address: str
    latitude: float
    longitude: float
    opening_hours: Optional[str] = None
    is_pharmacy: Optional[bool] = True


class LocationCreate(LocationBase):
    pass


class LocationUpdate(LocationBase):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class LocationInDBBase(LocationBase):
    id: int

    class Config:
        from_attributes = True


class Location(LocationInDBBase):
    pass
