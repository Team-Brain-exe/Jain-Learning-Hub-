import json
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List

from app.database import get_db
from app.models.course import Course, Lesson, Module, CourseLifecycleStatus
from app.models.learning import Enrollment, LessonProgress, Quiz, QuizQuestion, QuizAttempt
from app.schemas.learning import (
    EnrollmentResponse,
    LessonProgressUpdate,
    LessonProgressResponse,
    CourseProgressOverview,
    QuizDetailResponse,
    QuizQuestionPublic,
    QuizAttemptRequest,
    QuizAttemptResponse,
)
from app.core.auth_guards import (
    get_current_user,
    require_role,
    CurrentUser,
)

router = APIRouter(tags=["Learning & Progress"])

def sync_enrollment_completion(
    db: Session,
    enrollment: Enrollment,
    course_id: str,
    student_id: str
):
    """
    Evaluates whether student has completed both required lessons and passing quiz.
    Maintains enrollment.completed_at accurately regardless of completion order.
    """
    all_lessons = (
        db.query(Lesson)
        .join(Module, Lesson.module_id == Module.id)
        .filter(Module.course_id == course_id)
        .all()
    )
    total_lessons = len(all_lessons)
    lesson_ids = [l.id for l in all_lessons]

    completed_count = 0
    if lesson_ids:
        completed_count = db.query(LessonProgress).filter(
            LessonProgress.student_id == student_id,
            LessonProgress.lesson_id.in_(lesson_ids),
            LessonProgress.is_completed == True
        ).count()

    lessons_done = (total_lessons > 0 and completed_count == total_lessons)

    quiz = db.query(Quiz).filter(Quiz.course_id == course_id).first()
    if quiz:
        passed_attempt = db.query(QuizAttempt).filter(
            QuizAttempt.student_id == student_id,
            QuizAttempt.quiz_id == quiz.id,
            QuizAttempt.passed == True
        ).first()
        quiz_done = bool(passed_attempt)
    else:
        quiz_done = True

    if lessons_done and quiz_done:
        if not enrollment.completed_at:
            enrollment.completed_at = datetime.now(timezone.utc)
    else:
        enrollment.completed_at = None

# ----------------- ENROLLMENT -----------------

@router.get("/api/enrollments/me", response_model=List[EnrollmentResponse])
def get_my_enrollments(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """
    Returns active course enrollments for the logged-in student.
    """
    return (
        db.query(Enrollment)
        .filter(Enrollment.student_id == user.id)
        .order_by(Enrollment.enrolled_at.desc())
        .all()
    )

@router.get("/api/courses/{id}/enrollment", response_model=EnrollmentResponse)
def get_course_enrollment(
    id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """
    Checks if student is enrolled in a specific course.
    """
    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == user.id,
        Enrollment.course_id == id
    ).first()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student is not enrolled in this course."
        )

    return enrollment

