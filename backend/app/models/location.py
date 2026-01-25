"""
Location model for the MeTIMat application.

This module defines the SQLAlchemy model for physical locations, such as
pharmacies and automated vending machines, including their coordinates
and inventory associations.
"""

from app.db.session import Base
from sqlalchemy import Boolean, Column, Float, Integer, String
from sqlalchemy.orm import relationship


class Location(Base):
    """
    SQLAlchemy model representing a physical Location in the system.

    Attributes:
        id: Unique identifier for the location.
        name: Name of the location (e.g., "Main Street Pharmacy").
        address: Physical street address.
        latitude: Geographic latitude for mapping.
        longitude: Geographic longitude for mapping.
        opening_hours: Text description of operating hours.
        is_pharmacy: Boolean flag indicating if the location is a full pharmacy.
        location_type: Category of the location ('pharmacy' or 'vending_machine').
        validation_key: Optional key for hardware authentication/validation.
        inventory: Relationship to the inventory items stored at this location.
    """

    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    address = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    opening_hours = Column(String)
    is_pharmacy = Column(Boolean, default=True)
    location_type = Column(
        String, default="vending_machine"
    )  # 'pharmacy' or 'vending_machine'
    validation_key = Column(String, nullable=True)

    inventory = relationship("Inventory", back_populates="location")
