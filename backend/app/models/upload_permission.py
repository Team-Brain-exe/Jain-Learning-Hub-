import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, Enum, Boolean, ForeignKey
from app.database import Base

class PermissionStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class UploadPermission(Base):
    __tablename__ = "upload_permissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(50), nullable=False, index=True)
    faculty_id = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content_type = Column(String(50), nullable=False)  # e.g., academic, non-academic
    format = Column(String(50), nullable=False)        # e.g., video, pdf, pptx
    description = Column(Text, nullable=True)
    consent_declared = Column(Boolean, nullable=False, default=False)
    consent_declared_at = Column(DateTime(timezone=True), nullable=True)
    
    status = Column(Enum(PermissionStatus), nullable=False, default=PermissionStatus.PENDING)
    remarks = Column(Text, nullable=True)
    decision_timestamp = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

# Seeded or directory-based faculty records for validation (until Danwin wires directory DB)
class VerifiedFaculty(Base):
    __tablename__ = "verified_faculty"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    department = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

