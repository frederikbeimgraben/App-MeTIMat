"""initial tables

Revision ID: 9002221650b6
Revises:
Create Date: 2024-10-27 10:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "9002221650b6"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Users ---
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("is_superuser", sa.Boolean(), nullable=True),
        sa.Column("is_verified", sa.Boolean(), nullable=True),
        sa.Column("newsletter", sa.Boolean(), nullable=True),
        sa.Column("accepted_terms", sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_full_name"), "users", ["full_name"], unique=False)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

    # --- Locations ---
    op.create_table(
        "locations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("address", sa.String(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("opening_hours", sa.String(), nullable=True),
        sa.Column("is_pharmacy", sa.Boolean(), nullable=True),
        sa.Column("location_type", sa.String(), nullable=True),
        sa.Column("validation_key", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_locations_id"), "locations", ["id"], unique=False)
    op.create_index(op.f("ix_locations_name"), "locations", ["name"], unique=False)

    # --- Medications ---
    op.create_table(
        "medications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("pzn", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("dosage", sa.String(), nullable=True),
        sa.Column("dosage_form", sa.String(), nullable=True),
        sa.Column("manufacturer", sa.String(), nullable=True),
        sa.Column("package_size", sa.String(), nullable=True),
        sa.Column("price", sa.Float(), nullable=True),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("prescription_required", sa.Boolean(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_medications_id"), "medications", ["id"], unique=False)
    op.create_index(op.f("ix_medications_name"), "medications", ["name"], unique=False)
    op.create_index(op.f("ix_medications_pzn"), "medications", ["pzn"], unique=True)

    # --- Orders ---
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("location_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("access_token", sa.String(), nullable=True),
        sa.Column("total_price", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_orders_access_token"), "orders", ["access_token"], unique=True
    )
    op.create_index(op.f("ix_orders_id"), "orders", ["id"], unique=False)
    op.create_index(op.f("ix_orders_status"), "orders", ["status"], unique=False)

    # --- Prescriptions ---
    op.create_table(
        "prescriptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("order_id", sa.Integer(), nullable=True),
        sa.Column("medication_id", sa.Integer(), nullable=True),
        sa.Column("medication_name", sa.String(), nullable=True),
        sa.Column("pzn", sa.String(), nullable=True),
        sa.Column("fhir_data", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["medication_id"], ["medications.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["orders.id"],
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_prescriptions_id"), "prescriptions", ["id"], unique=False)
    op.create_index(
        op.f("ix_prescriptions_medication_name"),
        "prescriptions",
        ["medication_name"],
        unique=False,
    )
    op.create_index(
        op.f("ix_prescriptions_pzn"), "prescriptions", ["pzn"], unique=False
    )

    # --- Inventory ---
    op.create_table(
        "inventory",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=True),
        sa.Column("medication_id", sa.Integer(), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["medication_id"], ["medications.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_inventory_id"), "inventory", ["id"], unique=False)
    op.create_index(
        op.f("ix_inventory_location_id"), "inventory", ["location_id"], unique=False
    )
    op.create_index(
        op.f("ix_inventory_medication_id"), "inventory", ["medication_id"], unique=False
    )

    # --- Order Medication Association ---
    op.create_table(
        "order_medication_association",
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("medication_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["medication_id"], ["medications.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("order_id", "medication_id"),
    )


def downgrade() -> None:
    op.drop_table("order_medication_association")
    op.drop_index(op.f("ix_inventory_medication_id"), table_name="inventory")
    op.drop_index(op.f("ix_inventory_location_id"), table_name="inventory")
    op.drop_index(op.f("ix_inventory_id"), table_name="inventory")
    op.drop_table("inventory")
    op.drop_index(op.f("ix_prescriptions_pzn"), table_name="prescriptions")
    op.drop_index(op.f("ix_prescriptions_medication_name"), table_name="prescriptions")
    op.drop_index(op.f("ix_prescriptions_id"), table_name="prescriptions")
    op.drop_table("prescriptions")
    op.drop_index(op.f("ix_orders_status"), table_name="orders")
    op.drop_index(op.f("ix_orders_id"), table_name="orders")
    op.drop_index(op.f("ix_orders_access_token"), table_name="orders")
    op.drop_table("orders")
    op.drop_index(op.f("ix_medications_pzn"), table_name="medications")
    op.drop_index(op.f("ix_medications_name"), table_name="medications")
    op.drop_index(op.f("ix_medications_id"), table_name="medications")
    op.drop_table("medications")
    op.drop_index(op.f("ix_locations_name"), table_name="locations")
    op.drop_index(op.f("ix_locations_id"), table_name="locations")
    op.drop_table("locations")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_full_name"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
