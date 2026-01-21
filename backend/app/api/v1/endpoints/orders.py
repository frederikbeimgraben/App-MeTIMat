from typing import Any, Dict, List

from app.api import deps
from app.models.user import User as UserModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/", response_model=List[Dict[str, Any]])
def read_orders(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve orders (FHIR ServiceRequests) for the current user.
    """
    # Placeholder for persistent storage. Currently returns mock data.
    # In a full implementation, this would query a ServiceRequest table.
    mock_order = {
        "resourceType": "ServiceRequest",
        "id": "order-1",
        "status": "active",
        "intent": "order",
        "subject": {"reference": f"Patient/{current_user.id}"},
        "authoredOn": "2024-01-22T10:00:00Z",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://snomed.info/sct",
                        "code": "16076005",
                        "display": "Prescription drug",
                    }
                ]
            }
        ],
        "note": [{"text": "Sample order for Ibuprofen 400mg"}],
        "locationReference": [
            {"reference": "Location/1", "display": "MeTIMat Station Hauptbahnhof"}
        ],
    }
    return [mock_order]


@router.post("/", response_model=Dict[str, Any])
def create_order(
    *,
    db: Session = Depends(deps.get_db),
    order_in: Dict[str, Any],
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new order (FHIR ServiceRequest).
    """
    # Validation of FHIR resourceType
    if order_in.get("resourceType") != "ServiceRequest":
        raise HTTPException(
            status_code=400,
            detail="Invalid FHIR resource type. Expected ServiceRequest.",
        )

    # In a real scenario, we would save this to the database here.
    # For now, we echo back the order with an assigned ID.
    order_in["id"] = "new-order-id"
    order_in["status"] = "active"

    return order_in


@router.get("/{order_id}", response_model=Dict[str, Any])
def read_order_by_id(
    order_id: str,
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Get a specific order by ID.
    """
    # Mock lookup
    if order_id == "order-1":
        return {
            "resourceType": "ServiceRequest",
            "id": "order-1",
            "status": "active",
            "intent": "order",
            "subject": {"reference": f"Patient/{current_user.id}"},
            "authoredOn": "2024-01-22T10:00:00Z",
        }

    raise HTTPException(status_code=404, detail="Order not found")


@router.patch("/{order_id}/status", response_model=Dict[str, Any])
def update_order_status(
    *,
    db: Session = Depends(deps.get_db),
    order_id: str,
    status_update: Dict[str, str],
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Update the status of an existing order.
    """
    new_status = status_update.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status field is required")

    # Mock success
    return {"id": order_id, "status": new_status, "resourceType": "ServiceRequest"}
