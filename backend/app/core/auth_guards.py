from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.models.upload_permission import UploadPermission, PermissionStatus

class CurrentUser(BaseModel):
    id: str
    name: str
    email: str
    role: str  # student, faculty, admin

async def get_current_user(
    x_user_id: Optional[str] = Header("student_001", alias="X-User-Id"),
    x_user_role: Optional[str] = Header("student", alias="X-User-Role"),
    x_user_email: Optional[str] = Header("student@jainuniversity.ac.in", alias="X-User-Email"),
) -> CurrentUser:
    return CurrentUser(
        id=x_user_id,
        name="Test User",
        email=x_user_email,
        role=x_user_role
    )

def require_role(required_role: str):
    def role_checker(user: CurrentUser = Depends(get_current_user)):
        if user.role != required_role:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: Requires role '{required_role}', got '{user.role}'"
            )
        return user
    return role_checker

# Danwin's shared authorization helper: require_approved_upload_permission(student_id, permission_id)
def verify_approved_upload_permission(
    db: Session,
    student_id: str,
    permission_id: str
) -> UploadPermission:
    """
    Server-side verification of Danwin's authorization contract:
    - Must exist in DB
    - Must belong to the calling student (no cross-student access)
    - Must be explicitly APPROVED (not PENDING or REJECTED)
    """
    permission = db.query(UploadPermission).filter(UploadPermission.id == permission_id).first()
    if not permission:
        raise HTTPException(
            status_code=404,
            detail=f"Upload permission '{permission_id}' not found."
        )

    if permission.student_id != student_id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: This upload permission does not belong to you."
        )

    if permission.status != PermissionStatus.APPROVED:
        raise HTTPException(
            status_code=403,
            detail=f"Forbidden: Upload permission is not approved (current status: '{permission.status}')."
        )

    return permission
