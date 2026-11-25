import hashlib
import hmac
import os
import re
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlencode

from fastapi import HTTPException, status

from app.models.course import MediaType
from app.schemas.course import ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES

ALLOWED_EXTENSIONS = {
    MediaType.VIDEO: {".mp4", ".webm", ".mov"},
    MediaType.AUDIO: {".mp3", ".wav", ".aac", ".m4a"},
    MediaType.PDF: {".pdf"},
    MediaType.PPT: {".ppt"},
    MediaType.PPTX: {".pptx"},
    MediaType.DOCX: {".docx"},
    MediaType.IMAGE: {".jpg", ".jpeg", ".png", ".webp"},
}

SAFE_SEGMENT_RE = re.compile(r"[^a-zA-Z0-9._-]+")


def _get_signing_secret() -> str:
    secret = os.getenv("STORAGE_SIGNING_SECRET") or os.getenv("JWT_SECRET_KEY")
    if not secret or len(secret) < 16:
        raise RuntimeError(
            "STORAGE_SIGNING_SECRET (or JWT_SECRET_KEY) must be configured."
        )
    return secret


def _get_local_storage_dir() -> Path:
    default_dir = Path(__file__).resolve().parents[2] / "storage_objects"
    configured = os.getenv("STORAGE_LOCAL_DIR")
    root = Path(configured).resolve() if configured else default_dir.resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def _get_storage_base_url() -> str:
    return os.getenv("STORAGE_BASE_URL", "").rstrip("/")


def _get_url_expiry_seconds() -> int:
    try:
        return max(60, int(os.getenv("STORAGE_URL_EXPIRY_SECONDS", "3600")))
    except ValueError:
        return 3600


def sanitize_filename(file_name: str, file_type: MediaType) -> str:
    """
    Strictly sanitize an uploaded filename to prevent path traversal or unsafe keys,
    and verify its extension matches the declared MediaType.
    """
    if not file_name or ".." in file_name or "/" in file_name or "\\" in file_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file_name: path separators and '..' are not allowed.",
        )

    base = os.path.basename(file_name).strip()
    if not base:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file_name: filename cannot be empty.",
        )

    stem, ext = os.path.splitext(base)
    ext_lower = ext.lower()
    allowed_exts = ALLOWED_EXTENSIONS.get(file_type, set())
    if ext_lower not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension '{ext_lower or '(none)'}' for file_type '{file_type.value}'. Allowed: {sorted(allowed_exts)}",
        )

    safe_stem = SAFE_SEGMENT_RE.sub("_", stem).strip("._-") or "asset"
    return f"{safe_stem[:120]}{ext_lower}"


def sanitize_key_segment(value: str, label: str) -> str:
    cleaned = SAFE_SEGMENT_RE.sub("_", value.strip())
    if not cleaned or ".." in cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {label} for storage key.",
        )
    return cleaned


