import enum
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field

class LocationType(str, enum.Enum):
    TIMESTAMP = "timestamp"
    SLIDE = "slide"
    PAGE = "page"
    SECTION = "section"
    GLOBAL = "global"

class ContentSegment(BaseModel):
    """
    Standardized extracted text segment preserving asset identity and location markers.
    """
    asset_id: str
    segment_index: int
    location_type: LocationType
    location_value: str  # e.g., "02:45" or "Slide 4" or "Page 2" or "Section: Architecture"
    text: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ClaimAssessmentType(str, enum.Enum):
    POTENTIAL_ERROR = "POTENTIAL_ERROR"
    UNSUPPORTED = "UNSUPPORTED"
    CONTRADICTION = "CONTRADICTION"
    NO_ISSUE_DETECTED = "NO_ISSUE_DETECTED"
    UNCERTAIN = "UNCERTAIN"

class FindingSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class CitationReference(BaseModel):
    """
    Grounded reference citation from the approved corpus.
    Must never be fabricated.
    """
    reference_id: str
    title: str
    snippet: str
    source_document: Optional[str] = None
    url: Optional[str] = None

class SourceLocation(BaseModel):
    asset_id: Optional[str] = None
    asset_name: Optional[str] = None
    location_type: LocationType = LocationType.GLOBAL
    location_value: Optional[str] = None  # e.g. "timestamp: 04:32" or "slide: 6" or "page: 3"
    timestamp_seconds: Optional[int] = None
    slide_number: Optional[int] = None
    page_number: Optional[int] = None

class VerifiedFinding(BaseModel):
    id: str
    finding_type: ClaimAssessmentType
    severity: FindingSeverity
    claim: str
    source_location: SourceLocation
    explanation: str
    suggested_correction: Optional[str] = None
    references: List[CitationReference] = Field(default_factory=list)
    requires_human_review: bool = True
    confidence: float = Field(default=0.8, ge=0.0, le=1.0)
    conflicting_source_location: Optional[SourceLocation] = None  # For cross-asset contradictions

class AIReportPayload(BaseModel):
    submission_id: str
    status: str  # COMPLETED, PARTIAL, FAILED
    summary: str
    total_segments_analyzed: int
    total_claims_checked: int
    findings: List[VerifiedFinding]
    transcripts_and_text: Dict[str, List[ContentSegment]] = Field(default_factory=dict)
    generated_at: str
    provider: str = "jain-fet-ai-verifier"
    version: str = "v1.0-grounded"
    disclaimer: str = (
        "AI findings are advisory and designed to assist faculty reviewers. "
        "The AI does not approve or publish content automatically."
    )
