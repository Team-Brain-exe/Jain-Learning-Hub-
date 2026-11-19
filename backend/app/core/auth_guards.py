from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.upload_permission import (
    UploadPermission,
    PermissionStatus,
    VerifiedFaculty,
)
from app.core.security import decode_access_token


bearer_scheme = HTTPBearer(auto_error=False)


class CurrentUser(BaseModel):
    id: str
    name: str
    email: str
    role: str


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> CurrentUser:

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = decode_access_token(credentials.credentials)

    user = db.query(User).filter(
        User.id == user_id,
        User.is_active.is_(True),
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found or inactive",
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

    return CurrentUser(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
    )


def require_role(required_role: str):
    def role_checker(
        user: CurrentUser = Depends(get_current_user),
    ) -> CurrentUser:
        if user.role != required_role:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: Requires role '{required_role}'",
            )
        return user

    return role_checker


def verify_approved_upload_permission(
    db: Session,
    student_id: str,
    permission_id: str,
) -> UploadPermission:

    permission = db.query(UploadPermission).filter(
        UploadPermission.id == permission_id
    ).first()

    if not permission:
        raise HTTPException(
            status_code=404,
            detail="Upload permission not found",
        )

    if permission.student_id != student_id:
        raise HTTPException(
            status_code=403,
            detail="This upload permission does not belong to you",
        )

    if permission.status != PermissionStatus.APPROVED:
        raise HTTPException(
            status_code=403,
            detail="Upload permission has not been approved",
        )

    return permission
