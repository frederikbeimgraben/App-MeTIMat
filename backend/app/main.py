"""
Main entry point for the MeTIMat FastAPI application.

This module initializes the FastAPI application, configures middleware (CORS),
defines health check routes, and includes the API versioned routers.
"""

from app import models  # noqa
from app.api.v1.api import api_router
from app.core.config import settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/api")
def root():
    """
    Root endpoint providing basic API information.

    Returns:
        dict: A dictionary containing a welcome message and the current build commit SHA.
    """
    return {
        "message": "Welcome to MeTIMat API",
        "build": settings.COMMIT_SHA,
    }


@app.get("/api/health")
def health_check():
    """
    Health check endpoint to monitor the status of the service.

    Returns:
        dict: A dictionary containing the status and whether mock prescriptions are enabled.
    """
    return {"status": "healthy", "mock_enabled": settings.ENABLE_MOCK_PRESCRIPTIONS}


app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
