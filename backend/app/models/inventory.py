from app.db.session import Base
from sqlalchemy import Column, ForeignKey, Integer
from sqlalchemy.orm import relationship


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(
        Integer, ForeignKey("locations.id", ondelete="CASCADE"), index=True
    )
    medication_id = Column(Integer, ForeignKey("medications.id"), index=True)
    quantity = Column(Integer, default=0)

    location = relationship("Location", back_populates="inventory")
    medication = relationship("Medication")
