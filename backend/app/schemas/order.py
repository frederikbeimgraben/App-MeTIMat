from datetime import datetime

from pydantic import BaseModel

from .location import Location
from .medication import Medication
from .prescription import Prescription


class OrderBase(BaseModel):
    status: str | None = "pending"


class OrderCreate(OrderBase):
    location_id: int | None = None
    prescription_ids: list[int] | None = None
    medication_ids: list[int] | None = None


class OrderUpdate(OrderBase):
    status: str | None = None


class OrderInDBBase(OrderBase):
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
    medication: Medication
    quantity: int

    class Config:
        from_attributes = True


class Order(OrderInDBBase):
    prescriptions: list[Prescription] = []
    medication_items: list[OrderMedicationSchema] = []
    medications: list[Medication] = []
    location: Location | None = None


class QRScanRequest(BaseModel):
    qr_data: str


class QRValidationResponse(BaseModel):
    valid: bool
    order: Order | None = None
    message: str
