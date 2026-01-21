import logging
import time

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import Base, SessionLocal, engine
from app.models.master_data import Location, Medication
from app.models.user import User
from sqlalchemy.exc import OperationalError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_db() -> None:
    # Create tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if admin user exists
        user = db.query(User).filter(User.email == "admin@metimat.de").first()
        if not user:
            logger.info("Creating initial admin user")
            admin_user = User(
                email="admin@metimat.de",
                hashed_password=get_password_hash("admin123"),
                full_name="Administrator",
                is_superuser=True,
                is_active=True,
            )
            db.add(admin_user)
        else:
            # Force reset password to ensure hashing compatibility after dependency fix
            logger.info("Resetting admin password to ensure valid hash")
            user.hashed_password = get_password_hash("admin123")
            db.add(user)

        # Ensure we have some master data
        loc_count = db.query(Location).count()
        if loc_count == 0:
            logger.info("Creating initial locations")
            locations = [
                Location(
                    name="Zentral-Apotheke",
                    address="Hauptstraße 10, 10115 Berlin",
                    latitude=52.5200,
                    longitude=13.4050,
                    opening_hours="08:00 - 20:00",
                    is_pharmacy=True,
                ),
                Location(
                    name="Hausarztpraxis Dr. Schmidt",
                    address="Kurfürstendamm 50, 10707 Berlin",
                    latitude=52.5020,
                    longitude=13.3280,
                    opening_hours="09:00 - 17:00",
                    is_pharmacy=False,
                ),
            ]
            db.add_all(locations)

        med_count = db.query(Medication).count()
        if med_count == 0:
            logger.info("Creating initial medications")
            medications = [
                Medication(
                    name="Ibuprofen 400mg Akut",
                    pzn="12345678",
                    description="Pain reliever and anti-inflammatory",
                    dosage_form="Tablet",
                ),
                Medication(
                    name="Amoxicillin 1000mg",
                    pzn="87654321",
                    description="Antibiotic",
                    dosage_form="Film-coated tablet",
                ),
            ]
            db.add_all(medications)

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
