from app.api.v1.api import api_router
from app.core.config import settings
from app.db.session import Base, engine
from app.models import inventory, location, medication, order, prescription, user
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create tables (In a production environment, use Alembic migrations)
Base.metadata.create_all(bind=engine)

# Manual migration for location_id if missing
import logging

from sqlalchemy import text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

with engine.connect() as conn:
    # Log current columns for debugging
    columns = conn.execute(
        text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='orders'"
        )
    ).fetchall()
    logger.info(f"Current columns in 'orders' table: {[c[0] for c in columns]}")

    res = conn.execute(
        text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='orders' AND column_name='location_id'"
        )
    ).fetchone()
    if not res:
        conn.execute(
            text(
                "ALTER TABLE orders ADD COLUMN location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL"
            )
        )
    else:
        # Update existing foreign key to include ON DELETE SET NULL
        try:
            conn.execute(
                text(
                    "ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_location_id_fkey"
                )
            )
            conn.execute(
                text(
                    "ALTER TABLE orders ADD CONSTRAINT orders_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL"
                )
            )
        except Exception as e:
            logger.warning(f"Could not update orders foreign key: {e}")

    # Migration for inventory table: ensure ON DELETE CASCADE
    try:
        conn.execute(
            text(
                "ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_location_id_fkey"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE inventory ADD CONSTRAINT inventory_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE"
            )
        )
    except Exception as e:
        logger.warning(f"Could not update inventory foreign key: {e}")

    # Migration for inventory table medication_id: ensure ON DELETE CASCADE
    try:
        conn.execute(
            text(
                "ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_medication_id_fkey"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE inventory ADD CONSTRAINT inventory_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE"
            )
        )
    except Exception as e:
        logger.warning(f"Could not update inventory foreign key for medication: {e}")

    # Migration for prescriptions table
    res_presc = conn.execute(
        text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='prescriptions' AND column_name='user_id'"
        )
    ).fetchone()
    if not res_presc:
        conn.execute(
            text(
                "ALTER TABLE prescriptions ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL"
            )
        )
    try:
        conn.execute(
            text(
                "ALTER TABLE prescriptions DROP CONSTRAINT IF EXISTS prescriptions_medication_id_fkey"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE"
            )
        )
    except Exception as e:
        logger.warning(f"Could not update prescriptions foreign key: {e}")

    # Migration for users table: ensure new columns exist
    conn.execute(
        text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE"
        )
    )
    conn.execute(
        text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS newsletter BOOLEAN DEFAULT FALSE"
        )
    )
    conn.execute(
        text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT FALSE"
        )
    )

    # Migration for medications table: ensure new columns exist
    conn.execute(
        text(
            "ALTER TABLE medications ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'all'"
        )
    )
    conn.execute(
        text(
            "ALTER TABLE medications ADD COLUMN IF NOT EXISTS prescription_required BOOLEAN DEFAULT FALSE"
        )
    )
    conn.execute(
        text("ALTER TABLE medications ADD COLUMN IF NOT EXISTS dosage VARCHAR")
    )
    conn.execute(
        text("ALTER TABLE medications ADD COLUMN IF NOT EXISTS dosage_form VARCHAR")
    )
    conn.execute(
        text("ALTER TABLE medications ADD COLUMN IF NOT EXISTS manufacturer VARCHAR")
    )
    conn.execute(
        text("ALTER TABLE medications ADD COLUMN IF NOT EXISTS package_size VARCHAR")
    )

    # Migration for orders table: ensure total_price exists
    res_order_price = conn.execute(
        text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='orders' AND column_name='total_price'"
        )
    ).fetchone()
    if not res_order_price:
        conn.execute(
            text("ALTER TABLE orders ADD COLUMN total_price FLOAT DEFAULT 0.0")
        )

    # Migration for order_medication_association table
    conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS order_medication_association (
                order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
                medication_id INTEGER REFERENCES medications(id) ON DELETE CASCADE,
                quantity INTEGER DEFAULT 1,
                PRIMARY KEY (order_id, medication_id)
            )
            """
        )
    )
    # Ensure quantity column exists if table was already there
    res_assoc_qty = conn.execute(
        text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='order_medication_association' AND column_name='quantity'"
        )
    ).fetchone()
    if not res_assoc_qty:
        conn.execute(
            text(
                "ALTER TABLE order_medication_association ADD COLUMN quantity INTEGER DEFAULT 1"
            )
        )

    conn.commit()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Welcome to MeTIMat API", "version": "1.0.0"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "mock_enabled": settings.ENABLE_MOCK_PRESCRIPTIONS}


app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
