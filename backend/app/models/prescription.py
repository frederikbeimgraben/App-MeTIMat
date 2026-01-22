from datetime import datetime

from app.db.session import Base, engine
from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, text
from sqlalchemy.orm import relationship


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
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


# Migration logic for existing databases
def migrate_prescriptions_table():
    try:
        with engine.connect() as conn:
            # Check if user_id column exists
            res = conn.execute(
                text(
                    "SELECT column_name FROM information_schema.columns WHERE table_name='prescriptions' AND column_name='user_id'"
                )
            ).fetchone()
            if not res:
                conn.execute(
                    text(
                        "ALTER TABLE prescriptions ADD COLUMN user_id INTEGER REFERENCES users(id)"
                    )
                )
                conn.commit()
    except Exception:
        # Ignore errors if table doesn't exist yet or other DB issues
        pass


migrate_prescriptions_table()
