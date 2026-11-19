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

# ----------------- ENROLLMENT -----------------

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
    """
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    # Calculate total lessons in course
    all_lessons = (
        db.query(Lesson)
        .join(Module, Lesson.module_id == Module.id)
        .filter(Module.course_id == course.id)
        .all()
    )
    total_lessons = len(all_lessons)
    lesson_ids = [l.id for l in all_lessons]

    # Calculate completed lessons
    completed_count = 0
    if lesson_ids:
        completed_count = db.query(LessonProgress).filter(
            LessonProgress.student_id == user.id,
            LessonProgress.lesson_id.in_(lesson_ids),
            LessonProgress.is_completed == True
        ).count()

    progress_percentage = (completed_count / total_lessons * 100.0) if total_lessons > 0 else 0.0

    return CourseProgressOverview(
        course_id=course.id,
        total_lessons=total_lessons,
        completed_lessons=completed_count,
        progress_percentage=round(progress_percentage, 1),
        is_course_completed=(completed_count == total_lessons and total_lessons > 0)
    )

# ----------------- QUIZ & ANTI-FORGERY EVALUATION -----------------

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

@router.post("/api/quizzes/{id}/attempts", response_model=QuizAttemptResponse)
def submit_quiz_attempt(
    id: str,
    payload: QuizAttemptRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("student"))
):
    """
    Evaluates student quiz submission against correct answers and passing threshold.
    Prevents forged completion; answers are checked on the server side.
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

    correct_count = 0
    for submission in payload.answers:
        q = questions.get(submission.question_id)
        if q and q.correct_option_index == submission.selected_option_index:
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

    # If passed and all lessons are complete, record enrollment completion timestamp
    if passed:
        all_lessons = (
            db.query(Lesson)
            .join(Module, Lesson.module_id == Module.id)
            .filter(Module.course_id == quiz.course_id)
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

        if completed_lessons == total_lessons:
            enrollment.completed_at = datetime.now(timezone.utc)

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
