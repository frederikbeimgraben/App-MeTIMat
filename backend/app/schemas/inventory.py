from pydantic import BaseModel

class InventoryBase(BaseModel):
    location_id: int
    medication_id: int
    quantity: int

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    quantity: int

class Inventory(InventoryBase):
    id: int

    class Config:
        from_attributes = True