class StorageService:
    @staticmethod
    def _sign_payload(message: str) -> str:
        secret = _get_signing_secret().encode("utf-8")
        return hmac.new(secret, message.encode("utf-8"), hashlib.sha256).hexdigest()

    @staticmethod
    def resolve_local_path(storage_key: str) -> Path:
        root = _get_local_storage_dir()
        candidate = (root / storage_key).resolve()
        if os.path.commonpath([str(root), str(candidate)]) != str(root):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid storage key: path escapes storage root.",
            )
        return candidate

    @staticmethod
    def generate_signed_upload_url(
        student_id: str,
        permission_id: str,
        file_name: str,
        mime_type: str,
        file_type: MediaType,
        file_size_bytes: int,
    ) -> Dict[str, Any]:
        """
        Generates a safe storage key and cryptographically signed upload & view URLs.
        Enforces file type, extension, MIME type, size limit, and scoped key structure.
        """
        if mime_type not in ALLOWED_MIME_TYPES.get(file_type, []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported mime_type '{mime_type}' for file_type '{file_type.value}'.",
            )

        max_allowed = MAX_FILE_SIZE_BYTES[file_type]
        if file_size_bytes <= 0 or file_size_bytes > max_allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file_size_bytes: must be between 1 and {max_allowed} bytes.",
            )

        safe_student = sanitize_key_segment(student_id, "student_id")
        safe_perm = sanitize_key_segment(permission_id, "permission_id")
        safe_name = sanitize_filename(file_name, file_type)

        asset_id = str(uuid.uuid4())
        storage_key = f"uploads/{safe_student}/{safe_perm}/{asset_id}_{safe_name}"
        # Validate path containment early
        StorageService.resolve_local_path(storage_key)

        expires_in = _get_url_expiry_seconds()
        expires_at = int(time.time()) + expires_in
        base_url = _get_storage_base_url()

        put_msg = f"PUT:{asset_id}:{storage_key}:{student_id}:{mime_type}:{max_allowed}:{expires_at}"
        put_sig = StorageService._sign_payload(put_msg)
        put_qs = urlencode({"expires": expires_at, "sig": put_sig})
        signed_upload_url = f"{base_url}/api/uploads/storage/{asset_id}?{put_qs}"

        get_msg = f"GET:{asset_id}:{storage_key}:{expires_at}"
        get_sig = StorageService._sign_payload(get_msg)
        get_qs = urlencode({"expires": expires_at, "sig": get_sig})
        signed_view_url = f"{base_url}/api/uploads/storage/{asset_id}/view?{get_qs}"

        return {
            "asset_id": asset_id,
            "storage_key": storage_key,
            "signed_upload_url": signed_upload_url,
            "signed_view_url": signed_view_url,
            "expires_in_seconds": expires_in,
        }

    @staticmethod
    def verify_signed_upload_signature(
        asset_id: str,
        storage_key: str,
        student_id: str,
        mime_type: str,
        file_type: MediaType,
        expires: int,
        sig: str,
    ) -> None:
        if int(time.time()) > expires:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Signed upload URL has expired.",
            )
        max_allowed = MAX_FILE_SIZE_BYTES[file_type]
        expected_msg = f"PUT:{asset_id}:{storage_key}:{student_id}:{mime_type}:{max_allowed}:{expires}"
        expected_sig = StorageService._sign_payload(expected_msg)
        if not hmac.compare_digest(expected_sig, sig or ""):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid upload signature.",
            )

    @staticmethod
    def verify_signed_view_signature(
        asset_id: str,
        storage_key: str,
        expires: int,
        sig: str,
    ) -> None:
        if int(time.time()) > expires:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Signed view URL has expired.",
            )
        expected_msg = f"GET:{asset_id}:{storage_key}:{expires}"
        expected_sig = StorageService._sign_payload(expected_msg)
        if not hmac.compare_digest(expected_sig, sig or ""):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid view signature.",
            )

    @staticmethod
    def write_object(storage_key: str, content: bytes, max_bytes: int) -> int:
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file cannot be empty.",
            )
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Uploaded file exceeds maximum allowed size of {max_bytes} bytes.",
            )

        target_path = StorageService.resolve_local_path(storage_key)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(content)
        return len(content)

    @staticmethod
    def verify_object_exists(storage_key: str, max_bytes: int) -> Tuple[bool, int, Optional[str]]:
        """
        Verifies that the object exists in storage, is non-empty, and is within size bounds.
        Returns (exists_and_valid, byte_size, error_reason).
        """
        target_path = StorageService.resolve_local_path(storage_key)
        if not target_path.is_file():
            return False, 0, "Uploaded object does not exist in storage."
        size = target_path.stat().st_size
        if size <= 0:
            return False, 0, "Uploaded object is empty."
        if size > max_bytes:
            return False, size, f"Uploaded object exceeds maximum allowed size ({max_bytes} bytes)."
        return True, size, None

    @staticmethod
    def read_object(storage_key: str) -> bytes:
        target_path = StorageService.resolve_local_path(storage_key)
        if not target_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Stored media object not found.",
            )
        return target_path.read_bytes()
