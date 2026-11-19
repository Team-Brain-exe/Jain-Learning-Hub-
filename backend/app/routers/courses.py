import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.course import Course, Module, Lesson, CourseLifecycleStatus
from app.schemas.course import (
    CourseCreateRequest,
    CourseUpdateRequest,
    CourseResponse,
)
from app.schemas.ai_review import (
    CourseSubmissionResponse,
    FacultyPublicationDecisionRequest,
    FacultyCourseReviewDetail,
    AIReviewJobResponse,
)
from app.services.ai_review_service import AIReviewService
from app.models.ai_review import AIReviewJob
from app.core.auth_guards import (
    get_current_user,
    require_role,
    CurrentUser,
    verify_approved_upload_permission,
)

router = APIRouter(prefix="/api/courses", tags=["Courses"])

def slugify(title: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", title.lower())
    base_slug = re.sub(r"[\s_-]+", "-", cleaned).strip("-")
    return f"{base_slug}-{uuid.uuid4().hex[:6]}"

@router.get("", response_model=List[CourseResponse])
def list_courses(
    category: str = None,
    db: Session = Depends(get_db)
):
    """
    Public course catalog: Only lists PUBLISHED courses to learners.
    """
    query = db.query(Course).filter(Course.status == CourseLifecycleStatus.PUBLISHED)
    if category:
        query = query.filter(Course.category == category)
    return query.order_by(Course.created_at.desc()).all()

@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreateRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """
    Student creator creates course draft.
    Must verify approved upload permission before drafting course!
    """
    # 1. Server-side verification of approved permission
    permission = verify_approved_upload_permission(
        db=db,
        student_id=user.id,
        permission_id=payload.permission_id
    )

    # 2. Build course and embedded modules/lessons
    course = Course(
        creator_id=user.id,
        permission_id=permission.id,
        title=payload.title,
        slug=slugify(payload.title),
        description=payload.description,
        category=payload.category,
        level=payload.level,
        thumbnail_url=payload.thumbnail_url,
        status=CourseLifecycleStatus.DRAFT,
        faculty_reviewer_id=permission.faculty_id
    )

    for m_idx, m_data in enumerate(payload.modules):
        mod = Module(
            title=m_data.title,
            description=m_data.description,
            order_index=m_data.order_index or m_idx
        )
        for l_idx, l_data in enumerate(m_data.lessons):
            lesson = Lesson(
                title=l_data.title,
                content=l_data.content,
                duration_minutes=l_data.duration_minutes,
                order_index=l_data.order_index or l_idx,
                media_asset_id=l_data.media_asset_id
            )
            mod.lessons.append(lesson)
        course.modules.append(mod)

    db.add(course)
    db.commit()
    db.refresh(course)
    return course

@router.get("/{id}", response_model=CourseResponse)
def get_course_detail(
    id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """
    Get course by ID. Published courses are accessible to all.
    Draft/Submitted courses are accessible only to the creator or assigned faculty.
    """
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    if course.status != CourseLifecycleStatus.PUBLISHED:
        # Check permissions: must be creator or faculty reviewer
        if course.creator_id != user.id and course.faculty_reviewer_id != user.id and user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: This course is not published and can only be viewed by its creator or reviewer."
            )

    return course

@router.patch("/{id}", response_model=CourseResponse)
def update_course(
    id: str,
    payload: CourseUpdateRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """
    Creator edits course draft. Edits are restricted when course is locked under review.
    """
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    if course.creator_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not own this course.")

    # Restrict edits if already in AI_PROCESSING or FACULTY_REVIEW
    if course.status in [CourseLifecycleStatus.AI_PROCESSING, CourseLifecycleStatus.FACULTY_REVIEW]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Course cannot be edited while in '{course.status}' state."
        )

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(course, field, val)

    db.commit()
    db.refresh(course)
    return course

# ----------------- SUBMISSION & FACULTY PUBLICATION REVIEW (PHASE 3) -----------------

@router.post("/{id}/submit", response_model=CourseSubmissionResponse)
def submit_course_for_review(
    id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """
    Student submits course draft for review.
    Lifecycle transition: DRAFT -> SUBMITTED -> AI_PROCESSING -> FACULTY_REVIEW.
    Triggers AI review job referencing assets and course structure.
    """
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    if course.creator_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not own this course.")

    if course.status not in [CourseLifecycleStatus.DRAFT, CourseLifecycleStatus.REVISION_REQUESTED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit course currently in '{course.status}' state."
        )

    # 1. Transition to SUBMITTED -> AI_PROCESSING
    course.status = CourseLifecycleStatus.SUBMITTED
    db.commit()

    # 2. Trigger AI Review Job (Prit's pipeline adapter)
    job = AIReviewService.trigger_ai_review(db=db, course=course)

    return CourseSubmissionResponse(
        course_id=course.id,
        status=course.status,
        ai_job_id=job.id,
        message="Course successfully submitted and processed by AI verification. Pending faculty review."
    )

@router.get("/faculty/reviews", response_model=List[CourseResponse], tags=["Faculty Review"])
def list_faculty_course_reviews(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("faculty"))
):
    """
    Faculty reviewer lists all submitted courses assigned to them for publication review.
    """
    return db.query(Course).filter(
        Course.faculty_reviewer_id == user.id,
        Course.status.in_([CourseLifecycleStatus.FACULTY_REVIEW, CourseLifecycleStatus.SUBMITTED])
    ).order_by(Course.updated_at.desc()).all()

@router.get("/faculty/reviews/{id}", response_model=FacultyCourseReviewDetail, tags=["Faculty Review"])
def get_faculty_course_review_detail(
    id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("faculty"))
):
    """
    Faculty inspects course contents, uploaded media, and AI fact-checking/transcription findings.
    """
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    if course.faculty_reviewer_id != user.id and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not assigned to review this course.")

    latest_job = db.query(AIReviewJob).filter(AIReviewJob.course_id == course.id).order_by(AIReviewJob.created_at.desc()).first()

    return FacultyCourseReviewDetail(
        course_id=course.id,
        title=course.title,
        creator_id=course.creator_id,
        status=course.status,
        created_at=course.created_at,
        latest_ai_job=latest_job
    )

@router.post("/faculty/reviews/{id}/decision", response_model=CourseResponse, tags=["Faculty Review"])
def submit_faculty_publication_decision(
    id: str,
    payload: FacultyPublicationDecisionRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("faculty"))
):
    """
    Faculty makes the final publication decision after evaluating AI findings.
    Supported decisions:
      - APPROVE -> transitions course to PUBLISHED (now visible in public catalog)
      - REJECT -> transitions course to REJECTED
      - REQUEST_REVISION -> transitions course to REVISION_REQUESTED
    """
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    if course.faculty_reviewer_id != user.id and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not authorized to make a publication decision on this course.")

    decision_clean = payload.decision.upper().strip()
    if decision_clean == "APPROVE":
        course.status = CourseLifecycleStatus.PUBLISHED
    elif decision_clean == "REJECT":
        course.status = CourseLifecycleStatus.REJECTED
    elif decision_clean == "REQUEST_REVISION":
        course.status = CourseLifecycleStatus.REVISION_REQUESTED
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid decision. Must be one of: 'APPROVE', 'REJECT', or 'REQUEST_REVISION'."
        )

    course.review_remarks = payload.remarks
    db.commit()
    db.refresh(course)
    return course


