from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from .location import Location
from .prescription import Prescription


class OrderBase(BaseModel):
    status: Optional[str] = "pending"


class OrderCreate(OrderBase):
    location_id: Optional[int] = None
    prescription_ids: Optional[List[int]] = None


class OrderUpdate(OrderBase):
    status: Optional[str] = None


class OrderInDBBase(OrderBase):
    id: int
    user_id: int
    location_id: Optional[int] = None
    access_token: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Order(OrderInDBBase):
    prescriptions: List[Prescription] = []
    location: Optional[Location] = None


class QRScanRequest(BaseModel):
    qr_data: str


class QRValidationResponse(BaseModel):
    valid: bool
    order: Optional[Order] = None
    message: str
