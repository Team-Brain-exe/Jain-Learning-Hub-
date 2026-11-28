from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.core.auth_guards import (
    CurrentUser,
    get_current_user,
    require_role,
    verify_approved_upload_permission,
)
from app.database import get_db
from app.models.course import Course, MediaAsset, UploadSessionStatus
from app.schemas.course import (
    MAX_FILE_SIZE_BYTES,
    MediaAssetResponse,
    UploadFinalizeRequest,
    UploadInitRequest,
    UploadInitResponse,
)
from app.services.storage_service import StorageService

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])


@router.post("/request", response_model=UploadInitResponse, status_code=status.HTTP_201_CREATED)
def request_file_upload(
    payload: UploadInitRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student")),
):
    """
    Step 1 of 2: Initialize file upload session.
    Enforces server-side authorization: requires approved upload permission matching this student.
    If course_id is provided, verifies the student owns that course.
    """
    # 1. Verify approved permission
    permission = verify_approved_upload_permission(
        db=db,
        student_id=user.id,
        permission_id=payload.permission_id,
    )

    # 1b. If attaching to an existing course, verify course ownership
    if payload.course_id:
        course = db.query(Course).filter(Course.id == payload.course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found.",
            )
        if course.creator_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not own this course.",
            )

    # 2. Generate safe key & cryptographically signed upload/view URLs
    storage_info = StorageService.generate_signed_upload_url(
        student_id=user.id,
        permission_id=permission.id,
        file_name=payload.file_name,
        mime_type=payload.mime_type,
        file_type=payload.file_type,
        file_size_bytes=payload.file_size_bytes,
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
        expires_in_seconds=storage_info["expires_in_seconds"],
    )


@router.put("/storage/{asset_id}", status_code=status.HTTP_200_OK)
async def upload_object_to_signed_url(
    asset_id: str,
    request: Request,
    expires: int = Query(...),
    sig: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Signed storage PUT target for uploading the actual file bytes.
    Validates HMAC signature, expiration, asset state, and byte size bounds.
    """
    asset = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media asset not found.")

    StorageService.verify_signed_upload_signature(
        asset_id=asset.id,
        storage_key=asset.storage_key,
        student_id=asset.uploader_id,
        mime_type=asset.mime_type,
        file_type=asset.file_type,
        expires=expires,
        sig=sig,
    )

    if asset.upload_status != UploadSessionStatus.INITIALIZED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Upload session is not in an initialized state.",
        )

    body = await request.body()
    max_bytes = MAX_FILE_SIZE_BYTES[asset.file_type]
    written_size = StorageService.write_object(
        storage_key=asset.storage_key,
        content=body,
        max_bytes=max_bytes,
    )

    return {
        "asset_id": asset.id,
        "storage_key": asset.storage_key,
        "bytes_written": written_size,
        "status": "UPLOADED",
    }


@router.get("/storage/{asset_id}/view")
def view_signed_object(
    asset_id: str,
    expires: int = Query(...),
    sig: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Signed storage GET target for reading a finalized media object.
    """
    asset = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media asset not found.")

    StorageService.verify_signed_view_signature(
        asset_id=asset.id,
        storage_key=asset.storage_key,
        expires=expires,
        sig=sig,
    )

    if asset.upload_status != UploadSessionStatus.FINALIZED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media asset is not finalized.",
        )

    content = StorageService.read_object(asset.storage_key)
    return Response(content=content, media_type=asset.mime_type)


@router.post("/finalize", response_model=MediaAssetResponse)
def finalize_file_upload(
    payload: UploadFinalizeRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student")),
):
    """
    Step 2 of 2: Finalize upload session after storage write.
    Re-verifies student authorization, matching approved permission, prevents duplicate
    finalization, and verifies actual object existence and size in storage.
    """
    # 1. Re-verify approved permission on finalization
    verify_approved_upload_permission(
        db=db,
        student_id=user.id,
        permission_id=payload.permission_id,
    )

    # 2. Retrieve asset & check ownership
    asset = db.query(MediaAsset).filter(MediaAsset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media asset not found.")

    if asset.uploader_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not the uploader of this media asset.",
        )

    if asset.permission_id != payload.permission_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permission mismatch: Finalize permission ID does not match initialized session permission.",
        )

    if asset.upload_status == UploadSessionStatus.FINALIZED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate finalization: Media asset is already finalized.",
        )
    if asset.upload_status != UploadSessionStatus.INITIALIZED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Upload session is not in an initialized state.",
        )

    # 3. Verify actual object existence and size in storage
    max_bytes = MAX_FILE_SIZE_BYTES[asset.file_type]
    exists_ok, actual_size, err_reason = StorageService.verify_object_exists(
        storage_key=asset.storage_key,
        max_bytes=max_bytes,
    )

    if exists_ok and actual_size != asset.file_size_bytes:
        exists_ok = False
        err_reason = (
            f"Uploaded size mismatch: expected {asset.file_size_bytes} bytes, "
            f"received {actual_size} bytes."
        )

    now = datetime.now(timezone.utc)

    if not exists_ok:
        asset.upload_status = UploadSessionStatus.FAILED
        asset.updated_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Upload verification failed: {err_reason}",
        )

    # 4. Finalize upload status
    asset.file_size_bytes = actual_size
    asset.upload_status = UploadSessionStatus.FINALIZED
    asset.updated_at = now

    db.commit()
    db.refresh(asset)
    return asset


@router.get("/{asset_id}", response_model=MediaAssetResponse)
def get_media_asset_metadata(
    asset_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Retrieve metadata for an uploaded media asset.
    Restricted to the uploader, assigned faculty reviewer, or admin.
    """
    asset = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media asset not found.")

    is_authorized = asset.uploader_id == user.id or user.role == "admin"
    if not is_authorized and asset.course_id:
        course = db.query(Course).filter(Course.id == asset.course_id).first()
        if course and course.faculty_reviewer_id == user.id:
            is_authorized = True

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not authorized to access this media asset.",
        )

    if asset.upload_status == UploadSessionStatus.FINALIZED:
        result = MediaAssetResponse.model_validate(asset)
        result.signed_url = StorageService.fresh_view_url(asset.id, asset.storage_key)
        return result
    return asset
