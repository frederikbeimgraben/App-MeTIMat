from typing import Optional

from pydantic import BaseModel


# Location Schemas
class LocationBase(BaseModel):
    name: str
    address: str
    latitude: float
    longitude: float
    opening_hours: Optional[str] = None
    is_pharmacy: Optional[bool] = True
    location_type: Optional[str] = "vending_machine"
    validation_key: Optional[str] = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(LocationBase):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    opening_hours: Optional[str] = None
    is_pharmacy: Optional[bool] = None
    location_type: Optional[str] = None
    validation_key: Optional[str] = None


class LocationInDBBase(LocationBase):
    id: int

    class Config:
        from_attributes = True


class Location(LocationInDBBase):
    is_available: bool = True
