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
                "ALTER TABLE orders ADD COLUMN location_id INTEGER REFERENCES locations(id)"
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
