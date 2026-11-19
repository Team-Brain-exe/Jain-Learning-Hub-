import pytest
from app.models.upload_permission import VerifiedFaculty, UploadPermission, PermissionStatus
from app.models.course import Course, CourseLifecycleStatus
from app.models.ai_review import AIReviewJob, AIFinding, AIJobStatus, FindingType, FindingSeverity

@pytest.fixture(autouse=True)
def setup_ai_test_environment(db_session):
    # Faculty
    fac = VerifiedFaculty(
        id="fac_ai_reviewer",
        name="Dr. Pritam Sen",
        email="pritam.sen@jain.ac.in",
        department="AI & DS",
        is_active=True
    )
    fac_other = VerifiedFaculty(
        id="fac_stranger",
        name="Prof. Stranger",
        email="stranger@jain.ac.in",
        department="Civil",
        is_active=True
    )
    db_session.add_all([fac, fac_other])

    # Permission
    perm = UploadPermission(
        id="perm_ai_test",
        student_id="student_ai",
        faculty_id="fac_ai_reviewer",
        title="Modern Python Architecture",
        content_type="academic",
        format="video",
        consent_declared=True,
        status=PermissionStatus.APPROVED
    )
    db_session.add(perm)
    db_session.commit()

def test_ai_review_api_endpoints_and_guards(client):
    # 1. Create course with a claim containing an oversimplification
    course_payload = {
        "permission_id": "perm_ai_test",
        "title": "Modern Python Architecture",
        "description": "Python is a compiled-only programming language.",
        "category": "academic",
        "level": "intermediate",
        "modules": [
            {
                "title": "Module 1: Execution Engine",
                "lessons": [
                    {
                        "title": "Python Bytecode vs Machine Code",
                        "content": "Python is a compiled-only programming language.",
                        "duration_minutes": 15
                    }
                ]
            }
        ]
    }

    create_res = client.post("/api/courses", json=course_payload, headers={"X-User-Id": "student_ai", "X-User-Role": "student"})
    assert create_res.status_code == 201
    course_id = create_res.json()["id"]

    # 2. Submit course for review -> triggers AIReviewService pipeline
    submit_res = client.post(f"/api/courses/{course_id}/submit", headers={"X-User-Id": "student_ai", "X-User-Role": "student"})
    assert submit_res.status_code == 200
    ai_job_id = submit_res.json()["ai_job_id"]

    # 3. Retrieve AI review by job ID
    # Unauthorized stranger cannot access
    unauth_res = client.get(f"/api/ai-reviews/{ai_job_id}", headers={"X-User-Id": "fac_stranger", "X-User-Role": "faculty"})
    assert unauth_res.status_code == 403

    # Assigned faculty CAN access
    job_res = client.get(f"/api/ai-reviews/{ai_job_id}", headers={"X-User-Id": "fac_ai_reviewer", "X-User-Role": "faculty"})
    assert job_res.status_code == 200
    job_data = job_res.json()
    assert job_data["id"] == ai_job_id
    assert job_data["course_id"] == course_id
    assert job_data["status"] == "COMPLETED"
    assert len(job_data["findings"]) > 0

    # Verify that the potential error was flagged with reference
    error_findings = [f for f in job_data["findings"] if f["finding_type"] == "POTENTIAL_ERROR"]
    assert len(error_findings) >= 1
    err = error_findings[0]
    assert "bytecode" in err["suggested_correction"].lower()
    assert err["requires_human_review"] is True

    # 4. Retrieve latest review for course endpoint
    course_review_res = client.get(f"/api/ai-reviews/course/{course_id}", headers={"X-User-Id": "fac_ai_reviewer", "X-User-Role": "faculty"})
    assert course_review_res.status_code == 200
    assert course_review_res.json()["id"] == ai_job_id

    # 5. Internal job trigger endpoint
    internal_res = client.post(f"/api/ai-reviews/internal/jobs?course_id={course_id}", headers={"X-User-Id": "student_ai", "X-User-Role": "student"})
    assert internal_res.status_code == 202
    assert internal_res.json()["course_id"] == course_id