@router.post("/api/courses/{id}/enroll", response_model=EnrollmentResponse)
def enroll_in_course(
    id: str,
    response: Response,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """
    Student enrolls into a published course.
    Idempotent: New enrollment returns 201 Created; re-enrolling returns existing enrollment with 200 OK.
    """
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    if course.status != CourseLifecycleStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot enroll: Course is not published."
        )

    # Check existing enrollment
    existing = db.query(Enrollment).filter(
        Enrollment.student_id == user.id,
        Enrollment.course_id == course.id
    ).first()

    if existing:
        response.status_code = status.HTTP_200_OK
        return existing

    enrollment = Enrollment(
        student_id=user.id,
        course_id=course.id,
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    response.status_code = status.HTTP_201_CREATED
    return enrollment

# ----------------- LESSON PROGRESS -----------------

@router.post("/api/lessons/{id}/progress", response_model=LessonProgressResponse)
def update_lesson_progress(
    id: str,
    payload: LessonProgressUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """
    Track student's lesson completion. Prevents forged progress without enrollment.
    """
    lesson = db.query(Lesson).filter(Lesson.id == id).first()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found.")

    # Verify student is enrolled in the parent course
    module = db.query(Module).filter(Module.id == lesson.module_id).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson module not found.")

    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == user.id,
        Enrollment.course_id == module.course_id
    ).first()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You must be enrolled in this course to record progress."
        )

    progress = db.query(LessonProgress).filter(
        LessonProgress.student_id == user.id,
        LessonProgress.lesson_id == lesson.id
    ).first()

    now = datetime.now(timezone.utc)
    if not progress:
        progress = LessonProgress(
            student_id=user.id,
            lesson_id=lesson.id,
            is_completed=payload.is_completed,
            completed_at=now if payload.is_completed else None
        )
        db.add(progress)
    else:
        progress.is_completed = payload.is_completed
        progress.completed_at = now if payload.is_completed else None

    db.flush()

    # Sync enrollment completion status
    sync_enrollment_completion(db, enrollment, module.course_id, user.id)

    db.commit()
    db.refresh(progress)
    return progress

@router.get("/api/courses/{id}/progress", response_model=CourseProgressOverview)
def get_course_progress(
    id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """
    Returns student's overall lesson completion percentage for a course.
    Enforces active enrollment check.
    """
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == user.id,
        Enrollment.course_id == course.id
    ).first()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You must be enrolled in this course to view progress."
        )

    # Calculate total lessons in course
    all_lessons = (
        db.query(Lesson)
        .join(Module, Lesson.module_id == Module.id)
        .filter(Module.course_id == course.id)
        .all()
    )
    total_lessons = len(all_lessons)
    lesson_ids = [l.id for l in all_lessons]

    # Calculate completed lessons and fetch completed lesson IDs
    completed_count = 0
    completed_ids = []
    if lesson_ids:
        completed_records = db.query(LessonProgress).filter(
            LessonProgress.student_id == user.id,
            LessonProgress.lesson_id.in_(lesson_ids),
            LessonProgress.is_completed == True
        ).all()
        completed_count = len(completed_records)
        completed_ids = [r.lesson_id for r in completed_records]

    progress_percentage = (completed_count / total_lessons * 100.0) if total_lessons > 0 else 0.0

    quiz = db.query(Quiz).filter(Quiz.course_id == course.id).first()
    is_quiz_passed = False
    if quiz:
        passed_attempt = db.query(QuizAttempt).filter(
            QuizAttempt.student_id == user.id,
            QuizAttempt.quiz_id == quiz.id,
            QuizAttempt.passed == True
        ).first()
        is_quiz_passed = bool(passed_attempt)

    return CourseProgressOverview(
        course_id=course.id,
        total_lessons=total_lessons,
        completed_lessons=completed_count,
        progress_percentage=round(progress_percentage, 1),
        is_course_completed=(completed_count == total_lessons and total_lessons > 0),
        completed_lesson_ids=completed_ids,
        is_quiz_passed=is_quiz_passed
    )

# ----------------- QUIZ & ANTI-FORGERY EVALUATION -----------------

@router.get("/api/courses/{id}/quiz", response_model=QuizDetailResponse)
def get_course_quiz(
    id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """
    Retrieves the quiz configured for a course without exposing answer keys.
    """
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    quiz = db.query(Quiz).filter(Quiz.course_id == course.id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No quiz configured for this course.")

    if user.role == "student":
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == user.id,
            Enrollment.course_id == course.id
        ).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You must be enrolled in this course to view the quiz."
            )

    public_questions = []
    for q in quiz.questions:
        options = json.loads(q.options_json)
        public_questions.append(
            QuizQuestionPublic(
                id=q.id,
                question_text=q.question_text,
                options=options,
                order_index=q.order_index
            )
        )

    return QuizDetailResponse(
        id=quiz.id,
        course_id=quiz.course_id,
        title=quiz.title,
        passing_score_percentage=quiz.passing_score_percentage,
        questions=public_questions
    )

