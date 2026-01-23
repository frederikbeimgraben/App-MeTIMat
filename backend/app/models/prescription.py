from datetime import datetime

from app.db.session import Base
from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    medication_id = Column(Integer, ForeignKey("medications.id"), nullable=True)

    # Basic details often required for display even without full FHIR parsing
    medication_name = Column(String, index=True, nullable=True)
    pzn = Column(String, index=True, nullable=True)

    # Storage for the full FHIR MedicationRequest resource or specific profile data
    fhir_data = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order = relationship("Order", back_populates="prescriptions")
    user = relationship("User")
    medication = relationship("Medication")
