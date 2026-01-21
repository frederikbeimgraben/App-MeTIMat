import pytest
from app.core.security import get_password_hash
from app.db.session import Base, get_db
from app.main import app
from app.models.user import User
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Setup Test Database (In-memory SQLite)
SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module")
def test_client():
    Base.metadata.create_all(bind=engine)

    # Create an admin user for testing
    db = TestingSessionLocal()
    admin_user = User(
        email="testadmin@example.com",
        hashed_password=get_password_hash("testpass"),
        full_name="Test Admin",
        is_superuser=True,
        is_active=True,
    )
    db.add(admin_user)
    db.commit()
    db.close()

    with TestClient(app) as client:
        yield client

    Base.metadata.drop_all(bind=engine)


def test_health_check(test_client):
    response = test_client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_login(test_client):
    response = test_client.post(
        "/api/v1/auth/login",
        data={"username": "testadmin@example.com", "password": "testpass"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    return response.json()["access_token"]


def test_qr_validation(test_client):
    # Get token first
    login_res = test_client.post(
        "/api/v1/auth/login",
        data={"username": "testadmin@example.com", "password": "testpass"},
    )
    token = login_res.json()["access_token"]

    response = test_client.post(
        "/api/v1/prescriptions/validate-qr",
        json={"qr_data": "https://gematik.de/fhir/erezept/token/1234567890"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["valid"] is True
    assert "profile" in response.json()


def test_mock_scan_prescription(test_client):
    login_res = test_client.post(
        "/api/v1/auth/login",
        data={"username": "testadmin@example.com", "password": "testpass"},
    )
    token = login_res.json()["access_token"]

    response = test_client.post(
        "/api/v1/prescriptions/mock-scan", headers={"Authorization": f"Bearer {token}"}
    )

    # This might fail if ENABLE_MOCK_PRESCRIPTIONS is False in config
    # But in the test environment, we expect success or 403
    if response.status_code == 200:
        data = response.json()
        assert data["status"] == "success"
        assert "resource" in data
        assert data["resource"]["resourceType"] == "Bundle"
    else:
        assert response.status_code == 403


def test_get_locations(test_client):
    login_res = test_client.post(
        "/api/v1/auth/login",
        data={"username": "testadmin@example.com", "password": "testpass"},
    )
    token = login_res.json()["access_token"]

    response = test_client.get(
        "/api/v1/locations/", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_unauthorized_access(test_client):
    response = test_client.get("/api/v1/users/me")
    assert response.status_code == 401
