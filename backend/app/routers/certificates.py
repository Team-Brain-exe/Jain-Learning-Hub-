import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.course import Course, Lesson, Module, CourseLifecycleStatus
from app.models.learning import Enrollment, LessonProgress, Quiz, QuizAttempt
from app.models.certificate import Certificate, CertificateType
from app.schemas.certificate import (
    CertificateIssueRequest,
    CertificateResponse,
    CertificatePublicVerification,
    CertificateEligibilityResponse,
)
from app.core.auth_guards import (
    get_current_user,
    require_role,
    CurrentUser,
)

router = APIRouter(tags=["Certificates"])

def verify_certificate_eligibility(
    db: Session,
    recipient_id: str,
    course_id: str,
    cert_type: CertificateType
) -> Course:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    if cert_type == CertificateType.COURSE_COMPLETION:
        # Rule 1: Course Completion requires active enrollment + published course + 100% lessons + passed quiz
        if course.status != CourseLifecycleStatus.PUBLISHED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ineligible: Course must be approved and published (current status: '{course.status}')."
            )

        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == recipient_id,
            Enrollment.course_id == course_id
        ).first()

        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ineligible: Student is not enrolled in this course."
            )

        # Check all lessons completed
        all_lessons = (
            db.query(Lesson)
            .join(Module, Lesson.module_id == Module.id)
            .filter(Module.course_id == course_id)
            .all()
        )
        total_lessons = len(all_lessons)
        if total_lessons == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ineligible: Course has no lessons configured."
            )

        lesson_ids = [l.id for l in all_lessons]
        completed_lessons = 0
        if lesson_ids:
            completed_lessons = db.query(LessonProgress).filter(
                LessonProgress.student_id == recipient_id,
                LessonProgress.lesson_id.in_(lesson_ids),
                LessonProgress.is_completed == True
            ).count()

        if completed_lessons < total_lessons:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ineligible: Student has completed {completed_lessons}/{total_lessons} lessons."
            )

        # Check quiz passed
        quiz = db.query(Quiz).filter(Quiz.course_id == course_id).first()
        if quiz:
            passed_attempt = db.query(QuizAttempt).filter(
                QuizAttempt.student_id == recipient_id,
                QuizAttempt.quiz_id == quiz.id,
                QuizAttempt.passed == True
            ).first()
            if not passed_attempt:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ineligible: Student has not passed the required course quiz."
                )

    elif cert_type == CertificateType.PEER_EDUCATOR:
        # Rule 2: Peer Educator certificate is for the student creator whose course is APPROVED & PUBLISHED
        if course.creator_id != recipient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ineligible: Student is not the original creator of this course."
            )

        if course.status != CourseLifecycleStatus.PUBLISHED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ineligible: Course must be approved and published by faculty (current status: '{course.status}')."
            )

        # Role restriction: verify recipient is a student creator
        recipient_user = db.query(User).filter(User.id == recipient_id).first()
        if recipient_user and recipient_user.role != "student":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ineligible: Peer educator certificates are restricted to student creators (recipient role is '{recipient_user.role}')."
            )

    return course

