import json
import pytest
from app.models.upload_permission import VerifiedFaculty, UploadPermission, PermissionStatus
from app.models.course import Course, Module, Lesson, CourseLifecycleStatus
from app.models.learning import Enrollment, LessonProgress, Quiz, QuizQuestion, QuizAttempt
from app.models.certificate import CertificateType

@pytest.fixture(autouse=True)
def seed_certificate_fixtures(db_session):
    # Faculty & approved permission
    f1 = VerifiedFaculty(id="fac_cse", name="Dr. Rao", email="rao.cse.test@example.com", department="CSE", is_active=True)
    db_session.add(f1)
    
    perm = UploadPermission(
        id="perm_cert_01",
        student_id="creator_student",
        faculty_id="fac_cse",
        title="Distributed Systems Engineering",
        content_type="academic",
        format="video",
        consent_declared=True,
        status=PermissionStatus.APPROVED
    )
    db_session.add(perm)

    # Published course
    course_pub = Course(
        id="course_dist_sys",
        creator_id="creator_student",
        permission_id="perm_cert_01",
        title="Distributed Systems Engineering",
        slug="distributed-systems-engineering-789",
        category="academic",
        level="advanced",
        status=CourseLifecycleStatus.PUBLISHED,
        faculty_reviewer_id="fac_cse"
    )
    db_session.add(course_pub)

    # Draft course (unpublished)
    course_draft = Course(
        id="course_draft_only",
        creator_id="creator_student",
        permission_id="perm_cert_01",
        title="Draft Cloud Intro",
        slug="draft-cloud-intro-321",
        category="academic",
        level="beginner",
        status=CourseLifecycleStatus.DRAFT
    )
    db_session.add(course_draft)

    # Lessons for course_dist_sys
    mod = Module(id="mod_ds_01", course_id="course_dist_sys", title="Consensus", order_index=1)
    db_session.add(mod)
    l1 = Lesson(id="les_ds_01", module_id="mod_ds_01", title="Paxos & Raft", duration_minutes=30, order_index=1)
    db_session.add(l1)

    # Quiz for course_dist_sys
    quiz = Quiz(id="quiz_ds_01", course_id="course_dist_sys", title="Consensus Quiz", passing_score_percentage=75.0)
    db_session.add(quiz)
    q1 = QuizQuestion(
        id="q_ds_01",
        quiz_id="quiz_ds_01",
        question_text="Does Raft use leader election?",
        options_json=json.dumps(["Yes", "No"]),
        correct_option_index=0,
        order_index=1
    )
    db_session.add(q1)
    db_session.commit()

# ==================== COURSE COMPLETION CERTIFICATE TESTS ====================

def test_course_completion_ineligible_without_passing_quiz_and_lessons(client, auth_headers):
    # Student enrolled but has 0% lesson progress and no quiz attempt -> 400 Bad Request
    client.post("/api/courses/course_dist_sys/enroll", headers=auth_headers["student_learner"])

    req_payload = {
        "recipient_id": "student_learner",
        "course_id": "course_dist_sys",
        "certificate_type": "COURSE_COMPLETION",
        "is_sample": True
    }
    res = client.post("/api/admin/certificates/issue", json=req_payload, headers=auth_headers["admin_user"])
    assert res.status_code == 400
    assert "Ineligible" in res.json()["detail"]

def test_course_completion_eligible_and_public_verification(client, auth_headers):
    # 1. Enroll learner
    client.post("/api/courses/course_dist_sys/enroll", headers=auth_headers["student_learner"])

    # 2. Complete lesson
    client.post("/api/lessons/les_ds_01/progress", json={"is_completed": True}, headers=auth_headers["student_learner"])

    # 3. Pass quiz (100% >= 75%)
    client.post(
        "/api/quizzes/quiz_ds_01/attempts",
        json={"answers": [{"question_id": "q_ds_01", "selected_option_index": 0}]},
        headers=auth_headers["student_learner"]
    )

    # 4. Admin issues certificate -> 201 Created
    req_payload = {
        "recipient_id": "student_learner",
        "course_id": "course_dist_sys",
        "certificate_type": "COURSE_COMPLETION",
        "is_sample": True
    }
    issue_res = client.post("/api/admin/certificates/issue", json=req_payload, headers=auth_headers["admin_user"])
    assert issue_res.status_code == 201
    cert_data = issue_res.json()
    assert cert_data["recipient_id"] == "student_learner"
    assert cert_data["certificate_type"] == "COURSE_COMPLETION"
    assert cert_data["is_sample"] is True
    assert "JAIN-COUR-" in cert_data["certificate_code"]
    code = cert_data["certificate_code"]

    # 5. Student views certificate in /api/certificates/me
    me_res = client.get("/api/certificates/me", headers=auth_headers["student_learner"])
    assert me_res.status_code == 200
    assert any(c["certificate_code"] == code for c in me_res.json())

    # 6. Public verification (unauthenticated endpoint)
    verify_res = client.get(f"/api/certificates/verify/{code}")
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["is_valid"] is True
    assert v_data["certificate_code"] == code
    assert v_data["is_sample"] is True
    assert "JAIN" in v_data["university"]

# ==================== PEER EDUCATOR CERTIFICATE TESTS ====================

def test_peer_educator_ineligible_for_non_creator_or_unpublished(client, auth_headers):
    # Non-creator student attempts to claim peer educator certificate -> 400
    req_bad_creator = {
        "recipient_id": "impostor_student",
        "course_id": "course_dist_sys",
        "certificate_type": "PEER_EDUCATOR",
        "is_sample": True
    }
    res1 = client.post("/api/admin/certificates/issue", json=req_bad_creator, headers=auth_headers["admin_user"])
    assert res1.status_code == 400
    assert "not the original creator" in res1.json()["detail"]

    # Creator on unpublished draft course -> 400
    req_unpublished = {
        "recipient_id": "creator_student",
        "course_id": "course_draft_only",
        "certificate_type": "PEER_EDUCATOR",
        "is_sample": True
    }
    res2 = client.post("/api/admin/certificates/issue", json=req_unpublished, headers=auth_headers["admin_user"])
    assert res2.status_code == 400
    assert "must be approved and published" in res2.json()["detail"]

def test_peer_educator_success_and_admin_role_restriction(client, auth_headers):
    # Non-admin cannot issue certificates -> 403 Forbidden
    req_payload = {
        "recipient_id": "creator_student",
        "course_id": "course_dist_sys",
        "certificate_type": "PEER_EDUCATOR",
        "is_sample": True
    }
    unauth_res = client.post("/api/admin/certificates/issue", json=req_payload, headers=auth_headers["student_user"])
    assert unauth_res.status_code == 403

    # Admin issues Peer Educator certificate -> 201 Created
    issue_res = client.post("/api/admin/certificates/issue", json=req_payload, headers=auth_headers["admin_user"])
    assert issue_res.status_code == 201
    cert_data = issue_res.json()
    assert cert_data["certificate_type"] == "PEER_EDUCATOR"
    assert "Peer Educator" in cert_data["title"]

