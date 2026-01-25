"""
Main router for version 1 of the MeTIMat API.

This module aggregates all the individual endpoint routers (auth, users,
prescriptions, medications, locations, and orders) into a single
APIRouter instance for inclusion in the main FastAPI application.
"""

from app.api.v1.endpoints import (
    auth,
    locations,
    medications,
    orders,
    prescriptions,
    users,
)
from fastapi import APIRouter

api_router = APIRouter()

# Authentication endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# User management endpoints
api_router.include_router(users.router, prefix="/users", tags=["users"])

# Prescription and e-Rezept endpoints
api_router.include_router(
    prescriptions.router, prefix="/prescriptions", tags=["prescriptions"]
)

# Medication catalog endpoints
api_router.include_router(
    medications.router, prefix="/medications", tags=["medications"]
)

# Physical location (pharmacy/vending machine) endpoints
api_router.include_router(locations.router, prefix="/locations", tags=["locations"])

# Order and fulfillment endpoints
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
