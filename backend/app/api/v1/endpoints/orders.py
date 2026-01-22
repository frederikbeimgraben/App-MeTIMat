from typing import Any, List, Optional

from app.api import deps
from app.models.order import Order as OrderModel
from app.models.user import User as UserModel
from app.schemas.order import Order, OrderCreate, OrderUpdate
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

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

    orders = query.offset(skip).limit(limit).all()
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

    db_obj = OrderModel(
        user_id=current_user.id,
        status=order_in.status,
        access_token=secrets.token_urlsafe(32),
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.get("/validate-qr/{token}", response_model=Order)
def validate_qr_order(
    *,
    db: Session = Depends(deps.get_db),
    token: str,
) -> Any:
    """
    Validates an order via its QR access token and returns order info.
    This endpoint is typically used by the station/hardware to verify an order.
    """
    order = db.query(OrderModel).filter(OrderModel.access_token == token).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found or invalid token",
        )
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
    order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
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
    order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
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
