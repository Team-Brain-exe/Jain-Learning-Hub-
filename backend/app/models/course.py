import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class CourseLifecycleStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    AI_PROCESSING = "AI_PROCESSING"
    FACULTY_REVIEW = "FACULTY_REVIEW"
    APPROVED = "APPROVED"
    PUBLISHED = "PUBLISHED"
    REJECTED = "REJECTED"
    REVISION_REQUESTED = "REVISION_REQUESTED"

class MediaType(str, enum.Enum):
    VIDEO = "video"
    AUDIO = "audio"
    PDF = "pdf"
    PPT = "ppt"
    PPTX = "pptx"
    DOCX = "docx"
    IMAGE = "image"

class UploadSessionStatus(str, enum.Enum):
    INITIALIZED = "INITIALIZED"
    FINALIZED = "FINALIZED"
    FAILED = "FAILED"

class Course(Base):
    __tablename__ = "courses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    creator_id = Column(String(50), nullable=False, index=True)
    permission_id = Column(String(36), ForeignKey("upload_permissions.id"), nullable=False, index=True)
    
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)  # academic / non-academic
    level = Column(String(50), default="beginner", nullable=False)  # beginner, intermediate, advanced
    thumbnail_url = Column(String(500), nullable=True)
    
    status = Column(Enum(CourseLifecycleStatus), nullable=False, default=CourseLifecycleStatus.DRAFT)
    faculty_reviewer_id = Column(String(50), nullable=True, index=True)
    review_remarks = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    modules = relationship("Module", back_populates="course", cascade="all, delete-orphan", order_by="Module.order_index")
    media_assets = relationship("MediaAsset", back_populates="course", cascade="all, delete-orphan")
    ai_review_jobs = relationship("AIReviewJob", back_populates="course", cascade="all, delete-orphan", order_by="AIReviewJob.created_at.desc()")

class Module(Base):
    __tablename__ = "modules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String(36), ForeignKey("courses.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0, nullable=False)

    course = relationship("Course", back_populates="modules")
    lessons = relationship("Lesson", back_populates="module", cascade="all, delete-orphan", order_by="Lesson.order_index")

class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    module_id = Column(String(36), ForeignKey("modules.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)
    duration_minutes = Column(Integer, default=10, nullable=False)
    order_index = Column(Integer, default=0, nullable=False)
    
    # Linked asset if this lesson displays an uploaded video/pdf/document
    media_asset_id = Column(String(36), ForeignKey("media_assets.id"), nullable=True)

    module = relationship("Module", back_populates="lessons")
    media_asset = relationship("MediaAsset")

class MediaAsset(Base):
    __tablename__ = "media_assets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String(36), ForeignKey("courses.id"), nullable=True, index=True)
    uploader_id = Column(String(50), nullable=False, index=True)
    permission_id = Column(String(36), ForeignKey("upload_permissions.id"), nullable=False, index=True)

    file_name = Column(String(255), nullable=False)
    file_type = Column(Enum(MediaType), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    storage_key = Column(String(500), nullable=False)
    signed_url = Column(String(1000), nullable=True)

    upload_status = Column(Enum(UploadSessionStatus), default=UploadSessionStatus.INITIALIZED, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    course = relationship("Course", back_populates="media_assets")

