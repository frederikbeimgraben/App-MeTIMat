from app.db.session import Base
from sqlalchemy import Boolean, Column, Float, Integer, String
from sqlalchemy.orm import relationship


class Location(Base):
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
