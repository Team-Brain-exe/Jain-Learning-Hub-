
import pytest

from app.models.user import User
from app.models.upload_permission import (
    VerifiedFaculty,
    UploadPermission,
    PermissionStatus,
)
from app.core.security import create_access_token, hash_password


@pytest.fixture(autouse=True)
def setup_ai_test_environment(db_session):
    # Create test accounts with real authentication records.
    users = [
        User(
            id="student_ai",
            name="AI Test Student",
            email="student_ai@example.com",
            password_hash=hash_password("TestPassword123!"),
            role="student",
            is_active=True,
        ),
        User(
            id="fac_ai_reviewer",
            name="Dr. Pritam Sen",
            email="pritam.sen@jain.ac.in",
            password_hash=hash_password("TestPassword123!"),
            role="faculty",
            is_active=True,
        ),
        User(
            id="fac_stranger",
            name="Prof. Stranger",
            email="stranger@jain.ac.in",
            password_hash=hash_password("TestPassword123!"),
            role="faculty",
            is_active=True,
        ),
    ]
    db_session.add_all(users)

    # Verified faculty records required by authentication guards.
    fac = VerifiedFaculty(
        id="fac_ai_reviewer",
        name="Dr. Pritam Sen",
        email="pritam.sen@jain.ac.in",
        department="AI & DS",
        is_active=True,
    )

    fac_other = VerifiedFaculty(
        id="fac_stranger",
        name="Prof. Stranger",
        email="stranger@jain.ac.in",
        department="Civil",
        is_active=True,
    )

    db_session.add_all([fac, fac_other])

    # Approved upload permission for the test student.
    perm = UploadPermission(
        id="perm_ai_test",
        student_id="student_ai",
        faculty_id="fac_ai_reviewer",
        title="Modern Python Architecture",
        content_type="academic",
        format="video",
        consent_declared=True,
        status=PermissionStatus.APPROVED,
    )

    db_session.add(perm)
    db_session.flush()


def test_ai_review_api_endpoints_and_guards(client):
    # Generate real JWT Bearer tokens for each test account.
    student_headers = {
        "Authorization": f"Bearer {create_access_token('student_ai')}"
    }

    faculty_headers = {
        "Authorization": f"Bearer {create_access_token('fac_ai_reviewer')}"
    }

    stranger_headers = {
        "Authorization": f"Bearer {create_access_token('fac_stranger')}"
    }

    # 1. Create course with an oversimplified claim.
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
                        "duration_minutes": 15,
                    }
                ],
            }
        ],
    }

    create_res = client.post(
        "/api/courses",
        json=course_payload,
        headers=student_headers,
    )

    assert create_res.status_code == 201, create_res.text
    course_id = create_res.json()["id"]

    # 2. Submit course for review.
    submit_res = client.post(
        f"/api/courses/{course_id}/submit",
        headers=student_headers,
    )

    assert submit_res.status_code == 200, submit_res.text
    ai_job_id = submit_res.json()["ai_job_id"]

    # 3. Unassigned faculty must not access the AI review.
    unauth_res = client.get(
        f"/api/ai-reviews/{ai_job_id}",
        headers=stranger_headers,
    )

    assert unauth_res.status_code == 403, unauth_res.text

    # 4. Assigned faculty can access the AI review.
    job_res = client.get(
        f"/api/ai-reviews/{ai_job_id}",
        headers=faculty_headers,
    )

    assert job_res.status_code == 200, job_res.text

    job_data = job_res.json()

    assert job_data["id"] == ai_job_id
    assert job_data["course_id"] == course_id
    assert job_data["status"] == "COMPLETED"
    assert len(job_data["findings"]) > 0

    # 5. Verify the AI flags the incorrect claim.
    error_findings = [
        finding
        for finding in job_data["findings"]
        if finding["finding_type"] == "POTENTIAL_ERROR"
    ]

    assert len(error_findings) >= 1

    err = error_findings[0]

    assert "bytecode" in err["suggested_correction"].lower()
    assert err["requires_human_review"] is True

    # 6. Retrieve latest AI review for the course.
    course_review_res = client.get(
        f"/api/ai-reviews/course/{course_id}",
        headers=faculty_headers,
    )

    assert course_review_res.status_code == 200, course_review_res.text
    assert course_review_res.json()["id"] == ai_job_id

    # 7. Trigger the internal AI review job endpoint.
    internal_res = client.post(
        f"/api/ai-reviews/internal/jobs?course_id={course_id}",
        headers=student_headers,
    )

    assert internal_res.status_code == 202, internal_res.text
    assert internal_res.json()["course_id"] == course_id
