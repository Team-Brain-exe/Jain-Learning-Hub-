import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app as fastapi_app
import app.models.upload_permission
import app.models.user
import app.models.course
import app.models.ai_review
import app.models.learning
import app.models.certificate

@pytest.fixture(scope="session")
def test_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    return engine

@pytest.fixture(scope="session")
def TestingSession(test_engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture
def db_session(test_engine, TestingSession):
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSession(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as test_client:
        yield test_client
    fastapi_app.dependency_overrides.clear()

from app.models.user import User
from app.core.security import create_access_token, hash_password



from app.models.user import User
from app.models.upload_permission import VerifiedFaculty
from app.core.security import create_access_token, hash_password


@pytest.fixture
def auth_headers(db_session):
    users = [
        User(
            id="student_101",
            name="Test Student",
            email="student101@example.com",
            password_hash=hash_password("TestPassword123!"),
            role="student",
            is_active=True,
        ),
        User(
            id="student_abc",
            name="Student ABC",
            email="studentabc@example.com",
            password_hash=hash_password("TestPassword123!"),
            role="student",
            is_active=True,
        ),
        User(
            id="student_xyz",
            name="Student XYZ",
            email="studentxyz@example.com",
            password_hash=hash_password("TestPassword123!"),
            role="student",
            is_active=True,
        ),
        User(
            id="student_200",
            name="Test student_200",
            email="student_200@example.com",
            password_hash=hash_password("TestPassword123!"),
            role="student",
            is_active=True,
        ),
        User(
            id="student_hacker",
            name="Test student_hacker",
            email="student_hacker@example.com",
            password_hash=hash_password("TestPassword123!"),
            role="student",
            is_active=True,
        ),
        User(
            id="student_999",
            name="Test student_999",
            email="student_999@example.com",
            password_hash=hash_password("TestPassword123!"),
            role="student",
            is_active=True,
        ),
        User(
            id="fac_1",
            name="Dr. Rao",
            email="rao@jain.ac.in",
            password_hash=hash_password("TestPassword123!"),
            role="faculty",
            is_active=True,
        ),
        User(
            id="fac_2",
            name="Dr. Sunita",
            email="sunita@jain.ac.in",
            password_hash=hash_password("TestPassword123!"),
            role="faculty",
            is_active=True,
        ),
    ]

    # Accounts required by legacy learning and certificate tests
    for user_id, role in {
        "student_creator": "student",
        "student_other": "student",
        "learner_101": "student",
        "unregistered_student": "student",
        "student_learner": "student",
        "creator_student": "student",
        "student_user": "student",
        "admin_user": "admin",
        "fac_reviewer": "faculty",
        "fac_unassigned": "faculty",
    }.items():
        users.append(
            User(
                id=user_id,
                name=f"Test {user_id}",
                email={
                    "fac_reviewer": "sharma@jain.ac.in",
                    "fac_unassigned": "unassigned@jain.ac.in",
                }.get(user_id, f"{user_id}@example.com"),
                password_hash=hash_password("TestPassword123!"),
                role=role,
                is_active=True,
            )
        )

    db_session.add_all(users)
    db_session.add_all([
        VerifiedFaculty(
            id="fac_1",
            name="Dr. Rao",
            email="rao@jain.ac.in",
            department="Computer Science",
            is_active=True,
        ),
        VerifiedFaculty(
            id="fac_2",
            name="Dr. Sunita",
            email="sunita@jain.ac.in",
            department="Computer Science",
            is_active=True,
        ),
    ])
    db_session.flush()

    return {
        user.id: {
            "Authorization": f"Bearer {create_access_token(user.id)}"
        }
        for user in users
    }


@pytest.fixture(autouse=True)
def mock_faculty_email_notifications(monkeypatch, request):
    """Prevent real faculty emails except in SMTP unit tests."""
    if request.node.path.name == "test_notification_service.py":
        return

    from app.services.notification_service import EmailNotificationService

    def fake_send(
        faculty_email,
        faculty_name,
        student_name,
        request_id,
        title,
        content_type,
        description,
    ):
        return {
            "status": "SENT",
            "recipient": faculty_email,
            "review_url": (
                "http://localhost:5173/faculty/review-request/"
                f"{request_id}"
            ),
        }

    monkeypatch.setattr(
        EmailNotificationService,
        "send_faculty_upload_request_notification",
        staticmethod(fake_send),
    )
