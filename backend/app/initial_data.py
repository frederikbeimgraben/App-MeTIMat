import logging
import sys
import time

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.inventory import Inventory
from app.models.location import Location
from app.models.medication import Medication
from app.models.user import User
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def wait_for_db() -> None:
    """
    Wait for the database to be ready by attempting to execute a simple query.
    """
    max_retries = 60
    retry_interval = 2
    attempts = 0

    while attempts < max_retries:
        try:
            db = SessionLocal()
            db.execute(text("SELECT 1"))
            logger.info("Database connection established.")
            return
        except (OperationalError, Exception) as e:
            attempts += 1
            logger.info(f"Waiting for database... (Attempt {attempts}/{max_retries})")
            time.sleep(retry_interval)

    logger.error("Database was never ready. Exiting.")
    sys.exit(1)


def init_db() -> None:
    db = SessionLocal()
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
    if len(sys.argv) > 1 and sys.argv[1] == "wait":
        wait_for_db()
    else:
        logger.info("Starting database seeding...")
        init_db()
        logger.info("Database seeding finished successfully.")
