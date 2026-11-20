from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime

# ----------------- ENROLLMENT & PROGRESS SCHEMAS -----------------
class EnrollmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    student_id: str
    course_id: str
    enrolled_at: datetime
    completed_at: Optional[datetime]

class LessonProgressUpdate(BaseModel):
    is_completed: bool = True

class LessonProgressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    student_id: str
    lesson_id: str
    is_completed: bool
    completed_at: Optional[datetime]

class CourseProgressOverview(BaseModel):
    course_id: str
    total_lessons: int
    completed_lessons: int
    progress_percentage: float
    is_course_completed: bool
    completed_lesson_ids: List[str] = []
    is_quiz_passed: bool = False

# ----------------- QUIZ SCHEMAS -----------------
class QuizQuestionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    question_text: str
    options: List[str]
    order_index: int

class QuizDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_id: str
    title: str
    passing_score_percentage: float
    questions: List[QuizQuestionPublic] = []

class QuizAnswerSubmission(BaseModel):
    question_id: str
    selected_option_index: int

class QuizAttemptRequest(BaseModel):
    answers: List[QuizAnswerSubmission] = Field(..., min_length=1)

class QuizAttemptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    quiz_id: str
    student_id: str
    total_questions: int
    correct_answers: int
    score_percentage: float
    passed: bool
    passing_score_percentage: float
    attempted_at: datetime

