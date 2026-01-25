"""
Prescription model for the MeTIMat application.

This module defines the SQLAlchemy model for prescriptions, which can be linked
to users, medications, and orders. It also stores FHIR-compliant data for
electronic prescriptions (e-Rezept).
"""

from datetime import datetime

from app.db.session import Base
from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship


class Prescription(Base):
    """
    SQLAlchemy model representing a Prescription in the system.

    Attributes:
        id: Unique identifier for the prescription.
        user_id: Foreign key to the User who owns this prescription.
        order_id: Foreign key to the Order associated with this prescription.
        medication_id: Foreign key to the specific Medication if matched in the catalog.
        medication_name: Name of the medication as specified in the prescription.
        pzn: Pharma-Zentral-Nummer associated with the prescription.
        fhir_data: JSON blob containing the full FHIR MedicationRequest resource.
        created_at: Timestamp when the record was created.
        updated_at: Timestamp when the record was last updated.
        order: Relationship to the Order model.
        user: Relationship to the User model.
        medication: Relationship to the Medication model.
    """

    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    medication_id = Column(
        Integer, ForeignKey("medications.id", ondelete="CASCADE"), nullable=True
    )

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
