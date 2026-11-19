from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.upload_permission import VerifiedFaculty
from app.core.security import (
    verify_password,
    create_access_token,
    decode_access_token,
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
bearer_scheme = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    user_id: str


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = str(payload.email).strip().lower()

    user = db.query(User).filter(User.email == email).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if user.role == "faculty":
        faculty = db.query(VerifiedFaculty).filter(
            VerifiedFaculty.id == user.id,
            VerifiedFaculty.is_active.is_(True),
        ).first()

        if not faculty or faculty.email.lower() != user.email.lower():
            raise HTTPException(
                status_code=403,
                detail="Faculty account is not verified",
            )

    token = create_access_token(user.id)

    return TokenResponse(
        access_token=token,
        role=user.role,
        name=user.name,
        user_id=user.id,
    )


@router.get("/me")
def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authentication required")

    user_id = decode_access_token(credentials.credentials)

    user = db.query(User).filter(
        User.id == user_id,
        User.is_active.is_(True),
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if user.role == "faculty":
        faculty = db.query(VerifiedFaculty).filter(
            VerifiedFaculty.id == user.id,
            VerifiedFaculty.is_active.is_(True),
        ).first()

        if not faculty or faculty.email.lower() != user.email.lower():
            raise HTTPException(status_code=403, detail="Faculty account is not verified")

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }
