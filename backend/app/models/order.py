from datetime import datetime

from app.db.session import Base
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship


class OrderMedication(Base):
    __tablename__ = "order_medication_association"

    order_id = Column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), primary_key=True
    )
    medication_id = Column(
        Integer, ForeignKey("medications.id", ondelete="CASCADE"), primary_key=True
    )
    quantity = Column(Integer, default=1, nullable=False)

    # Relationships to access the objects from the association
    order = relationship("Order", back_populates="medication_items")
    medication = relationship("Medication")


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

    # Use the association object instead of secondary for quantity support
    medication_items = relationship(
        "OrderMedication", back_populates="order", cascade="all, delete-orphan"
    )

    @property
    def medications(self):
        """Helper property to maintain backward compatibility for medication access"""
        return [item.medication for item in self.medication_items]
