import logging
from typing import Any, List, Optional

from app.api import deps

logger = logging.getLogger(__name__)
from app.core.config import settings
from app.models.order import Order as OrderModel
from app.models.user import User as UserModel
from app.schemas.order import (
    Order,
    OrderCreate,
    OrderUpdate,
    QRScanRequest,
    QRValidationResponse,
)
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session, joinedload

router = APIRouter()


@router.get("/", response_model=List[Order])
def read_orders(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve orders for the current user, or all orders if superuser.
    """
    query = db.query(OrderModel)
    if not current_user.is_superuser:
        query = query.filter(OrderModel.user_id == current_user.id)

    orders = (
        query.options(
            joinedload(OrderModel.location), joinedload(OrderModel.prescriptions)
        )
        .offset(skip)
        .limit(limit)
        .all()
    )
    return orders


@router.post("/", response_model=Order)
def create_order(
    *,
    db: Session = Depends(deps.get_db),
    order_in: OrderCreate,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new order.
    """
    import secrets

    logger.info(
        f"Creating new order for user {current_user.id} at location {order_in.location_id}"
    )

    db_obj = OrderModel(
        user_id=current_user.id,
        location_id=order_in.location_id,
        status=order_in.status,
        access_token=secrets.token_urlsafe(32),
    )
    db.add(db_obj)
    db.flush()

    if order_in.prescription_ids:
        from app.models.prescription import Prescription as PrescriptionModel

        prescriptions = (
            db.query(PrescriptionModel)
            .filter(PrescriptionModel.id.in_(order_in.prescription_ids))
            .all()
        )
        for p in prescriptions:
            # Link to the new confirmed order
            p.order_id = db_obj.id

            # Update FHIR status to completed to invalidate for future use
            if p.fhir_data:
                updated_data = dict(p.fhir_data)
                updated_data["status"] = "completed"
                p.fhir_data = updated_data

    db.commit()
    db.refresh(db_obj)

    # Ensure location and prescriptions are loaded for the response model
    db_obj = (
        db.query(OrderModel)
        .options(joinedload(OrderModel.location), joinedload(OrderModel.prescriptions))
        .filter(OrderModel.id == db_obj.id)
        .first()
    )

    logger.info(
        f"Order {db_obj.id} created successfully with access token {db_obj.access_token[:8]}..."
    )
    return db_obj


@router.post("/validate-qr", response_model=QRValidationResponse)
def validate_qr_order(
    *,
    db: Session = Depends(deps.get_db),
    request: QRScanRequest,
    x_machine_token: Optional[str] = Header(None, alias="X-Machine-Token"),
) -> Any:
    """
    Validates an order via its QR access token and returns order info.
    This endpoint is used by the station/hardware to verify an order.
    """
    order = (
        db.query(OrderModel)
        .options(joinedload(OrderModel.location), joinedload(OrderModel.prescriptions))
        .filter(OrderModel.access_token == request.qr_data)
        .first()
    )

    if not order:
        return QRValidationResponse(
            valid=False, message="Order not found or invalid token"
        )

    # Check if the machine's token matches the location assigned to the order
    if not order.location or order.location.validation_key != x_machine_token:
        logger.warning(
            f"Machine authorization failed for order {order.id}. "
            f"Expected key: {order.location.validation_key if order.location else 'None'}, "
            f"Received: {x_machine_token}"
        )
        return QRValidationResponse(valid=False, message="Machine authorization failed")

    return QRValidationResponse(
        valid=True, order=order, message="QR-Code erfolgreich validiert"
    )


@router.get("/{order_id}", response_model=Order)
def read_order_by_id(
    order_id: int,
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Get a specific order by ID.
    """
    order = (
        db.query(OrderModel)
        .options(joinedload(OrderModel.location), joinedload(OrderModel.prescriptions))
        .filter(OrderModel.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return order


@router.patch("/{order_id}", response_model=Order)
@router.put("/{order_id}", response_model=Order)
def update_order(
    *,
    db: Session = Depends(deps.get_db),
    order_id: int,
    order_in: OrderUpdate,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Update an existing order.
    """
    order = (
        db.query(OrderModel)
        .options(joinedload(OrderModel.location), joinedload(OrderModel.prescriptions))
        .filter(OrderModel.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=400, detail="Not enough permissions")

    update_data = order_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)

    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.delete("/{order_id}", response_model=Order)
def delete_order(
    *,
    db: Session = Depends(deps.get_db),
    order_id: int,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Delete an order.
    """
    order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=400, detail="Not enough permissions")

    db.delete(order)
    db.commit()
    return order
