"""
Pydantic schemas for Inventory models in the MeTIMat application.

This module defines the data structures used for data validation,
serialization, and deserialization of inventory records, which track
medication stock levels at specific locations.
"""

from pydantic import BaseModel


class InventoryBase(BaseModel):
    """
    Base properties for an Inventory record, shared across creation and updates.

    Attributes:
        location_id: Foreign key to the associated Location.
        medication_id: Foreign key to the associated Medication.
        quantity: Current stock level of the medication at this location.
    """

    location_id: int
    medication_id: int
    quantity: int


class InventoryCreate(InventoryBase):
    """
    Schema for creating a new inventory record via the API.
    """

    pass


class InventoryUpdate(BaseModel):
    """
    Schema for updating the quantity of an existing inventory record.

    Attributes:
        quantity: New stock level to be set.
    """

    quantity: int


class Inventory(InventoryBase):
    """
    Schema for inventory data returned to the client via the API.

    Attributes:
        id: The unique identifier assigned by the database.
    """

    id: int

    class Config:
        from_attributes = True
