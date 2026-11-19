import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class AIJobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    EXTRACTING = "EXTRACTING"
    TRANSCRIBING = "TRANSCRIBING"
    VERIFYING = "VERIFYING"
    COMPLETED = "COMPLETED"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"

class FindingSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class FindingType(str, enum.Enum):
    POTENTIAL_ERROR = "POTENTIAL_ERROR"
    UNSUPPORTED = "UNSUPPORTED"
    CONTRADICTION = "CONTRADICTION"
    NO_ISSUE_DETECTED = "NO_ISSUE_DETECTED"
    UNCERTAIN = "UNCERTAIN"

class AIReviewJob(Base):
    __tablename__ = "ai_review_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String(36), ForeignKey("courses.id"), nullable=False, index=True)
    status = Column(Enum(AIJobStatus), default=AIJobStatus.QUEUED, nullable=False)
    summary = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    transcripts_json = Column(Text, nullable=True)
    total_segments = Column(Integer, default=0, nullable=True)
    total_claims = Column(Integer, default=0, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    course = relationship("Course", back_populates="ai_review_jobs")
    findings = relationship("AIFinding", back_populates="review_job", cascade="all, delete-orphan")

class AIFinding(Base):
    __tablename__ = "ai_findings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("ai_review_jobs.id"), nullable=False, index=True)
    asset_id = Column(String(36), ForeignKey("media_assets.id"), nullable=True)

    finding_type = Column(Enum(FindingType), nullable=False)
    severity = Column(Enum(FindingSeverity), default=FindingSeverity.MEDIUM, nullable=False)
    claim = Column(Text, nullable=False)
    source_location = Column(String(255), nullable=True)  # e.g., "timestamp: 04:32" or "slide: 6"
    conflicting_location = Column(String(255), nullable=True)  # For cross-asset contradictions
    explanation = Column(Text, nullable=False)
    suggested_correction = Column(Text, nullable=True)
    references_json = Column(Text, nullable=True)  # JSON-serialized list of references
    confidence = Column(Float, default=0.9, nullable=True)
    requires_human_review = Column(Boolean, default=True, nullable=False)

    review_job = relationship("AIReviewJob", back_populates="findings")
    asset = relationship("MediaAsset")

