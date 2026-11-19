from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.course import CourseLifecycleStatus, MediaType, UploadSessionStatus

# Allowed media formats and max limits
ALLOWED_MIME_TYPES = {
    MediaType.VIDEO: ["video/mp4", "video/webm", "video/quicktime"],
    MediaType.AUDIO: ["audio/mpeg", "audio/wav", "audio/aac"],
    MediaType.PDF: ["application/pdf"],
    MediaType.PPT: ["application/vnd.ms-powerpoint"],
    MediaType.PPTX: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    MediaType.DOCX: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    MediaType.IMAGE: ["image/jpeg", "image/png", "image/webp"],
}

# Max file size limit: 250MB for video, 50MB for presentations/documents, 10MB for images
MAX_FILE_SIZE_BYTES = {
    MediaType.VIDEO: 250 * 1024 * 1024,
    MediaType.AUDIO: 50 * 1024 * 1024,
    MediaType.PDF: 50 * 1024 * 1024,
    MediaType.PPT: 50 * 1024 * 1024,
    MediaType.PPTX: 50 * 1024 * 1024,
    MediaType.DOCX: 30 * 1024 * 1024,
    MediaType.IMAGE: 10 * 1024 * 1024,
}

# ----------------- UPLOAD SCHEMAS -----------------
class UploadInitRequest(BaseModel):
    permission_id: str = Field(..., description="ID of the approved upload permission")
    course_id: Optional[str] = Field(None, description="Optional course ID if asset belongs to an existing course draft")
    file_name: str = Field(..., min_length=1, max_length=255)
    file_type: MediaType
    mime_type: str
    file_size_bytes: int = Field(..., gt=0)

    @field_validator("mime_type")
    @classmethod
    def validate_mime(cls, v: str, info):
        ft = info.data.get("file_type")
        if ft and ft in ALLOWED_MIME_TYPES:
            allowed = ALLOWED_MIME_TYPES[ft]
            if v not in allowed:
                raise ValueError(f"Invalid mime_type '{v}' for file_type '{ft.value}'. Allowed: {allowed}")
        return v

    @field_validator("file_size_bytes")
    @classmethod
    def validate_size(cls, v: int, info):
        ft = info.data.get("file_type")
        if ft and ft in MAX_FILE_SIZE_BYTES:
            max_limit = MAX_FILE_SIZE_BYTES[ft]
            if v > max_limit:
                max_mb = max_limit / (1024 * 1024)
                raise ValueError(f"File size exceeds maximum limit of {max_mb:.0f} MB for file_type '{ft.value}'")
        return v

class UploadInitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    asset_id: str
    upload_url: str
    storage_key: str
    upload_status: UploadSessionStatus
    expires_in_seconds: int = 3600

class UploadFinalizeRequest(BaseModel):
    permission_id: str = Field(..., description="ID of approved permission matching this upload")
    asset_id: str
    client_verified_checksum: Optional[str] = None

class MediaAssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_id: Optional[str]
    uploader_id: str
    permission_id: str
    file_name: str
    file_type: MediaType
    mime_type: str
    file_size_bytes: int
    storage_key: str
    signed_url: Optional[str]
    upload_status: UploadSessionStatus
    created_at: datetime
    updated_at: datetime

# ----------------- COURSE SCHEMAS -----------------
class LessonCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: Optional[str] = None
    duration_minutes: int = Field(10, ge=1)
    order_index: int = 0
    media_asset_id: Optional[str] = None

class LessonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    module_id: str
    title: str
    content: Optional[str]
    duration_minutes: int
    order_index: int
    media_asset_id: Optional[str]

class ModuleCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    order_index: int = 0
    lessons: List[LessonCreate] = []

class ModuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_id: str
    title: str
    description: Optional[str]
    order_index: int
    lessons: List[LessonResponse] = []

class CourseCreateRequest(BaseModel):
    permission_id: str = Field(..., description="ID of approved upload permission")
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    category: str = Field("academic", description="academic or non-academic")
    level: str = Field("beginner", description="beginner, intermediate, advanced")
    thumbnail_url: Optional[str] = None
    modules: List[ModuleCreate] = []

class CourseUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    thumbnail_url: Optional[str] = None

class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    creator_id: str
    permission_id: str
    title: str
    slug: str
    description: Optional[str]
    category: str
    level: str
    thumbnail_url: Optional[str]
    status: CourseLifecycleStatus
    faculty_reviewer_id: Optional[str]
    review_remarks: Optional[str]
    created_at: datetime
    updated_at: datetime
    modules: List[ModuleResponse] = []