@router.get("/api/quizzes/{id}", response_model=QuizDetailResponse)
def get_quiz_details(
    id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """
    Retrieves quiz questions without revealing correct answer indices.
    """
    quiz = db.query(Quiz).filter(Quiz.id == id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")

    if user.role == "student":
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == user.id,
            Enrollment.course_id == quiz.course_id
        ).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You must be enrolled in this course to view the quiz."
            )

    public_questions = []
    for q in quiz.questions:
        options = json.loads(q.options_json)
        public_questions.append(
            QuizQuestionPublic(
                id=q.id,
                question_text=q.question_text,
                options=options,
                order_index=q.order_index
            )
        )

    return QuizDetailResponse(
        id=quiz.id,
        course_id=quiz.course_id,
        title=quiz.title,
        passing_score_percentage=quiz.passing_score_percentage,
        questions=public_questions
    )

@router.get("/api/quizzes/{id}/attempts", response_model=List[QuizAttemptResponse])
def get_quiz_attempts(
    id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """
    Retrieves historical attempts for this quiz by the current student.
    """
    quiz = db.query(Quiz).filter(Quiz.id == id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")

    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.quiz_id == quiz.id, QuizAttempt.student_id == user.id)
        .order_by(QuizAttempt.attempted_at.desc())
        .all()
    )

    total_questions = len(quiz.questions)
    res = []
    for a in attempts:
        correct_count = round((a.score_percentage / 100.0) * total_questions) if total_questions > 0 else 0
        res.append(
            QuizAttemptResponse(
                id=a.id,
                quiz_id=a.quiz_id,
                student_id=a.student_id,
                total_questions=total_questions,
                correct_answers=correct_count,
                score_percentage=a.score_percentage,
                passed=a.passed,
                passing_score_percentage=quiz.passing_score_percentage,
                attempted_at=a.attempted_at
            )
        )
    return res

@router.post("/api/quizzes/{id}/attempts", response_model=QuizAttemptResponse)
def submit_quiz_attempt(
    id: str,
    payload: QuizAttemptRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """
    Evaluates student quiz submission against correct answers and passing threshold.
    Prevents forged completion; answers are checked on the server side with deduplication.
    """
    quiz = db.query(Quiz).filter(Quiz.id == id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")

    # Verify student is enrolled in the parent course
    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == user.id,
        Enrollment.course_id == quiz.course_id
    ).first()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You must be enrolled in this course to take the quiz."
        )

    questions = {q.id: q for q in quiz.questions}
    if not questions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz has no questions configured.")

    # Anti-forgery: Deduplicate answers per question_id and ignore submitted IDs not in this quiz
    deduped_answers = {}
    for submission in payload.answers:
        if submission.question_id in questions:
            deduped_answers[submission.question_id] = submission.selected_option_index

    correct_count = 0
    for q_id, selected_idx in deduped_answers.items():
        q = questions[q_id]
        if q.correct_option_index == selected_idx:
            correct_count += 1

    total_questions = len(questions)
    score_percentage = round((correct_count / total_questions) * 100.0, 1)
    passed = score_percentage >= quiz.passing_score_percentage

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        student_id=user.id,
        score_percentage=score_percentage,
        passed=passed
    )
    db.add(attempt)
    db.flush()

    # Sync enrollment completion status
    sync_enrollment_completion(db, enrollment, quiz.course_id, user.id)

    db.commit()
    db.refresh(attempt)

    return QuizAttemptResponse(
        id=attempt.id,
        quiz_id=quiz.id,
        student_id=user.id,
        total_questions=total_questions,
        correct_answers=correct_count,
        score_percentage=score_percentage,
        passed=passed,
        passing_score_percentage=quiz.passing_score_percentage,
        attempted_at=attempt.attempted_at
    )
