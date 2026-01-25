from pydantic import BaseModel


# Location Schemas
class LocationBase(BaseModel):
    name: str
    address: str
    latitude: float
    longitude: float
    opening_hours: str | None = None
    is_pharmacy: bool | None = True
    location_type: str | None = "vending_machine"
    validation_key: str | None = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(LocationBase):
    name: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    opening_hours: str | None = None
    is_pharmacy: bool | None = None
    location_type: str | None = None
    validation_key: str | None = None


class LocationInDBBase(LocationBase):
    id: int

    class Config:
        from_attributes = True


class Location(LocationInDBBase):
    is_available: bool = True
