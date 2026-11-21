import json
import pytest
from app.models.upload_permission import VerifiedFaculty, UploadPermission, PermissionStatus
from app.models.course import Course, Module, Lesson, CourseLifecycleStatus
from app.models.learning import Quiz, QuizQuestion

@pytest.fixture(autouse=True)
def seed_learning_environment(db_session):
    # 1. Faculty & approved permission
    f1 = VerifiedFaculty(id="fac_cse", name="Dr. Rao", email="rao.cse.test@example.com", department="CSE", is_active=True)
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

def test_enrollment_in_published_vs_unpublished_course(client, auth_headers):
    # Attempt enrollment in draft course -> 400 Bad Request
    draft_res = client.post("/api/courses/course_draft_02/enroll", headers=auth_headers["learner_101"])
    assert draft_res.status_code == 400

    # Enroll in published course -> 201 Created
    pub_res = client.post("/api/courses/course_pub_01/enroll", headers=auth_headers["learner_101"])
    assert pub_res.status_code == 201
    assert pub_res.json()["student_id"] == "learner_101"
    assert pub_res.json()["course_id"] == "course_pub_01"

    # Idempotent: re-enrolling returns existing enrollment without duplicate
    dup_res = client.post("/api/courses/course_pub_01/enroll", headers=auth_headers["learner_101"])
    assert dup_res.status_code == 200
    assert dup_res.json()["id"] == pub_res.json()["id"]

def test_lesson_progress_requires_enrollment(client, auth_headers):
    # Learner NOT enrolled attempts to mark lesson complete -> 403 Forbidden
    res_unauth = client.post(
        "/api/lessons/les_01/progress",
        json={"is_completed": True},
        headers=auth_headers["unregistered_student"]
    )
    assert res_unauth.status_code == 403
    assert "must be enrolled" in res_unauth.json()["detail"]

def test_lesson_progress_tracking_and_course_completion(client, auth_headers):
    # 1. Enroll learner
    client.post("/api/courses/course_pub_01/enroll", headers=auth_headers["learner_101"])

    # 2. Check initial progress (0%)
    p0 = client.get("/api/courses/course_pub_01/progress", headers=auth_headers["learner_101"]).json()
    assert p0["total_lessons"] == 2
    assert p0["completed_lessons"] == 0
    assert p0["progress_percentage"] == 0.0
    assert p0["is_course_completed"] is False

    # 3. Complete lesson 1 -> 50%
    client.post("/api/lessons/les_01/progress", json={"is_completed": True}, headers=auth_headers["learner_101"])
    p1 = client.get("/api/courses/course_pub_01/progress", headers=auth_headers["learner_101"]).json()
    assert p1["completed_lessons"] == 1
    assert p1["progress_percentage"] == 50.0

    # 4. Complete lesson 2 -> 100%
    client.post("/api/lessons/les_02/progress", json={"is_completed": True}, headers=auth_headers["learner_101"])
    p2 = client.get("/api/courses/course_pub_01/progress", headers=auth_headers["learner_101"]).json()
    assert p2["completed_lessons"] == 2
    assert p2["progress_percentage"] == 100.0
    assert p2["is_course_completed"] is True

# ==================== QUIZ & ANTI-FORGERY TESTS ====================

def test_quiz_attempt_anti_forgery_and_passing_threshold(client, auth_headers):
    # Enroll learner
    client.post("/api/courses/course_pub_01/enroll", headers=auth_headers["learner_101"])

    # Attempt quiz with failing answers (0/2 = 0% < 70%)
    failing_submission = {
        "answers": [
            {"question_id": "q_01", "selected_option_index": 0},  # incorrect
            {"question_id": "q_02", "selected_option_index": 1}   # incorrect
        ]
    }
    fail_res = client.post("/api/quizzes/quiz_01/attempts", json=failing_submission, headers=auth_headers["learner_101"])
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
    pass_res = client.post("/api/quizzes/quiz_01/attempts", json=passing_submission, headers=auth_headers["learner_101"])
    assert pass_res.status_code == 200
    pass_data = pass_res.json()
    assert pass_data["correct_answers"] == 2
    assert pass_data["score_percentage"] == 100.0
    assert pass_data["passed"] is True

def test_get_my_enrollments_and_course_enrollment(client, auth_headers):
    # Before enrollment: /api/courses/{id}/enrollment returns 404
    chk_before = client.get("/api/courses/course_pub_01/enrollment", headers=auth_headers["learner_101"])
    assert chk_before.status_code == 404

    # Enroll learner
    client.post("/api/courses/course_pub_01/enroll", headers=auth_headers["learner_101"])

    # Check /api/enrollments/me
    me_res = client.get("/api/enrollments/me", headers=auth_headers["learner_101"])
    assert me_res.status_code == 200
    items = me_res.json()
    assert len(items) >= 1
    assert items[0]["course_id"] == "course_pub_01"
    assert items[0]["student_id"] == "learner_101"

    # Check /api/courses/{id}/enrollment returns 200
    chk_after = client.get("/api/courses/course_pub_01/enrollment", headers=auth_headers["learner_101"])
    assert chk_after.status_code == 200
    assert chk_after.json()["course_id"] == "course_pub_01"

def test_non_student_role_cannot_enroll(client, auth_headers):
    # Faculty attempting enrollment -> 403 Forbidden
    res = client.post("/api/courses/course_pub_01/enroll", headers=auth_headers["fac_1"])
    assert res.status_code == 403

def test_get_course_progress_requires_enrollment(client, auth_headers):
    # Unenrolled student attempting to view progress -> 403 Forbidden
    res = client.get("/api/courses/course_pub_01/progress", headers=auth_headers["unregistered_student"])
    assert res.status_code == 403
    assert "must be enrolled" in res.json()["detail"]

