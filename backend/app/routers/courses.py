import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User
from app.services.notification_service import EmailNotificationService
from typing import List

from app.database import get_db
from app.models.course import Course, Module, Lesson, MediaAsset, CourseLifecycleStatus, UploadSessionStatus
from app.schemas.course import (
    CourseCreateRequest,
    CourseUpdateRequest,
    CourseResponse,
)
from app.schemas.ai_review import (
    CourseSubmissionResponse,
    CourseSubmissionRequest,
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
            if l_data.media_asset_id:
                asset = db.query(MediaAsset).filter(MediaAsset.id == l_data.media_asset_id).first()
                if not asset:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Referenced media asset '{l_data.media_asset_id}' not found."
                    )
                if asset.uploader_id != user.id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: You cannot attach another user's media asset."
                    )
                if asset.upload_status != UploadSessionStatus.FINALIZED:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Referenced media asset must be finalized before attaching to a course."
                    )
            # Validate asset permission and course association
            if l_data.media_asset_id:
                if asset.permission_id != permission.id:
                    raise HTTPException(
                        status_code=403,
                        detail="Media asset permission mismatch."
                    )

                if asset.course_id is not None:
                    raise HTTPException(
                        status_code=409,
                        detail="Media asset already belongs to a course."
                    )

                asset.course = course

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
    payload: CourseSubmissionRequest = None,
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

    # Re-verify that the underlying upload permission is still approved
    verify_approved_upload_permission(
        db=db,
        student_id=user.id,
        permission_id=course.permission_id
    )

    # Resolve the selected faculty using the database.
    faculty_query = db.query(User).filter(
        User.role == "faculty",
        User.is_active.is_(True),
    )

    if payload is not None:
        faculty = faculty_query.filter(
            func.lower(User.email) ==
            payload.faculty_email.strip().lower()
        ).first()
    else:
        faculty = faculty_query.filter(
            User.id == course.faculty_reviewer_id
        ).first()

    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active faculty account found for this email."
        )

    if faculty.id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot review your own course."
        )

    student = db.query(User).filter(
        User.id == user.id
    ).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student account not found."
        )

    course.faculty_reviewer_id = faculty.id

    # 1. Transition to SUBMITTED -> AI_PROCESSING
    course.status = CourseLifecycleStatus.SUBMITTED
    db.commit()

    # 2. Trigger AI Review Job (Prit's pipeline adapter)
    job = AIReviewService.trigger_ai_review(db=db, course=course)

    db.refresh(course)

    submission_message = (
        "Course submitted. AI verification is in progress."
    )

    if course.status == CourseLifecycleStatus.FACULTY_REVIEW:
        notification = (
            EmailNotificationService
            .send_faculty_course_review_notification(
                faculty_email=faculty.email,
                faculty_name=faculty.name,
                student_name=student.name,
                course_id=course.id,
                course_title=course.title,
                student_message=(
                    payload.student_message or ""
                    if payload is not None else ""
                ),
            )
        )

        if notification.get("status") == "SENT":
            submission_message = (
                "Course submitted for faculty review. "
                "Email notification sent successfully."
            )
        else:
            submission_message = (
                "Course submitted for faculty review, "
                "but email notification failed."
            )

    return CourseSubmissionResponse(
        course_id=course.id,
        status=course.status,
        ai_job_id=job.id,
        message=submission_message,
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

    if course.status not in [CourseLifecycleStatus.FACULTY_REVIEW, CourseLifecycleStatus.SUBMITTED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit faculty decision when course is in '{course.status}' state."
        )

    decision_clean = payload.decision.upper().strip()
    if decision_clean == "APPROVE":
        from app.models.ai_review import AIJobStatus
        latest_job = db.query(AIReviewJob).filter(AIReviewJob.course_id == course.id).order_by(AIReviewJob.created_at.desc()).first()
        if latest_job and latest_job.status in [AIJobStatus.QUEUED, AIJobStatus.PROCESSING, AIJobStatus.EXTRACTING, AIJobStatus.VERIFYING]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot approve course while AI verification job is still in progress."
            )
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


