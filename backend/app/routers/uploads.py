from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app.models.course import MediaAsset, UploadSessionStatus
from app.schemas.course import (
    UploadInitRequest,
    UploadInitResponse,
    UploadFinalizeRequest,
    MediaAssetResponse,
)
from app.core.auth_guards import (
    require_role,
    CurrentUser,
    verify_approved_upload_permission,
)
from app.services.storage_service import StorageService

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])

@router.post("/request", response_model=UploadInitResponse, status_code=status.HTTP_201_CREATED)
def request_file_upload(
    payload: UploadInitRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """
    Step 1 of 2: Initialize file upload session.
    Enforces Danwin's server-side authorization: requires approved upload permission matching this student.
    """
    # 1. Verify approved permission
    permission = verify_approved_upload_permission(
        db=db,
        student_id=user.id,
        permission_id=payload.permission_id
    )

    # 2. Generate signed upload location
    storage_info = StorageService.generate_signed_upload_url(
        student_id=user.id,
        permission_id=permission.id,
        file_name=payload.file_name,
        mime_type=payload.mime_type
    )

    # 3. Create initialized MediaAsset record
    media_asset = MediaAsset(
        id=storage_info["asset_id"],
        course_id=payload.course_id,
        uploader_id=user.id,
        permission_id=permission.id,
        file_name=payload.file_name,
        file_type=payload.file_type,
        mime_type=payload.mime_type,
        file_size_bytes=payload.file_size_bytes,
        storage_key=storage_info["storage_key"],
        signed_url=storage_info["signed_view_url"],
        upload_status=UploadSessionStatus.INITIALIZED,
    )

    db.add(media_asset)
    db.commit()
    db.refresh(media_asset)

    return UploadInitResponse(
        asset_id=media_asset.id,
        upload_url=storage_info["signed_upload_url"],
        storage_key=media_asset.storage_key,
        upload_status=media_asset.upload_status,
        expires_in_seconds=3600
    )

@router.post("/finalize", response_model=MediaAssetResponse)
def finalize_file_upload(
    payload: UploadFinalizeRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """
    Step 2 of 2: Finalize upload session after storage write.
    Crucial requirement: Re-verifies student authorization & matching approved permission.
    Prepares stable asset reference for Prit's AI review pipeline in Phase 3.
    """
    # 1. Re-verify approved permission on finalization
    verify_approved_upload_permission(
        db=db,
        student_id=user.id,
        permission_id=payload.permission_id
    )

    # 2. Retrieve asset
    asset = db.query(MediaAsset).filter(MediaAsset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media asset not found.")

    if asset.uploader_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not the uploader of this media asset.")

    if asset.permission_id != payload.permission_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permission mismatch: Finalize permission ID does not match initialized session permission."
        )

    # 3. Finalize upload status
    now = datetime.now(timezone.utc)
    asset.upload_status = UploadSessionStatus.FINALIZED
    asset.updated_at = now

    db.commit()
    db.refresh(asset)
    return asset

