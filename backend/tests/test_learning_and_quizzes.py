import json
import pytest
from app.models.upload_permission import VerifiedFaculty, UploadPermission, PermissionStatus
from app.models.course import Course, Module, Lesson, CourseLifecycleStatus
from app.models.learning import Quiz, QuizQuestion

@pytest.fixture(autouse=True)
def seed_learning_environment(db_session):
    # 1. Faculty & approved permission
    f1 = VerifiedFaculty(id="fac_cse", name="Dr. Rao", email="rao@jain.ac.in", department="CSE", is_active=True)
    db_session.add(f1)
    
    perm = UploadPermission(
        id="perm_learn_01",
        student_id="student_creator",
        faculty_id="fac_cse",
        title="Algorithms and Data Structures",
        content_type="academic",
        format="video",
        consent_declared=True,
        status=PermissionStatus.APPROVED
    )
    db_session.add(perm)

    # 2. Published Course with 2 lessons
    course_pub = Course(
        id="course_pub_01",
        creator_id="student_creator",
        permission_id="perm_learn_01",
        title="Algorithms and Data Structures",
        slug="algorithms-and-data-structures-123456",
        category="academic",
        level="intermediate",
        status=CourseLifecycleStatus.PUBLISHED,
        faculty_reviewer_id="fac_cse"
    )
    db_session.add(course_pub)

    # Unpublished draft course
    course_draft = Course(
        id="course_draft_02",
        creator_id="student_creator",
        permission_id="perm_learn_01",
        title="Draft Course",
        slug="draft-course-654321",
        category="academic",
        level="beginner",
        status=CourseLifecycleStatus.DRAFT
    )
    db_session.add(course_draft)

    # Module and Lessons for published course
    mod = Module(id="mod_01", course_id="course_pub_01", title="Sorting Algorithms", order_index=1)
    db_session.add(mod)

    l1 = Lesson(id="les_01", module_id="mod_01", title="Merge Sort", duration_minutes=15, order_index=1)
    l2 = Lesson(id="les_02", module_id="mod_01", title="Quick Sort", duration_minutes=20, order_index=2)
    db_session.add_all([l1, l2])

    # Quiz for published course (Passing score: 70%)
    quiz = Quiz(id="quiz_01", course_id="course_pub_01", title="Sorting Mastery Quiz", passing_score_percentage=70.0)
    db_session.add(quiz)

    q1 = QuizQuestion(
        id="q_01",
        quiz_id="quiz_01",
        question_text="What is the average time complexity of Merge Sort?",
        options_json=json.dumps(["O(n)", "O(n log n)", "O(n^2)", "O(1)"]),
        correct_option_index=1,
        order_index=1
    )
    q2 = QuizQuestion(
        id="q_02",
        quiz_id="quiz_01",
        question_text="Is Merge Sort a stable sort?",
        options_json=json.dumps(["Yes", "No"]),
        correct_option_index=0,
        order_index=2
    )
    db_session.add_all([q1, q2])
    db_session.commit()

# ==================== ENROLLMENT & PROGRESS TESTS ====================

def test_enrollment_in_published_vs_unpublished_course(client):
    # Attempt enrollment in draft course -> 400 Bad Request
    draft_res = client.post("/api/courses/course_draft_02/enroll", headers={"X-User-Id": "learner_101", "X-User-Role": "student"})
    assert draft_res.status_code == 400

    # Enroll in published course -> 201 Created
    pub_res = client.post("/api/courses/course_pub_01/enroll", headers={"X-User-Id": "learner_101", "X-User-Role": "student"})
    assert pub_res.status_code == 201
    assert pub_res.json()["student_id"] == "learner_101"
    assert pub_res.json()["course_id"] == "course_pub_01"

    # Idempotent: re-enrolling returns existing enrollment without duplicate
    dup_res = client.post("/api/courses/course_pub_01/enroll", headers={"X-User-Id": "learner_101", "X-User-Role": "student"})
    assert dup_res.status_code == 200
    assert dup_res.json()["id"] == pub_res.json()["id"]

def test_lesson_progress_requires_enrollment(client):
    # Learner NOT enrolled attempts to mark lesson complete -> 403 Forbidden
    res_unauth = client.post(
        "/api/lessons/les_01/progress",
        json={"is_completed": True},
        headers={"X-User-Id": "unregistered_student", "X-User-Role": "student"}
    )
    assert res_unauth.status_code == 403
    assert "must be enrolled" in res_unauth.json()["detail"]

def test_lesson_progress_tracking_and_course_completion(client):
    # 1. Enroll learner
    client.post("/api/courses/course_pub_01/enroll", headers={"X-User-Id": "learner_101", "X-User-Role": "student"})

    # 2. Check initial progress (0%)
    p0 = client.get("/api/courses/course_pub_01/progress", headers={"X-User-Id": "learner_101", "X-User-Role": "student"}).json()
    assert p0["total_lessons"] == 2
    assert p0["completed_lessons"] == 0
    assert p0["progress_percentage"] == 0.0
    assert p0["is_course_completed"] is False

    # 3. Complete lesson 1 -> 50%
    client.post("/api/lessons/les_01/progress", json={"is_completed": True}, headers={"X-User-Id": "learner_101", "X-User-Role": "student"})
    p1 = client.get("/api/courses/course_pub_01/progress", headers={"X-User-Id": "learner_101", "X-User-Role": "student"}).json()
    assert p1["completed_lessons"] == 1
    assert p1["progress_percentage"] == 50.0

    # 4. Complete lesson 2 -> 100%
    client.post("/api/lessons/les_02/progress", json={"is_completed": True}, headers={"X-User-Id": "learner_101", "X-User-Role": "student"})
    p2 = client.get("/api/courses/course_pub_01/progress", headers={"X-User-Id": "learner_101", "X-User-Role": "student"}).json()
    assert p2["completed_lessons"] == 2
    assert p2["progress_percentage"] == 100.0
    assert p2["is_course_completed"] is True

# ==================== QUIZ & ANTI-FORGERY TESTS ====================

def test_quiz_attempt_anti_forgery_and_passing_threshold(client):
    # Enroll learner
    client.post("/api/courses/course_pub_01/enroll", headers={"X-User-Id": "learner_101", "X-User-Role": "student"})

    # Attempt quiz with failing answers (0/2 = 0% < 70%)
    failing_submission = {
        "answers": [
            {"question_id": "q_01", "selected_option_index": 0},  # incorrect
            {"question_id": "q_02", "selected_option_index": 1}   # incorrect
        ]
    }
    fail_res = client.post("/api/quizzes/quiz_01/attempts", json=failing_submission, headers={"X-User-Id": "learner_101", "X-User-Role": "student"})
    assert fail_res.status_code == 200
    fail_data = fail_res.json()
    assert fail_data["score_percentage"] == 0.0
    assert fail_data["passed"] is False

    # Attempt quiz with passing answers (2/2 = 100% >= 70%)
    passing_submission = {
        "answers": [
            {"question_id": "q_01", "selected_option_index": 1},  # correct
            {"question_id": "q_02", "selected_option_index": 0}   # correct
        ]
    }
    pass_res = client.post("/api/quizzes/quiz_01/attempts", json=passing_submission, headers={"X-User-Id": "learner_101", "X-User-Role": "student"})
    assert pass_res.status_code == 200
    pass_data = pass_res.json()
    assert pass_data["correct_answers"] == 2
    assert pass_data["score_percentage"] == 100.0
    assert pass_data["passed"] is True

