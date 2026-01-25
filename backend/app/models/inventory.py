"""
Inventory model for the MeTIMat application.

This module defines the SQLAlchemy model for tracking stock levels of
medications at specific physical locations.
"""

from app.db.session import Base
from sqlalchemy import Column, ForeignKey, Integer
from sqlalchemy.orm import relationship


class Inventory(Base):
    """
    SQLAlchemy model representing the inventory of a medication at a specific location.

    Attributes:
        id: Unique identifier for the inventory record.
        location_id: Foreign key to the associated Location.
        medication_id: Foreign key to the associated Medication.
        quantity: Current stock level of the medication at this location.
        location: Relationship to the Location model.
        medication: Relationship to the Medication model.
    """

    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(
        Integer, ForeignKey("locations.id", ondelete="CASCADE"), index=True
    )
    medication_id = Column(
        Integer, ForeignKey("medications.id", ondelete="CASCADE"), index=True
    )
    quantity = Column(Integer, default=0)

    location = relationship("Location", back_populates="inventory")
    medication = relationship("Medication")
