from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.certificate import CertificateType

class CertificateIssueRequest(BaseModel):
    recipient_id: str = Field(..., description="Student ID of recipient")
    course_id: str = Field(..., description="Course ID")
    certificate_type: CertificateType
    is_sample: bool = Field(True, description="Mark as prototype/sample unless university-approved")

class CertificateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    certificate_code: str
    recipient_id: str
    recipient_name: str
    certificate_type: CertificateType
    course_id: str
    title: str
    issuer_id: str
    is_sample: bool
    verification_url: str
    qr_code_data: str
    issued_at: datetime

class CertificatePublicVerification(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    certificate_code: str
    recipient_name: str
    certificate_type: CertificateType
    course_title: str
    is_valid: bool
    is_sample: bool
    issued_at: datetime
    university: str = "JAIN (Deemed-to-be University) - Faculty of Engineering & Technology"

class CertificateEligibilityResponse(BaseModel):
    course_id: str
    is_enrolled: bool
    total_lessons: int
    completed_lessons: int
    lessons_completed: bool
    has_quiz: bool
    quiz_passed: bool
    is_eligible_for_completion_cert: bool
    is_eligible_for_peer_educator_cert: bool
    existing_completion_certificate_code: Optional[str] = None
    existing_peer_educator_certificate_code: Optional[str] = None

