from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.upload_permission import PermissionStatus

class UploadPermissionCreateRequest(BaseModel):
    faculty_id: str = Field(..., description="ID of verified faculty member")
    title: str = Field(..., min_length=3, max_length=255)
    content_type: str = Field(..., description="e.g. academic or non-academic")
    format: str = Field(..., description="e.g. video, audio, ppt, pptx, pdf, docx, image")
    description: Optional[str] = None
    consent_declared: bool = Field(..., description="Must agree to content ownership & adherence declaration")

    @field_validator("consent_declared")
    @classmethod
    def validate_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Student consent declaration is required to request upload permission")
        return v

class FacultyDecisionRequest(BaseModel):
    decision: PermissionStatus = Field(..., description="APPROVED or REJECTED")
    remarks: Optional[str] = Field(None, max_length=1000)

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, v: PermissionStatus) -> PermissionStatus:
        if v not in [PermissionStatus.APPROVED, PermissionStatus.REJECTED]:
            raise ValueError("Decision must be either APPROVED or REJECTED")
        return v

class UploadPermissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    student_id: str
    faculty_id: str
    title: str
    content_type: str
    format: str
    description: Optional[str]
    consent_declared: bool
    consent_declared_at: Optional[datetime]
    status: PermissionStatus
    remarks: Optional[str]
    decision_timestamp: Optional[datetime]
    created_at: datetime
    updated_at: datetime

class FacultyDirectoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    department: str

