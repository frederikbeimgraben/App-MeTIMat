from app.db.session import Base
from sqlalchemy import Boolean, Column, Float, Integer, String


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    pzn = Column(
        String, unique=True, index=True, nullable=False
    )  # Pharma-Zentral-Nummer
    description = Column(String)
    dosage_form = Column(String)
    is_active = Column(Boolean, default=True)


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    address = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    opening_hours = Column(String)
    is_pharmacy = Column(Boolean, default=True)
