import jwt
import pytest
from datetime import datetime, timedelta, timezone

from app.core.security import create_access_token, SECRET_KEY, ALGORITHM


TEST_PASSWORD = "TestPassword123!"


def test_register_student_success(client):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Integration Student",
            "email": "integration.student@example.com",
            "password": "StrongPassword123!",
        },
    )

    assert response.status_code == 201

    data = response.json()
    assert data["role"] == "student"
    assert data["name"] == "Integration Student"
    assert data["user_id"]
    assert data["access_token"]
    assert data["token_type"] == "bearer"


def test_register_duplicate_email_rejected(client):
    payload = {
        "name": "Duplicate Student",
        "email": "duplicate.student@example.com",
        "password": "StrongPassword123!",
    }

    first_response = client.post("/api/auth/register", json=payload)
    second_response = client.post("/api/auth/register", json=payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 409


@pytest.mark.parametrize(
    "payload",
    [
        {
            "name": "A",
            "email": "short.name@example.com",
            "password": "StrongPassword123!",
        },
        {
            "name": "Valid Name",
            "email": "short.password@example.com",
            "password": "short",
        },
        {
            "name": "Valid Name",
            "email": "invalid-email",
            "password": "StrongPassword123!",
        },
    ],
)
def test_register_invalid_details_rejected(client, payload):
    response = client.post("/api/auth/register", json=payload)

    assert response.status_code == 422


def test_login_student_success(client, auth_headers):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "student101@example.com",
            "password": TEST_PASSWORD,
        },
    )

    assert response.status_code == 200

    data = response.json()
    assert data["role"] == "student"
    assert data["user_id"] == "student_101"
    assert data["access_token"]


def test_login_faculty_success(client, auth_headers):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "rao@jain.ac.in",
            "password": TEST_PASSWORD,
        },
    )

    assert response.status_code == 200

    data = response.json()
    assert data["role"] == "faculty"
    assert data["user_id"] == "fac_1"
    assert data["access_token"]


def test_login_admin_success(client, auth_headers):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "admin_user@example.com",
            "password": TEST_PASSWORD,
        },
    )

    assert response.status_code == 200

    data = response.json()
    assert data["role"] == "admin"
    assert data["user_id"] == "admin_user"
    assert data["access_token"]


def test_login_wrong_password_rejected(client, auth_headers):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "student101@example.com",
            "password": "WrongPassword123!",
        },
    )

    assert response.status_code == 401


def test_login_unknown_email_rejected(client):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "unknown.user@example.com",
            "password": TEST_PASSWORD,
        },
    )

    assert response.status_code == 401


def test_login_unverified_faculty_rejected(client, db_session, auth_headers):
    from app.models.user import User
    from app.core.security import hash_password

    faculty = User(
        id="unverified_faculty",
        name="Unverified Faculty",
        email="unverified.faculty@example.com",
        password_hash=hash_password(TEST_PASSWORD),
        role="faculty",
        is_active=True,
    )

    db_session.add(faculty)
    db_session.flush()

    response = client.post(
        "/api/auth/login",
        json={
            "email": "unverified.faculty@example.com",
            "password": TEST_PASSWORD,
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Faculty account is not verified"


@pytest.mark.parametrize(
    ("user_id", "expected_role", "expected_email"),
    [
        ("student_101", "student", "student101@example.com"),
        ("fac_1", "faculty", "rao@jain.ac.in"),
        ("admin_user", "admin", "admin_user@example.com"),
    ],
)
def test_me_returns_authenticated_user(
    client,
    auth_headers,
    user_id,
    expected_role,
    expected_email,
):
    token = create_access_token(user_id)

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200

    data = response.json()
    assert data["id"] == user_id
    assert data["role"] == expected_role
    assert data["email"] == expected_email


def test_me_without_token_rejected(client):
    response = client.get("/api/auth/me")

    assert response.status_code == 401


def test_me_with_invalid_token_rejected(client):
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid.token.value"},
    )

    assert response.status_code == 401


def test_me_with_expired_token_rejected(client):
    expired_payload = {
        "sub": "student_101",
        "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
        "iat": datetime.now(timezone.utc) - timedelta(minutes=10),
        "type": "access",
    }

    expired_token = jwt.encode(
        expired_payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )

    assert response.status_code == 401
