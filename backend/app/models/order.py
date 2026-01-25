"""
Order and OrderMedication models for the MeTIMat application.

This module defines the SQLAlchemy models for customer orders and the
many-to-many association with medications, including quantities and status tracking.
"""

from datetime import datetime

from app.db.session import Base
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship


class OrderMedication(Base):
    """
    Association model between Orders and Medications to support quantities.

    Attributes:
        order_id: Foreign key to the associated Order.
        medication_id: Foreign key to the associated Medication.
        quantity: Number of units of this medication in the order.
        order: Relationship back to the Order model.
        medication: Relationship to the Medication model.
    """

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
    """
    SQLAlchemy model representing a customer Order in the system.

    Attributes:
        id: Unique identifier for the order.
        user_id: Foreign key to the User who placed the order.
        location_id: Foreign key to the Location where the order is to be picked up.
        status: Current status of the order (e.g., 'pending', 'completed', 'cancelled').
        access_token: Unique token used in QR codes for order validation/pickup.
        total_price: Total cost of the order.
        created_at: Timestamp when the order was created.
        updated_at: Timestamp when the order was last updated.
        user: Relationship to the User model.
        location: Relationship to the Location model.
        prescriptions: Relationship to the Prescriptions included in this order.
        medication_items: Relationship to the OrderMedication association records.
    """

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
        """
        Helper property to maintain backward compatibility for medication access.

        Returns:
            list: A list of Medication objects associated with this order.
        """
        return [item.medication for item in self.medication_items]
