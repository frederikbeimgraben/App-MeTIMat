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
    manufacturer = Column(String)
    package_size = Column(String)
    price = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
