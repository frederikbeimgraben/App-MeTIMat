from datetime import datetime

from app.db.session import Base
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

# Association table for many-to-many relationship between Orders and Medications
order_medication_association = Table(
    "order_medication_association",
    Base.metadata,
    Column("order_id", Integer, ForeignKey("orders.id", ondelete="CASCADE")),
    Column("medication_id", Integer, ForeignKey("medications.id", ondelete="CASCADE")),
)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    location_id = Column(
        Integer, ForeignKey("locations.id", ondelete="SET NULL"), nullable=True
    )
    status = Column(String, default="pending", index=True)

    # Token used in the QR code to identify/validate the order
    access_token = Column(String, unique=True, index=True, nullable=True)
    total_price = Column(Float, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    location = relationship("Location")
    prescriptions = relationship("Prescription", back_populates="order")
    medications = relationship("Medication", secondary=order_medication_association)
