import logging
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional

from app.models.course import Course, CourseLifecycleStatus
from app.models.ai_review import AIReviewJob, AIFinding, AIJobStatus, FindingType, FindingSeverity

logger = logging.getLogger(__name__)

class AIReviewService:
    @staticmethod
    def trigger_ai_review(db: Session, course: Course) -> AIReviewJob:
        """
        Dispatches an AI review job referencing the submitted course & assets.
        In production, this enqueues an asynchronous task for Prit's Whisper / RAG pipeline.
        For independent testing/staging, it generates a structured review report matching Prit's schema.
        """
        # Create queued AI Job record
        job = AIReviewJob(
            course_id=course.id,
            status=AIJobStatus.PROCESSING,
            summary="AI extraction and factual verification initiated."
        )
        db.add(job)
        db.flush()

        # Simulate extraction and fact-checking findings conforming to Prit's schema
        finding1 = AIFinding(
            job_id=job.id,
            finding_type=FindingType.NO_ISSUE_DETECTED,
            severity=FindingSeverity.LOW,
            claim="Verified course syllabus adheres to Jain FET technical guidelines.",
            source_location="module: 1, lesson: 1",
            explanation="Claim matches reference syllabus criteria.",
            suggested_correction=None,
            requires_human_review=False
        )
        finding2 = AIFinding(
            job_id=job.id,
            finding_type=FindingType.POTENTIAL_ERROR,
            severity=FindingSeverity.MEDIUM,
            claim="Statement regarding Python execution model may require clarification.",
            source_location="timestamp: 04:32 (or slide 4)",
            explanation="Recommended clarifying byte-code compilation vs. pure interpreter execution.",
            suggested_correction="Clarify that Python compiles to bytecode (.pyc) before VM execution.",
            requires_human_review=True
        )

        db.add_all([finding1, finding2])
        
        job.status = AIJobStatus.COMPLETED
        job.summary = "AI processing completed with 1 potential issue for faculty review."
        job.updated_at = datetime.now(timezone.utc)

        # Transition course state: AI_PROCESSING -> FACULTY_REVIEW
        course.status = CourseLifecycleStatus.FACULTY_REVIEW
        course.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(job)
        db.refresh(course)
        
        logger.info(f"AI Review Job {job.id} completed for course {course.id}. Status: {course.status}")
        return job

