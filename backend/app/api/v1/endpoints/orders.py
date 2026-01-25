"""
Order management and fulfillment endpoints for the MeTIMat API.

This module provides routes for creating, retrieving, updating, and completing customer orders.
It also includes specialized endpoints for QR code validation by automated vending machines
and handles order-related email notifications.
"""

import logging
import secrets
from typing import Any, List

from app.api import deps
from app.models.medication import Medication as MedicationModel
from app.models.order import Order as OrderModel
from app.models.order import OrderMedication
from app.models.prescription import Prescription as PrescriptionModel
from app.models.user import User as UserModel
from app.schemas.order import (
    Order,
    OrderCreate,
    OrderUpdate,
    QRScanRequest,
    QRValidationResponse,
)
from app.services.email import (
    send_order_confirmation_email,
    send_pickup_confirmation_email,
    send_pickup_ready_email,
)
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session, joinedload

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=List[Order])
def read_orders(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve a list of orders.

    Normal users see only their own orders, while superusers can see all orders in the system.

    Args:
        db: Database session.
        skip: Number of records to skip for pagination.
        limit: Maximum number of records to return.
        current_user: The currently authenticated user.

    Returns:
        List[Order]: A list of order objects with related data (user, location, medications).
    """
    query = db.query(OrderModel)
    if not current_user.is_superuser:  # type: ignore
        query = query.filter(OrderModel.user_id == current_user.id)

    orders = (
        query.options(
            joinedload(OrderModel.user),
            joinedload(OrderModel.location),
            joinedload(OrderModel.prescriptions),
            joinedload(OrderModel.medication_items).joinedload(
                OrderMedication.medication
            ),
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
    Create a new order for medications and prescriptions.

    Validates that prescription-only medications are not ordered without a linked prescription.
    Calculates the total price and generates a unique access token for pickup.
    Sends a confirmation email upon successful creation.

    Args:
        db: Database session.
        order_in: Order creation schema containing location and item IDs.
        current_user: The currently authenticated user.

    Returns:
        Order: The newly created order object.

    Raises:
        HTTPException: If prescription-required medications are ordered directly.
    """
    logger.info(
        f"Creating new order for user {current_user.id} at location {order_in.location_id}"
    )

    # Validate that no prescription-only medications are ordered directly
    if order_in.medication_ids:
        forbidden_meds = (
            db.query(MedicationModel)
            .filter(
                MedicationModel.id.in_(order_in.medication_ids),
                MedicationModel.prescription_required,
            )
            .all()
        )
        if forbidden_meds:
            names = ", ".join([m.name for m in forbidden_meds])  # type: ignore
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
        prescriptions = (
            db.query(PrescriptionModel)
            .filter(PrescriptionModel.id.in_(order_in.prescription_ids))
            .all()
        )
        db_obj.prescriptions = prescriptions
        for p in prescriptions:
            # Update FHIR status to completed to invalidate for future use
            if p.fhir_data:  # type: ignore
                updated_data = dict(p.fhir_data)  # type: ignore
                updated_data["status"] = "completed"  # type: ignore
                p.fhir_data = updated_data  # type: ignore

    # Link direct medications and calculate price using quantities
    if order_in.medication_ids:
        # Count occurrences in the list to determine quantity
        med_counts = {}
        for m_id in order_in.medication_ids:
            med_counts[m_id] = med_counts.get(m_id, 0) + 1

        meds = (
            db.query(MedicationModel)
            .filter(MedicationModel.id.in_(med_counts.keys()))
            .all()
        )

        for m in meds:
            qty = med_counts[m.id]
            # Create the association object with the specific quantity
            assoc = OrderMedication(
                order_id=db_obj.id, medication_id=m.id, quantity=qty
            )
            db.add(assoc)
            db_obj.total_price += float(m.price) * qty  # type: ignore

    # Add prescription fees (assumed 5.00€ flat fee per prescription)
    if order_in.prescription_ids:
        db_obj.total_price += len(order_in.prescription_ids) * 5.0  # type: ignore

    db.commit()

    # Reload with all relationships
    db_obj = (
        db.query(OrderModel)
        .options(
            joinedload(OrderModel.location),
            joinedload(OrderModel.prescriptions),
            joinedload(OrderModel.medication_items).joinedload(
                OrderMedication.medication
            ),
        )
        .filter(OrderModel.id == db_obj.id)
        .first()
    )

    # Send order confirmation email
    try:
        items = []
        total_price = float(db_obj.total_price)  # type: ignore

        # Add prescriptions to items list (grouped by name)
        prescription_counts = {}
        for p in db_obj.prescriptions:  # type: ignore
            med_name = (
                p.medication_name
                or (p.fhir_data.get("medication_name") if p.fhir_data else None)
                or "Verschriebenes Medikament"
            )
            prescription_counts[med_name] = prescription_counts.get(med_name, 0) + 1

        for name, count in prescription_counts.items():
            items.append({"name": name, "quantity": count, "price": 5.0 * count})

        # Add OTC medications using the stored quantities
        for item in db_obj.medication_items:  # type: ignore
            m = item.medication
            items.append(
                {
                    "name": m.name,
                    "quantity": item.quantity,
                    "price": float(m.price) * item.quantity,
                }
            )

        send_order_confirmation_email(
            email_to=current_user.email,  # type: ignore
            order_id=db_obj.id,  # type: ignore
            items=items,
            total_price=total_price,
        )
    except Exception as e:
        logger.error(f"Failed to send order confirmation email: {e}")

    logger.info(
        f"Order {db_obj.id} created successfully with access token {db_obj.access_token[:8]}..."  # type: ignore
    )
    return db_obj


@router.post("/validate-qr", response_model=QRValidationResponse)
def validate_qr_order(
    *,
    db: Session = Depends(deps.get_db),
    request: QRScanRequest,
    x_machine_token: str | None = Header(None, alias="X-Machine-Token"),
) -> Any:
    """
    Validate an order's QR code token.

    Used by the vending machine hardware to check if a scanned QR code corresponds
    to a valid order that is ready for pickup at that specific machine.

    Args:
        db: Database session.
        request: The QR scan payload containing the access token.
        x_machine_token: Authorization token from the machine's header.

    Returns:
        QRValidationResponse: Validation result and order details if successful.

    Raises:
        HTTPException: If the machine's token does not match the order's location.
    """
    order = (
        db.query(OrderModel)
        .options(
            joinedload(OrderModel.location),
            joinedload(OrderModel.prescriptions),
            joinedload(OrderModel.medication_items).joinedload(
                OrderMedication.medication
            ),
        )
        .filter(OrderModel.access_token == request.qr_data)
        .filter(OrderModel.status == "available for pickup")
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
    x_machine_token: str | None = Header(None, alias="X-Machine-Token"),
) -> Any:
    """
    Mark an order as completed.

    Used by the vending machine hardware to signal that the items have been dispensed.
    Triggers a pickup confirmation email to the user.

    Args:
        db: Database session.
        order_id: The ID of the order to complete.
        x_machine_token: Authorization token from the machine's header.

    Returns:
        Order: The updated order object.

    Raises:
        HTTPException: If the order is not found or machine authorization fails.
    """
    order = (
        db.query(OrderModel)
        .options(
            joinedload(OrderModel.location),
            joinedload(OrderModel.prescriptions),
            joinedload(OrderModel.medication_items).joinedload(
                OrderMedication.medication
            ),
        )
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

    order.status = "completed"  # type: ignore
    db.add(order)
    db.commit()

    # Send pickup confirmation email
    try:
        user = db.query(UserModel).filter(UserModel.id == order.user_id).first()
        if user and user.email:  # type: ignore
            items = []
            prescription_counts = {}
            for p in order.prescriptions:
                name = p.medication_name or "Verschriebenes Medikament"
                prescription_counts[name] = prescription_counts.get(name, 0) + 1

            for name, count in prescription_counts.items():
                items.append({"name": name, "quantity": count})
            for item in order.medication_items:
                items.append({"name": item.medication.name, "quantity": item.quantity})

            send_pickup_confirmation_email(
                email_to=user.email,  # type: ignore
                order_id=order.id,  # type: ignore
                items=items,
            )
    except Exception as e:
        logger.error(f"Failed to send pickup confirmation email: {e}")
    db.refresh(order)
    return order


@router.get("/{order_id}", response_model=Order)
def read_order_by_id(
    order_id: int,
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve a specific order by its ID.

    Users can only retrieve their own orders unless they are superusers.

    Args:
        order_id: The ID of the order to retrieve.
        db: Database session.
        current_user: The currently authenticated user.

    Returns:
        Order: The order object.

    Raises:
        HTTPException: If the order is not found or the user lacks permission.
    """
    order = (
        db.query(OrderModel)
        .options(
            joinedload(OrderModel.location),
            joinedload(OrderModel.prescriptions),
            joinedload(OrderModel.medication_items).joinedload(
                OrderMedication.medication
            ),
        )
        .filter(OrderModel.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id and not current_user.is_superuser:  # type: ignore
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
    Update an existing order's status or details.

    If the status changes to 'available for pickup', an automated email
    with the pickup QR code is sent to the user.

    Args:
        db: Database session.
        order_id: The ID of the order to update.
        order_in: Order update schema.
        current_user: The currently authenticated user.

    Returns:
        Order: The updated order object.

    Raises:
        HTTPException: If the order is not found or the user lacks permission.
    """
    order = (
        db.query(OrderModel)
        .options(
            joinedload(OrderModel.location),
            joinedload(OrderModel.prescriptions),
            joinedload(OrderModel.medication_items).joinedload(
                OrderMedication.medication
            ),
        )
        .filter(OrderModel.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id and not current_user.is_superuser:  # type: ignore
        raise HTTPException(status_code=400, detail="Not enough permissions")

    old_status = order.status
    update_data = order_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)

    db.add(order)
    db.commit()
    db.refresh(order)

    # If status transitioned to available for pickup, send email
    if old_status != "available for pickup" and order.status == "available for pickup":  # type: ignore
        try:
            user = db.query(UserModel).filter(UserModel.id == order.user_id).first()
            if user and user.email:  # type: ignore
                location_name = (
                    order.location.name if order.location else "MeTIMat Station"
                )
                send_pickup_ready_email(
                    email_to=user.email,  # type: ignore
                    order_id=order.id,  # type: ignore
                    pickup_location=location_name,
                    pickup_code=order.access_token,  # type: ignore
                )
        except Exception as e:
            logger.error(f"Failed to send pickup ready email: {e}")

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

    Users can only delete their own orders unless they are superusers.

    Args:
        db: Database session.
        order_id: The ID of the order to delete.
        current_user: The currently authenticated user.

    Returns:
        Order: The deleted order object.

    Raises:
        HTTPException: If the order is not found or the user lacks permission.
    """
    order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id and not current_user.is_superuser:  # type: ignore
        raise HTTPException(status_code=400, detail="Not enough permissions")

    db.delete(order)
    db.commit()
    return order
