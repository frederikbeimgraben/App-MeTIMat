import logging
import time

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import Base, SessionLocal, engine
from app.models.inventory import Inventory
from app.models.location import Location
from app.models.medication import Medication
from app.models.user import User
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_db() -> None:
    # Create tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # Manual Migration for Users table: ensure is_verified column exists
    logger.info("Checking for missing columns in 'users' table...")
    try:
        db.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE"
            )
        )
        db.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS newsletter BOOLEAN DEFAULT FALSE"
            )
        )
        db.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT FALSE"
            )
        )
        db.commit()
        logger.info("Checked/Added missing columns to 'users' table.")
    except Exception as e:
        db.rollback()
        logger.warning(f"Note during users table migration: {e}")

    # Manual Migration for Medications table
    logger.info("Checking for missing columns in 'medications' table...")
    try:
        db.execute(
            text(
                "ALTER TABLE medications ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'all'"
            )
        )
        db.execute(
            text(
                "ALTER TABLE medications ADD COLUMN IF NOT EXISTS prescription_required BOOLEAN DEFAULT FALSE"
            )
        )
        db.execute(
            text("ALTER TABLE medications ADD COLUMN IF NOT EXISTS dosage VARCHAR")
        )
        db.execute(
            text("ALTER TABLE medications ADD COLUMN IF NOT EXISTS dosage_form VARCHAR")
        )
        db.execute(
            text(
                "ALTER TABLE medications ADD COLUMN IF NOT EXISTS manufacturer VARCHAR"
            )
        )
        db.execute(
            text(
                "ALTER TABLE medications ADD COLUMN IF NOT EXISTS package_size VARCHAR"
            )
        )
        db.commit()
        logger.info("Checked/Added missing columns to 'medications' table.")
    except Exception as e:
        db.rollback()
        logger.warning(f"Note during medications table migration: {e}")
    try:
        # Check if admin user exists
        admin_user = db.query(User).filter(User.email == "admin@metimat.de").first()
        if not admin_user:
            logger.info("Creating initial admin user")
            admin_user = User(
                email="admin@metimat.de",
                hashed_password=get_password_hash(settings.ADMIN_PASS),
                full_name="Administrator",
                is_superuser=True,
                is_active=True,
                is_verified=True,
            )
            db.add(admin_user)

        # Ensure we have some master data (only if DB is empty)
        loc_count = db.query(Location).count()
        med_count = db.query(Medication).count()

        if loc_count == 0 and med_count == 0:
            logger.info(
                "Creating initial master data (locations, medications, inventory)"
            )
            locations = [
                Location(
                    name="MeTIMat Prototyp v1",
                    address="Pestalozzistraße 4, 72762 Reutlingen",
                    latitude=48.48173086680169,
                    longitude=9.18742563603867,
                    opening_hours="24/7",
                    is_pharmacy=False,
                    location_type="vending_machine",
                    validation_key="1l8uu8F2ZeZk2skuB0sWfUhAIgmWg5WH",
                ),
            ]
            db.add_all(locations)

            medications = [
                Medication(
                    name="Ibuprofen 400mg Akut",
                    pzn="12345678",
                    description="Pain reliever and anti-inflammatory",
                    dosage="400mg",
                    dosage_form="Tablet",
                    manufacturer="Ratiopharm",
                    package_size="20 Stk.",
                    price=9.95,
                    category="pain",
                    prescription_required=False,
                ),
                Medication(
                    name="Amoxicillin 1000mg",
                    pzn="87654321",
                    description="Antibiotic",
                    dosage="1000mg",
                    dosage_form="Film-coated tablet",
                    manufacturer="Hexal",
                    package_size="10 Stk.",
                    price=14.50,
                    category="antibiotics",
                    prescription_required=True,
                ),
            ]
            db.add_all(medications)
            db.flush()  # Ensure IDs are available for inventory

            # Add inventory for all medications at all initial locations
            for loc in locations:
                for med in medications:
                    db.add(
                        Inventory(
                            location_id=loc.id,
                            medication_id=med.id,
                            quantity=10 if loc.location_type == "pharmacy" else 5,
                        )
                    )

        db.commit()
        logger.info("Database initialization check complete")

    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        db.rollback()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    max_retries = 20
    retry_interval = 3
    attempts = 0

    logger.info("Starting database initialization script...")

    while attempts < max_retries:
        try:
            logger.info(
                f"Attempting to initialize database... (Attempt {attempts + 1}/{max_retries})"
            )
            init_db()
            logger.info("Database initialization finished successfully.")
            break
        except (OperationalError, Exception) as e:
            attempts += 1
            if attempts >= max_retries:
                logger.error(
                    f"Final attempt failed. Could not connect to database: {e}"
                )
                exit(1)

            logger.warning(
                f"Database connection or initialization failed: {e}. Retrying in {retry_interval} seconds..."
            )
            time.sleep(retry_interval)
