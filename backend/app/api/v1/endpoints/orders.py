import logging
from typing import Any, List, Optional

from app.api import deps

logger = logging.getLogger(__name__)
from app.core.config import settings
from app.models.medication import Medication as MedicationModel
from app.models.order import Order as OrderModel
from app.models.user import User as UserModel
from app.schemas.order import (
    Order,
    OrderCreate,
    OrderUpdate,
    QRScanRequest,
    QRValidationResponse,
)
from app.services.email import send_order_confirmation_email, send_pickup_ready_email
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
            joinedload(OrderModel.location),
            joinedload(OrderModel.prescriptions),
            joinedload(OrderModel.medications),
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

    # Validate that no prescription-only medications are ordered directly
    if order_in.medication_ids:
        forbidden_meds = (
            db.query(MedicationModel)
            .filter(
                MedicationModel.id.in_(order_in.medication_ids),
                MedicationModel.prescription_required == True,
            )
            .all()
        )
        if forbidden_meds:
            names = ", ".join([m.name for m in forbidden_meds])
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The following medications require a prescription and cannot be ordered directly: {names}",
            )

    db_obj = OrderModel(
        user_id=current_user.id,
        location_id=order_in.location_id,
        status=order_in.status,
        access_token=secrets.token_urlsafe(32),
        total_price=0.0,
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
        db_obj.prescriptions = prescriptions
        for p in prescriptions:
            # Update FHIR status to completed to invalidate for future use
            if p.fhir_data:
                updated_data = dict(p.fhir_data)
                updated_data["status"] = "completed"
                p.fhir_data = updated_data

    # Link direct medications and calculate price
    if order_in.medication_ids:
        meds = (
            db.query(MedicationModel)
            .filter(MedicationModel.id.in_(order_in.medication_ids))
            .all()
        )
        db_obj.medications = meds
        # Calculate price accounting for duplicates (quantities)
        med_price_map = {m.id: float(m.price) for m in meds}
        for m_id in order_in.medication_ids:
            db_obj.total_price += med_price_map.get(m_id, 0.0)

    # Add prescription fees (assumed 5.00€ per prescription)
    if order_in.prescription_ids:
        db_obj.total_price += len(order_in.prescription_ids) * 5.0

    db.commit()

    # Ensure location, medications and prescriptions are loaded for the response and email
    db_obj = (
        db.query(OrderModel)
        .options(
            joinedload(OrderModel.location),
            joinedload(OrderModel.prescriptions),
            joinedload(OrderModel.medications),
        )
        .filter(OrderModel.id == db_obj.id)
        .first()
    )

    # Send order confirmation email
    try:
        items = []
        total_price = float(db_obj.total_price)

        # Add prescriptions to items list (Flat fee of 5.00€ assumed for prescriptions)
        for p in db_obj.prescriptions:
            med_name = (
                p.medication_name
                or (p.fhir_data.get("medication_name") if p.fhir_data else None)
                or "Verschriebenes Medikament"
            )
            items.append({"name": med_name, "quantity": 1, "price": 5.0})

        # Add OTC medications accounting for quantities if provided
        med_counts = {}
        if order_in.medication_ids:
            for m_id in order_in.medication_ids:
                med_counts[m_id] = med_counts.get(m_id, 0) + 1

        for m in db_obj.medications:
            count = med_counts.get(m.id, 1)
            items.append(
                {"name": m.name, "quantity": count, "price": float(m.price) * count}
            )

        send_order_confirmation_email(
            email_to=current_user.email,
            order_id=db_obj.id,
            items=items,
            total_price=total_price,
        )
    except Exception as e:
        logger.error(f"Failed to send order confirmation email: {e}")

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
        .options(
            joinedload(OrderModel.location),
            joinedload(OrderModel.prescriptions),
            joinedload(OrderModel.medications),
        )
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Machine authorization failed",
        )

    return QRValidationResponse(
        valid=True, order=order, message="QR-Code erfolgreich validiert"
    )


@router.post("/{order_id}/complete", response_model=Order)
def complete_order(
    *,
    db: Session = Depends(deps.get_db),
    order_id: int,
    x_machine_token: Optional[str] = Header(None, alias="X-Machine-Token"),
) -> Any:
    """
    Mark an order as completed. Used by the machine after successful dispensing.
    """
    order = (
        db.query(OrderModel)
        .options(joinedload(OrderModel.location))
        .filter(OrderModel.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check if the machine's token matches the location assigned to the order
    if not order.location or order.location.validation_key != x_machine_token:
        logger.warning(
            f"Machine authorization failed for completing order {order.id}. "
            f"Expected key: {order.location.validation_key if order.location else 'None'}, "
            f"Received: {x_machine_token}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Machine authorization failed",
        )

    order.status = "completed"
    db.add(order)
    db.commit()

    # Send pickup verification/ready email (for simulated "ready" state or completion)
    try:
        user = db.query(UserModel).filter(UserModel.id == order.user_id).first()
        if user and user.email:
            location_name = order.location.name if order.location else "MeTIMat Station"
            send_pickup_ready_email(
                email_to=user.email,
                order_id=order.id,
                pickup_location=location_name,
                pickup_code=order.access_token[:8].upper(),
            )
    except Exception as e:
        logger.error(f"Failed to send pickup notification email: {e}")
    db.refresh(order)
    return order


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
        .options(
            joinedload(OrderModel.location),
            joinedload(OrderModel.prescriptions),
            joinedload(OrderModel.medications),
        )
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
        .options(
            joinedload(OrderModel.location),
            joinedload(OrderModel.prescriptions),
            joinedload(OrderModel.medications),
        )
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
