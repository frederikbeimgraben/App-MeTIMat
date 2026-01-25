"""
Pydantic schemas for Order models in the MeTIMat application.

This module defines the data structures used for data validation,
serialization, and deserialization of customer orders, including
QR code scanning and validation payloads.
"""

from datetime import datetime

from pydantic import BaseModel

from .location import Location
from .medication import Medication
from .prescription import Prescription


class OrderBase(BaseModel):
    """
    Base properties for an Order, shared across creation and updates.

    Attributes:
        status: Current status of the order (e.g., 'pending', 'completed').
    """

    status: str | None = "pending"


class OrderCreate(OrderBase):
    """
    Schema for creating a new order via the API.

    Attributes:
        location_id: ID of the location where the order will be picked up.
        prescription_ids: List of prescription IDs to include in the order.
        medication_ids: List of over-the-counter medication IDs to include.
    """

    location_id: int | None = None
    prescription_ids: list[int] | None = None
    medication_ids: list[int] | None = None


class OrderUpdate(OrderBase):
    """
    Schema for updating an existing order via the API.
    """

    status: str | None = None


class OrderInDBBase(OrderBase):
    """
    Base schema for order data as stored in the database.

    Attributes:
        id: Unique identifier assigned by the database.
        user_id: ID of the user who placed the order.
        location_id: ID of the pickup location.
        access_token: Unique token for QR code identification.
        total_price: Calculated total price of the order.
        created_at: Timestamp of order creation.
        updated_at: Timestamp of last update.
    """

    id: int
    user_id: int
    location_id: int | None = None
    access_token: str | None = None
    total_price: float = 0.0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderMedicationSchema(BaseModel):
    """
    Schema representing a medication item within an order, including quantity.

    Attributes:
        medication: The Medication object details.
        quantity: The number of units ordered.
    """

    medication: Medication
    quantity: int

    class Config:
        from_attributes = True


class Order(OrderInDBBase):
    """
    Schema for order data returned to the client via the API, including relationships.

    Attributes:
        prescriptions: List of full Prescription objects in the order.
        medication_items: List of medications with their quantities.
        medications: Helper list of Medication objects.
        location: The full Location object for the pickup point.
    """

    prescriptions: list[Prescription] = []
    medication_items: list[OrderMedicationSchema] = []
    medications: list[Medication] = []
    location: Location | None = None


class QRScanRequest(BaseModel):
    """
    Schema for a QR code scan request from the vending machine hardware.

    Attributes:
        qr_data: The raw string data read from the QR code.
    """

    qr_data: str


class QRValidationResponse(BaseModel):
    """
    Schema for the response to a QR code validation request.

    Attributes:
        valid: Whether the QR code/order is valid for the requesting location.
        order: The Order object if valid, otherwise None.
        message: Descriptive message about the validation result.
    """

    valid: bool
    order: Order | None = None
    message: str
