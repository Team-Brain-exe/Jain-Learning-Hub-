from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.ai_review import AIJobStatus, FindingSeverity, FindingType
from app.models.course import CourseLifecycleStatus

class AIFindingSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    asset_id: Optional[str]
    finding_type: FindingType
    severity: FindingSeverity
    claim: str
    source_location: Optional[str]
    explanation: str
    suggested_correction: Optional[str]
    requires_human_review: bool

class AIReviewJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_id: str
    status: AIJobStatus
    summary: Optional[str]
    error_message: Optional[str]
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

