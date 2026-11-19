import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class CertificateType(str, enum.Enum):
    COURSE_COMPLETION = "COURSE_COMPLETION"
    PEER_EDUCATOR = "PEER_EDUCATOR"

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    certificate_code = Column(String(50), unique=True, nullable=False, index=True)  # Public unique verification code
    recipient_id = Column(String(50), nullable=False, index=True)
    recipient_name = Column(String(100), nullable=False)
    certificate_type = Column(Enum(CertificateType), nullable=False)
    
    course_id = Column(String(36), ForeignKey("courses.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    
    # Issued by admin or university authority
    issuer_id = Column(String(50), nullable=False)
    is_sample = Column(Boolean, default=True, nullable=False)  # Sample watermark unless university-approved
    verification_url = Column(String(500), nullable=False)
    qr_code_data = Column(String(500), nullable=False)
    
    issued_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    course = relationship("Course")

