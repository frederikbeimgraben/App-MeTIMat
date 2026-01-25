"""
Pydantic schemas for Location models in the MeTIMat application.

This module defines the data structures used for data validation,
serialization, and deserialization of physical location data, such as
pharmacies and vending machines, in the API.
"""

from pydantic import BaseModel


# Location Schemas
class LocationBase(BaseModel):
    """
    Base properties for a Location, shared across creation and updates.

    Attributes:
        name: Name of the location (e.g., "Main Street Pharmacy").
        address: Physical street address.
        latitude: Geographic latitude for mapping.
        longitude: Geographic longitude for mapping.
        opening_hours: Text description of operating hours.
        is_pharmacy: Boolean flag indicating if the location is a full pharmacy.
        location_type: Category of the location ('pharmacy' or 'vending_machine').
        validation_key: Optional key for hardware authentication/validation.
    """

    name: str
    address: str
    latitude: float
    longitude: float
    opening_hours: str | None = None
    is_pharmacy: bool | None = True
    location_type: str | None = "vending_machine"
    validation_key: str | None = None


class LocationCreate(LocationBase):
    """
    Schema for creating a new location via the API.
    """

    pass


class LocationUpdate(LocationBase):
    """
    Schema for updating an existing location via the API.
    All fields are optional.
    """

    name: str | None = None  # type: ignore
    address: str | None = None
    latitude: float | None = None  # type: ignore
    longitude: float | None = None  # type: ignore
    opening_hours: str | None = None
    is_pharmacy: bool | None = None
    location_type: str | None = None
    validation_key: str | None = None


class LocationInDBBase(LocationBase):
    """
    Base schema for location data as stored in the database.

    Attributes:
        id: The unique identifier assigned by the database.
    """

    id: int

    class Config:
        from_attributes = True


class Location(LocationInDBBase):
    """
    Schema for location data returned to the client via the API.

    Attributes:
        is_available: Computed flag or status indicating if the location is currently operational.
    """

    is_available: bool = True
