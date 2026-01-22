from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from .prescription import Prescription


class OrderBase(BaseModel):
    status: Optional[str] = "pending"


class OrderCreate(OrderBase):
    pass


class OrderUpdate(OrderBase):
    status: Optional[str] = None


class OrderInDBBase(OrderBase):
    id: int
    user_id: int
    access_token: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Order(OrderInDBBase):
    prescriptions: List[Prescription] = []
