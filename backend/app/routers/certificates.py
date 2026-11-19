import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List

from app.database import get_db
from app.models.course import Course, Lesson, Module, CourseLifecycleStatus
from app.models.learning import Enrollment, LessonProgress, Quiz, QuizAttempt
from app.models.certificate import Certificate, CertificateType
from app.schemas.certificate import (
    CertificateIssueRequest,
    CertificateResponse,
    CertificatePublicVerification,
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
        # Rule 1: Course Completion requires active enrollment + 100% lessons + passed quiz
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
        lesson_ids = [l.id for l in all_lessons]
        completed_lessons = 0
        if lesson_ids:
            completed_lessons = db.query(LessonProgress).filter(
                LessonProgress.student_id == recipient_id,
                LessonProgress.lesson_id.in_(lesson_ids),
                LessonProgress.is_completed == True
            ).count()

        if total_lessons > 0 and completed_lessons < total_lessons:
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

@router.post("/api/admin/certificates/issue", response_model=CertificateResponse, status_code=status.HTTP_201_CREATED)
def issue_certificate(
    payload: CertificateIssueRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("admin"))
):
    """
    Admin-authorized certificate issuance endpoint.
    Strictly verifies eligibility criteria before generating unique verification code and QR data.
    """
    # 1. Enforce strict eligibility checks
    course = verify_certificate_eligibility(
        db=db,
        recipient_id=payload.recipient_id,
        course_id=payload.course_id,
        cert_type=payload.certificate_type
    )

    # 2. Check if certificate was already issued
    existing = db.query(Certificate).filter(
        Certificate.recipient_id == payload.recipient_id,
        Certificate.course_id == payload.course_id,
        Certificate.certificate_type == payload.certificate_type
    ).first()

    if existing:
        return existing

    # 3. Generate unique verification code & verification URL
    cert_code = f"JAIN-{payload.certificate_type.value[:4]}-{uuid.uuid4().hex[:8].upper()}"
    verification_url = f"https://learninghub.jainuniversity.ac.in/verify/{cert_code}"
    qr_data = f"CERT:{cert_code}|RECIPIENT:{payload.recipient_id}|VERIFY:{verification_url}"

    title = f"{'Course Completion' if payload.certificate_type == CertificateType.COURSE_COMPLETION else 'Peer Educator'} - {course.title}"

    cert = Certificate(
        certificate_code=cert_code,
        recipient_id=payload.recipient_id,
        recipient_name=f"Student ({payload.recipient_id})",
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

