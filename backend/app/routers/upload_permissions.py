from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from app.database import get_db
from app.models.upload_permission import UploadPermission, PermissionStatus, VerifiedFaculty
from app.schemas.upload_permission import (
    UploadPermissionCreateRequest,
    UploadPermissionResponse,
    FacultyDecisionRequest,
    FacultyDirectoryItem,
)
from app.core.auth_guards import get_current_user, require_role, CurrentUser
from app.services.notification_service import EmailNotificationService

router = APIRouter(tags=["Upload Permissions"])

@router.get("/api/faculty/directory", response_model=List[FacultyDirectoryItem])
def list_verified_faculty(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """List verified faculty members so students can pick from active directory records."""
    return db.query(VerifiedFaculty).filter(VerifiedFaculty.is_active == True).all()

@router.post("/api/upload-permissions", response_model=UploadPermissionResponse, status_code=status.HTTP_201_CREATED)
def create_upload_permission_request(
    payload: UploadPermissionCreateRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """
    Student declares consent and requests permission to upload specific course content.
    Must validate against verified faculty records.
    """
    # 1. Validate assigned faculty against verified faculty directory
    faculty = db.query(VerifiedFaculty).filter(
        VerifiedFaculty.id == payload.faculty_id,
        VerifiedFaculty.is_active == True
    ).first()

    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or unverified faculty selected. Please select a verified faculty member from the directory."
        )

    # 2. Create the permission record
    now = datetime.now(timezone.utc)
    permission = UploadPermission(
        student_id=user.id,
        faculty_id=payload.faculty_id,
        title=payload.title,
        content_type=payload.content_type,
        format=payload.format,
        description=payload.description,
        consent_declared=payload.consent_declared,
        consent_declared_at=now,
        status=PermissionStatus.PENDING,
    )

    db.add(permission)
    db.commit()
    db.refresh(permission)

    # 3. Send email to faculty with secure authenticated review link
    EmailNotificationService.send_faculty_upload_request_notification(
        faculty_email=faculty.email,
        faculty_name=faculty.name,
        student_name=user.name,
        request_id=permission.id,
        title=permission.title,
        content_type=permission.content_type,
        description=permission.description or "",
    )

    return permission

@router.get("/api/upload-permissions/me", response_model=List[UploadPermissionResponse])
def get_my_upload_permissions(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """Student views their own requested upload permissions and current statuses."""
    return db.query(UploadPermission).filter(UploadPermission.student_id == user.id).order_by(UploadPermission.created_at.desc()).all()

@router.get("/api/faculty/upload-permissions", response_model=List[UploadPermissionResponse])
def get_faculty_assigned_permissions(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("faculty"))
):
    """Faculty reviews upload permission requests assigned to them."""
    return db.query(UploadPermission).filter(UploadPermission.faculty_id == user.id).order_by(UploadPermission.created_at.desc()).all()

@router.get("/api/faculty/upload-permissions/{id}", response_model=UploadPermissionResponse)
def get_faculty_permission_detail(
    id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("faculty"))
):
    """Faculty inspects details of a specific request."""
    permission = db.query(UploadPermission).filter(UploadPermission.id == id).first()
    if not permission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload permission request not found")

    if permission.faculty_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not the assigned faculty reviewer for this request.")

    return permission

@router.post("/api/faculty/upload-permissions/{id}/decision", response_model=UploadPermissionResponse)
def submit_faculty_decision(
    id: str,
    payload: FacultyDecisionRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("faculty"))
):
    """
    Faculty submits APPROVE or REJECT decision with audit remarks.
    Email links alone NEVER trigger this; this requires a deliberate authenticated POST.
    """
    permission = db.query(UploadPermission).filter(UploadPermission.id == id).first()
    if not permission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload permission request not found")

    # Only assigned faculty can approve/reject
    if permission.faculty_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not authorized to make a decision on this request.")

    # Prevent duplicate / conflicting decisions once finalized
    if permission.status != PermissionStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Conflict: Permission request has already been decided as '{permission.status}' on {permission.decision_timestamp}."
        )

    now = datetime.now(timezone.utc)
    permission.status = payload.decision
    permission.remarks = payload.remarks
    permission.decision_timestamp = now

    db.commit()
    db.refresh(permission)
    return permission

