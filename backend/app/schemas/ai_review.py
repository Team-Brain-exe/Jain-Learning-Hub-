from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
from app.models.ai_review import AIJobStatus, FindingSeverity, FindingType
from app.models.course import CourseLifecycleStatus

class AIFindingSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    asset_id: Optional[str] = None
    finding_type: FindingType
    severity: FindingSeverity
    claim: str
    source_location: Optional[str] = None
    conflicting_location: Optional[str] = None
    explanation: str
    suggested_correction: Optional[str] = None
    references_json: Optional[str] = None
    confidence: Optional[float] = None
    requires_human_review: bool

    @property
    def references(self) -> List[Dict[str, Any]]:
        if self.references_json:
            try:
                return json.loads(self.references_json)
            except Exception:
                return []
        return []

class AIReviewJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_id: str
    status: AIJobStatus
    summary: Optional[str] = None
    error_message: Optional[str] = None
    transcripts_json: Optional[str] = None
    total_segments: Optional[int] = 0
    total_claims: Optional[int] = 0
    created_at: datetime
    updated_at: datetime
    findings: List[AIFindingSchema] = []

class CourseSubmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    course_id: str
    status: CourseLifecycleStatus
    ai_job_id: str
    message: str

class FacultyPublicationDecisionRequest(BaseModel):
    decision: str = Field(..., description="APPROVE, REJECT, or REQUEST_REVISION")
    remarks: Optional[str] = Field(None, max_length=2000)

class FacultyCourseReviewDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    course_id: str
    title: str
    creator_id: str
    status: CourseLifecycleStatus
    created_at: datetime
    latest_ai_job: Optional[AIReviewJobResponse]


class CourseSubmissionRequest(BaseModel):
    faculty_email: str = Field(
        ...,
        min_length=5,
        max_length=255,
        pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    )

    faculty_name: Optional[str] = Field(
        None,
        max_length=100
    )

    student_message: Optional[str] = Field(
        None,
        max_length=2000
    )

