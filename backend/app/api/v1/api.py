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

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(
    prescriptions.router, prefix="/prescriptions", tags=["prescriptions"]
)
api_router.include_router(
    medications.router, prefix="/medications", tags=["medications"]
)
api_router.include_router(locations.router, prefix="/locations", tags=["locations"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
