import getpass

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.upload_permission import VerifiedFaculty
from app.core.security import hash_password

Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    accounts = [
        {
            "id": "student_test_001",
            "name": "Test Student",
            "email": "student.test@example.com",
            "role": "student",
        },
        {
            "id": "fac_cs_01",
            "name": "Dr. Ramesh Rao",
            "email": "ramesh.rao@jainuniversity.ac.in",
            "role": "faculty",
        },
    ]

    for account in accounts:
        existing = db.query(User).filter(
            User.email == account["email"]
        ).first()

        if existing:
            print(f"Already exists: {account['email']}")
            continue

        if account["role"] == "faculty":
            faculty = db.query(VerifiedFaculty).filter(
                VerifiedFaculty.id == account["id"],
                VerifiedFaculty.email == account["email"],
                VerifiedFaculty.is_active.is_(True),
            ).first()

            if not faculty:
                print("Verified faculty record missing; skipping.")
                continue

        password = getpass.getpass(
            f"Choose password for {account['email']}: "
        )

        if len(password) < 12:
            print("Password must have at least 12 characters. Skipping.")
            continue

        user = User(
            **account,
            password_hash=hash_password(password),
            is_active=True,
        )

        db.add(user)
        db.commit()
        print(f"Created: {account['email']}")

finally:
    db.close()