def test_order_independent_course_completion_sync(client, auth_headers):
    """
    Verifies that enrollment.completed_at is accurately updated when:
    1. Student passes quiz FIRST
    2. Student completes lessons AFTERWARDS
    3. Student uncompletes a lesson -> completed_at is reset
    """
    # 1. Enroll learner
    client.post("/api/courses/course_pub_01/enroll", headers=auth_headers["learner_101"])

    # 2. Pass quiz FIRST
    pass_res = client.post(
        "/api/quizzes/quiz_01/attempts",
        json={"answers": [
            {"question_id": "q_01", "selected_option_index": 1},
            {"question_id": "q_02", "selected_option_index": 0}
        ]},
        headers=auth_headers["learner_101"]
    )
    assert pass_res.status_code == 200

    # Lessons not done yet -> enrollment.completed_at should be None
    enr_res = client.get("/api/courses/course_pub_01/enrollment", headers=auth_headers["learner_101"])
    assert enr_res.json()["completed_at"] is None

    # 3. Complete lesson 1
    client.post("/api/lessons/les_01/progress", json={"is_completed": True}, headers=auth_headers["learner_101"])
    enr_res = client.get("/api/courses/course_pub_01/enrollment", headers=auth_headers["learner_101"])
    assert enr_res.json()["completed_at"] is None

    # 4. Complete lesson 2 -> All lessons + quiz passed -> enrollment.completed_at is SET
    client.post("/api/lessons/les_02/progress", json={"is_completed": True}, headers=auth_headers["learner_101"])
    enr_res = client.get("/api/courses/course_pub_01/enrollment", headers=auth_headers["learner_101"])
    assert enr_res.json()["completed_at"] is not None

    # Check progress overview includes completed lesson IDs and quiz status
    prog = client.get("/api/courses/course_pub_01/progress", headers=auth_headers["learner_101"]).json()
    assert prog["is_course_completed"] is True
    assert prog["is_quiz_passed"] is True
    assert set(prog["completed_lesson_ids"]) == {"les_01", "les_02"}

    # 5. Unmark lesson 2 -> completed_at is RESET to None
    client.post("/api/lessons/les_02/progress", json={"is_completed": False}, headers=auth_headers["learner_101"])
    enr_res = client.get("/api/courses/course_pub_01/enrollment", headers=auth_headers["learner_101"])
    assert enr_res.json()["completed_at"] is None

def test_quiz_details_and_course_quiz_endpoints(client, auth_headers):
    # Unenrolled student cannot access quiz
    res_unauth = client.get("/api/courses/course_pub_01/quiz", headers=auth_headers["unregistered_student"])
    assert res_unauth.status_code == 403

    # Enroll learner
    client.post("/api/courses/course_pub_01/enroll", headers=auth_headers["learner_101"])

    # Lookup via /api/courses/{id}/quiz
    q_course = client.get("/api/courses/course_pub_01/quiz", headers=auth_headers["learner_101"])
    assert q_course.status_code == 200
    q_data = q_course.json()
    assert q_data["id"] == "quiz_01"
    assert len(q_data["questions"]) == 2
    # Verify answers are NOT exposed
    for q in q_data["questions"]:
        assert "correct_option_index" not in q

    # Lookup via /api/quizzes/{id}
    q_direct = client.get("/api/quizzes/quiz_01", headers=auth_headers["learner_101"])
    assert q_direct.status_code == 200
    assert q_direct.json()["id"] == "quiz_01"

def test_quiz_anti_forgery_duplicate_and_invalid_questions(client, auth_headers):
    """
    Prevents forged answer submissions from:
    1. Repeating the same correct answer multiple times to artificially inflate score
    2. Submitting bogus question IDs not belonging to the quiz
    """
    client.post("/api/courses/course_pub_01/enroll", headers=auth_headers["learner_101"])

    # Attempt to game the score by sending 4 copies of correct question 1 and bogus question IDs
    cheat_payload = {
        "answers": [
            {"question_id": "q_01", "selected_option_index": 1},  # correct
            {"question_id": "q_01", "selected_option_index": 1},  # duplicate
            {"question_id": "q_01", "selected_option_index": 1},  # duplicate
            {"question_id": "bogus_question_id", "selected_option_index": 0}  # fake question
        ]
    }
    res = client.post("/api/quizzes/quiz_01/attempts", json=cheat_payload, headers=auth_headers["learner_101"])
    assert res.status_code == 200
    data = res.json()
    # Quiz has 2 total questions. Deduplication means q_01 counts once = 1/2 = 50.0% (< 70% threshold)
    assert data["total_questions"] == 2
    assert data["correct_answers"] == 1
    assert data["score_percentage"] == 50.0
    assert data["passed"] is False

def test_get_quiz_attempts_history(client, auth_headers):
    client.post("/api/courses/course_pub_01/enroll", headers=auth_headers["learner_101"])

    # Submit 1 failing attempt
    client.post("/api/quizzes/quiz_01/attempts", json={
        "answers": [{"question_id": "q_01", "selected_option_index": 0}, {"question_id": "q_02", "selected_option_index": 1}]
    }, headers=auth_headers["learner_101"])

    # Submit 1 passing attempt
    client.post("/api/quizzes/quiz_01/attempts", json={
        "answers": [{"question_id": "q_01", "selected_option_index": 1}, {"question_id": "q_02", "selected_option_index": 0}]
    }, headers=auth_headers["learner_101"])

    # Query /api/quizzes/{id}/attempts
    hist_res = client.get("/api/quizzes/quiz_01/attempts", headers=auth_headers["learner_101"])
    assert hist_res.status_code == 200
    attempts = hist_res.json()
    assert len(attempts) >= 2
    assert attempts[0]["passed"] is True
    assert attempts[1]["passed"] is False


