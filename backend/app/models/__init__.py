"""
SQLAlchemy models for the MeTIMat application.

This package collects all database models to ensure they are registered
with the SQLAlchemy Base and easily accessible for imports elsewhere in the application.
"""

from app.db.session import Base  # noqa
from app.models.inventory import Inventory
from app.models.location import Location
from app.models.medication import Medication
from app.models.order import Order, OrderMedication
from app.models.prescription import Prescription
from app.models.user import User

__all__ = [
    "Base",
    "Inventory",
    "Location",
    "Medication",
    "Order",
    "OrderMedication",
    "Prescription",
    "User",
]
