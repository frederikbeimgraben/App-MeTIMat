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
