import pytest
from app.models.upload_permission import VerifiedFaculty, UploadPermission, PermissionStatus
from app.models.course import Course, CourseLifecycleStatus

@pytest.fixture(autouse=True)
def seed_test_submission_data(db_session):
    # Verified faculty
    f1 = VerifiedFaculty(id="fac_reviewer", name="Prof. Sharma", email="sharma@jain.ac.in", department="AI", is_active=True)
    f2 = VerifiedFaculty(id="fac_unassigned", name="Dr. Unassigned", email="unassigned@jain.ac.in", department="ECE", is_active=True)
    db_session.add_all([f1, f2])

    # Approved upload permission
    perm = UploadPermission(
        id="perm_course_sub",
        student_id="student_creator",
        faculty_id="fac_reviewer",
        title="Deep Learning with PyTorch",
        content_type="academic",
        format="video",
        consent_declared=True,
        status=PermissionStatus.APPROVED
    )
    db_session.add(perm)
    db_session.commit()

def test_course_submission_triggers_ai_job_and_state_transition(client, auth_headers):
    # 1. Create Course Draft
    course_payload = {
        "permission_id": "perm_course_sub",
        "title": "Deep Learning with PyTorch",
        "category": "academic",
        "level": "intermediate",
        "modules": [
            {
                "title": "Tensors & Autograd",
                "lessons": [{"title": "Tensor Math", "duration_minutes": 20}]
            }
        ]
    }
    c_res = client.post("/api/courses", json=course_payload, headers=auth_headers["student_creator"])
    assert c_res.status_code == 201
    c_id = c_res.json()["id"]
    assert c_res.json()["status"] == "DRAFT"

    # 2. Non-owner cannot submit course -> 403 Forbidden
    unauth_sub = client.post(f"/api/courses/{c_id}/submit", headers=auth_headers["student_other"])
    assert unauth_sub.status_code == 403

    # 3. Creator submits course -> 200 OK
    sub_res = client.post(f"/api/courses/{c_id}/submit", headers=auth_headers["student_creator"])
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["course_id"] == c_id
    assert sub_data["status"] == "FACULTY_REVIEW"
    assert sub_data["ai_job_id"] is not None

def test_faculty_review_listing_and_inspection(client, auth_headers):
    # 1. Create and submit course
    course_payload = {
        "permission_id": "perm_course_sub",
        "title": "Computer Vision Principles",
        "category": "academic",
        "level": "advanced"
    }
    c_id = client.post("/api/courses", json=course_payload, headers=auth_headers["student_creator"]).json()["id"]
    client.post(f"/api/courses/{c_id}/submit", headers=auth_headers["student_creator"])

    # 2. Assigned faculty lists pending reviews -> 200 OK
    fac_reviews = client.get("/api/courses/faculty/reviews", headers=auth_headers["fac_reviewer"])
    assert fac_reviews.status_code == 200
    assert any(c["id"] == c_id for c in fac_reviews.json())

    # 3. Unassigned faculty cannot view detail -> 403
    unassigned_view = client.get(f"/api/courses/faculty/reviews/{c_id}", headers=auth_headers["fac_unassigned"])
    assert unassigned_view.status_code == 403

    # 4. Assigned faculty views detailed review including AI findings
    fac_detail = client.get(f"/api/courses/faculty/reviews/{c_id}", headers=auth_headers["fac_reviewer"])
    assert fac_detail.status_code == 200
    detail_data = fac_detail.json()
    assert detail_data["course_id"] == c_id
    assert detail_data["latest_ai_job"] is not None
    assert detail_data["latest_ai_job"]["status"] == "COMPLETED"
    assert len(detail_data["latest_ai_job"]["findings"]) > 0

def test_faculty_decision_publication_workflow(client, auth_headers):
    # Create and submit course
    course_payload = {
        "permission_id": "perm_course_sub",
        "title": "Natural Language Processing",
        "category": "academic",
        "level": "intermediate"
    }
    c_id = client.post("/api/courses", json=course_payload, headers=auth_headers["student_creator"]).json()["id"]
    client.post(f"/api/courses/{c_id}/submit", headers=auth_headers["student_creator"])

    # Before faculty approval: Course must NOT be in public catalog
    catalog_before = client.get("/api/courses").json()
    assert all(c["id"] != c_id for c in catalog_before)

    # Assigned faculty APPROVES course
    dec_res = client.post(
        f"/api/courses/faculty/reviews/{c_id}/decision",
        json={"decision": "APPROVE", "remarks": "Excellent academic rigor and presentation."},
        headers=auth_headers["fac_reviewer"]
    )
    assert dec_res.status_code == 200
    assert dec_res.json()["status"] == "PUBLISHED"

    # After faculty approval: Course IS NOW VISIBLE in public catalog!
    catalog_after = client.get("/api/courses").json()
    assert any(c["id"] == c_id for c in catalog_after)

def test_faculty_request_revision_workflow(client, auth_headers):
    # Create and submit course
    course_payload = {
        "permission_id": "perm_course_sub",
        "title": "Quantum Computing 101",
        "category": "academic",
        "level": "beginner"
    }
    c_id = client.post("/api/courses", json=course_payload, headers=auth_headers["student_creator"]).json()["id"]
    client.post(f"/api/courses/{c_id}/submit", headers=auth_headers["student_creator"])

    # Faculty requests revision with remarks
    rev_res = client.post(
        f"/api/courses/faculty/reviews/{c_id}/decision",
        json={"decision": "REQUEST_REVISION", "remarks": "Please fix slide 4 qubit definition."},
        headers=auth_headers["fac_reviewer"]
    )
    assert rev_res.status_code == 200
    assert rev_res.json()["status"] == "REVISION_REQUESTED"

    # Course is still hidden from public catalog
    catalog = client.get("/api/courses").json()
    assert all(c["id"] != c_id for c in catalog)

    # Creator can now update the course again
    patch_res = client.patch(
        f"/api/courses/{c_id}",
        json={"description": "Updated with corrected qubit diagrams"},
        headers=auth_headers["student_creator"]
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["description"] == "Updated with corrected qubit diagrams"