@router.get("/api/certificates/me", response_model=List[CertificateResponse])
def get_my_certificates(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """
    Student views all issued Course Completion and Peer Educator certificates.
    """
    return db.query(Certificate).filter(Certificate.recipient_id == user.id).order_by(Certificate.issued_at.desc()).all()

@router.get("/api/courses/{id}/certificate-eligibility", response_model=CertificateEligibilityResponse)
def check_certificate_eligibility(
    id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """
    Allows a student to inspect their eligibility status for both Course Completion and Peer Educator certificates.
    """
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == user.id,
        Enrollment.course_id == course.id
    ).first()

    all_lessons = (
        db.query(Lesson)
        .join(Module, Lesson.module_id == Module.id)
        .filter(Module.course_id == course.id)
        .all()
    )
    total_lessons = len(all_lessons)
    lesson_ids = [l.id for l in all_lessons]
    completed_lessons = 0
    if lesson_ids:
        completed_lessons = db.query(LessonProgress).filter(
            LessonProgress.student_id == user.id,
            LessonProgress.lesson_id.in_(lesson_ids),
            LessonProgress.is_completed == True
        ).count()

    lessons_completed = (total_lessons > 0 and completed_lessons == total_lessons)

    quiz = db.query(Quiz).filter(Quiz.course_id == course.id).first()
    has_quiz = quiz is not None
    quiz_passed = False
    if quiz:
        passed_attempt = db.query(QuizAttempt).filter(
            QuizAttempt.student_id == user.id,
            QuizAttempt.quiz_id == quiz.id,
            QuizAttempt.passed == True
        ).first()
        quiz_passed = bool(passed_attempt)

    is_pub = course.status == CourseLifecycleStatus.PUBLISHED
    is_eligible_completion = bool(enrollment and lessons_completed and (not has_quiz or quiz_passed) and is_pub)
    is_eligible_peer = bool(course.creator_id == user.id and is_pub and user.role == "student")

    # Check existing certificates
    existing_completion = db.query(Certificate).filter(
        Certificate.recipient_id == user.id,
        Certificate.course_id == course.id,
        Certificate.certificate_type == CertificateType.COURSE_COMPLETION
    ).first()

    existing_peer = db.query(Certificate).filter(
        Certificate.recipient_id == user.id,
        Certificate.course_id == course.id,
        Certificate.certificate_type == CertificateType.PEER_EDUCATOR
    ).first()

    return CertificateEligibilityResponse(
        course_id=course.id,
        is_enrolled=bool(enrollment),
        total_lessons=total_lessons,
        completed_lessons=completed_lessons,
        lessons_completed=lessons_completed,
        has_quiz=has_quiz,
        quiz_passed=quiz_passed,
        is_eligible_for_completion_cert=is_eligible_completion,
        is_eligible_for_peer_educator_cert=is_eligible_peer,
        existing_completion_certificate_code=existing_completion.certificate_code if existing_completion else None,
        existing_peer_educator_certificate_code=existing_peer.certificate_code if existing_peer else None
    )

@router.post("/api/admin/certificates/issue", response_model=CertificateResponse, status_code=status.HTTP_201_CREATED)
def issue_certificate(
    payload: CertificateIssueRequest,
    response: Response,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("admin"))
):
    """
    Admin-authorized certificate issuance endpoint.
    Strictly verifies eligibility criteria before generating unique verification code and QR data.
    Idempotent: Returns 200 OK with existing certificate if already issued.
    """
    # 1. Enforce strict eligibility checks
    course = verify_certificate_eligibility(
        db=db,
        recipient_id=payload.recipient_id,
        course_id=payload.course_id,
        cert_type=payload.certificate_type
    )

    # 2. Check if certificate was already issued (idempotent duplicate handling)
    existing = db.query(Certificate).filter(
        Certificate.recipient_id == payload.recipient_id,
        Certificate.course_id == payload.course_id,
        Certificate.certificate_type == payload.certificate_type
    ).first()

    if existing:
        response.status_code = status.HTTP_200_OK
        return existing

    # 3. Lookup real recipient name from user table if available
    recipient_user = db.query(User).filter(User.id == payload.recipient_id).first()
    recipient_name = recipient_user.name if (recipient_user and recipient_user.name) else f"Student ({payload.recipient_id})"

    # 4. Generate unique verification code & verification URL
    cert_code = f"JAIN-{payload.certificate_type.value[:4]}-{uuid.uuid4().hex[:8].upper()}"
    verification_url = f"https://learninghub.jainuniversity.ac.in/verify/{cert_code}"
    qr_data = f"CERT:{cert_code}|RECIPIENT:{payload.recipient_id}|VERIFY:{verification_url}"

    title = f"{'Course Completion' if payload.certificate_type == CertificateType.COURSE_COMPLETION else 'Peer Educator'} - {course.title}"

    cert = Certificate(
        certificate_code=cert_code,
        recipient_id=payload.recipient_id,
        recipient_name=recipient_name,
        certificate_type=payload.certificate_type,
        course_id=course.id,
        title=title,
        issuer_id=user.id,
        is_sample=payload.is_sample,
        verification_url=verification_url,
        qr_code_data=qr_data,
        issued_at=datetime.now(timezone.utc)
    )

    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert

@router.get("/api/certificates/verify/{code}", response_model=CertificatePublicVerification)
def verify_certificate_public(
    code: str,
    db: Session = Depends(get_db)
):
    """
    Public verification endpoint (accessible by employers / public without login).
    Verifies authenticity, sample status, and course details.
    """
    cert = db.query(Certificate).filter(Certificate.certificate_code == code.strip().upper()).first()
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid certificate: Credential code not found in Jain FET registry."
        )

    course = db.query(Course).filter(Course.id == cert.course_id).first()

    return CertificatePublicVerification(
        certificate_code=cert.certificate_code,
        recipient_name=cert.recipient_name,
        certificate_type=cert.certificate_type,
        course_title=course.title if course else cert.title,
        is_valid=True,
        is_sample=cert.is_sample,
        issued_at=cert.issued_at
    )

