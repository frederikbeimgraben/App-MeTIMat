"""
Database session management for the MeTIMat application.

This module sets up the SQLAlchemy engine, session factory, and base class
for declarative models. It also provides a dependency function for FastAPI
to handle database sessions in requests.
"""

from app.core.config import settings
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Create the SQLAlchemy engine using the database URI from settings
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    # pool_pre_ping is useful for keeping the connection alive in Docker environments
    pool_pre_ping=True,
)

# Create a configured "Session" class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a Base class for declarative models
Base = declarative_base()


def get_db():
    """
    Dependency function to get a database session.

    Yields:
        SessionLocal: An instance of the SQLAlchemy session.

    Ensures that the session is closed after the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
