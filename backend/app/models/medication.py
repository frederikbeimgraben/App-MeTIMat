"""
Medication model for the MeTIMat application.

This module defines the SQLAlchemy model for medications, storing information
such as PZN, dosage, price, and prescription requirements.
"""

from app.db.session import Base
from sqlalchemy import Boolean, Column, Float, Integer, String


class Medication(Base):
    """
    SQLAlchemy model representing a Medication in the system.

    Attributes:
        id: Unique identifier for the medication.
        name: Common name of the medication.
        pzn: Pharma-Zentral-Nummer (unique identification number for medicinal products in Germany).
        description: Detailed description of the medication.
        dosage: Strength of the medication (e.g., "400mg").
        dosage_form: Physical form (e.g., "Tablet", "Syrup").
        manufacturer: Company that produces the medication.
        package_size: Quantity per package (e.g., "N1", "50 Stk").
        price: Unit price of the medication.
        category: Therapeutic or storage category (defaults to "all").
        prescription_required: Whether the medication requires a prescription to dispense.
        is_active: Whether the medication is currently available in the system catalog.
    """

    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    pzn = Column(
        String, unique=True, index=True, nullable=False
    )  # Pharma-Zentral-Nummer
    description = Column(String)
    dosage = Column(String)  # e.g. "400mg"
    dosage_form = Column(String)
    manufacturer = Column(String)
    package_size = Column(String)
    price = Column(Float, default=0.0)
    category = Column(String, default="all")
    prescription_required = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
