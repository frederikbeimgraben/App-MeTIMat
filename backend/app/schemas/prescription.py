from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class PrescriptionBase(BaseModel):
    medication_name: Optional[str] = None
    pzn: Optional[str] = None
    fhir_data: Optional[Dict[str, Any]] = None


class PrescriptionCreate(PrescriptionBase):
    order_id: int
    medication_id: Optional[int] = None


class PrescriptionUpdate(PrescriptionBase):
    pass


class PrescriptionInDBBase(PrescriptionBase):
    id: int
    order_id: int
    medication_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Prescription(PrescriptionInDBBase):
    pass
