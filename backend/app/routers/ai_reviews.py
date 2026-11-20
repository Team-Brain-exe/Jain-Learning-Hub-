import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.ai_review import AIReviewJob, AIFinding, AIJobStatus
from app.models.course import Course, CourseLifecycleStatus
from app.schemas.ai_review import AIReviewJobResponse, AIFindingSchema
from app.core.auth_guards import get_current_user, require_role, CurrentUser
from app.services.ai_review_service import AIReviewService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai-reviews", tags=["AI Reviews"])

@router.get("/{job_id}", response_model=AIReviewJobResponse)
def get_ai_review_job(
    job_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """
    Retrieves status, itemized findings, citations, and source locations for an AI review job.
    Accessible to the course creator, assigned faculty reviewer, or admin.
    """
    job = db.query(AIReviewJob).filter(AIReviewJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI review job not found.")

    course = db.query(Course).filter(Course.id == job.course_id).first()
    if course and user.role != "admin":
        if course.creator_id != user.id and course.faculty_reviewer_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are neither the creator nor the reviewer for this course."
            )

    return job

@router.get("/course/{course_id}", response_model=AIReviewJobResponse)
def get_latest_ai_review_for_course(
    course_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """
    Retrieves the most recent AI review job and findings for a given course.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    if user.role != "admin" and course.creator_id != user.id and course.faculty_reviewer_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not authorized to view review reports for this course."
        )

    latest_job = (
        db.query(AIReviewJob)
        .filter(AIReviewJob.course_id == course_id)
        .order_by(AIReviewJob.created_at.desc())
        .first()
    )
    if not latest_job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No AI review job has been initiated for this course yet."
        )

    return latest_job

@router.post("/internal/jobs", response_model=AIReviewJobResponse, status_code=status.HTTP_202_ACCEPTED)
def trigger_internal_ai_job(
    course_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """
    Internal job trigger to run or rerun AI extraction and verification on a course.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    if course.creator_id != user.id and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    job = AIReviewService.trigger_ai_review(db=db, course=course)
    return job
