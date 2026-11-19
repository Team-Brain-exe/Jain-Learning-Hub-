import pytest
from app.models.upload_permission import VerifiedFaculty

@pytest.fixture(autouse=True)
def seed_faculties(db_session):
    f1 = VerifiedFaculty(id="fac_1", name="Dr. Rao", email="rao@jain.ac.in", department="CSE", is_active=True)
    f2 = VerifiedFaculty(id="fac_2", name="Dr. Sunita", email="sunita@jain.ac.in", department="AI", is_active=True)
    db_session.add_all([f1, f2])
    db_session.commit()

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_faculty_directory_listing(client):
    response = client.get("/api/faculty/directory")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "Dr. Rao"

def test_student_must_declare_consent(client):
    payload = {
        "faculty_id": "fac_1",
        "title": "Machine Learning Fundamentals",
        "content_type": "academic",
        "format": "video",
        "consent_declared": False
    }
    response = client.post("/api/upload-permissions", json=payload, headers={"X-User-Role": "student"})
    assert response.status_code == 422

def test_student_invalid_faculty_rejected(client):
    payload = {
        "faculty_id": "fac_unknown_fake",
        "title": "Robotics Intro",
        "content_type": "academic",
        "format": "pdf",
        "consent_declared": True
    }
    response = client.post("/api/upload-permissions", json=payload, headers={"X-User-Role": "student"})
    assert response.status_code == 400
    assert "Invalid or unverified faculty" in response.json()["detail"]

def test_student_creates_permission_request_successfully(client):
    payload = {
        "faculty_id": "fac_1",
        "title": "Neural Networks Deep Dive",
        "content_type": "academic",
        "format": "video",
        "description": "Lecture slides and recorded demos",
        "consent_declared": True
    }
    headers = {"X-User-Id": "student_101", "X-User-Role": "student"}
    response = client.post("/api/upload-permissions", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "PENDING"
    assert data["student_id"] == "student_101"
    assert data["faculty_id"] == "fac_1"
    assert data["consent_declared"] is True

def test_student_can_fetch_own_requests(client):
    payload = {
        "faculty_id": "fac_1",
        "title": "Data Structures",
        "content_type": "academic",
        "format": "pdf",
        "consent_declared": True
    }
    client.post("/api/upload-permissions", json=payload, headers={"X-User-Id": "student_abc", "X-User-Role": "student"})
    
    # Fetch as student_abc
    res = client.get("/api/upload-permissions/me", headers={"X-User-Id": "student_abc", "X-User-Role": "student"})
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 1
    assert items[0]["student_id"] == "student_abc"
    assert items[0]["title"] == "Data Structures"

    # Other student has 0
    res_other = client.get("/api/upload-permissions/me", headers={"X-User-Id": "student_xyz", "X-User-Role": "student"})
    assert res_other.status_code == 200
    assert len(res_other.json()) == 0

def test_faculty_detail_and_access_control(client):
    payload = {
        "faculty_id": "fac_1",
        "title": "Compiler Design",
        "content_type": "academic",
        "format": "video",
        "consent_declared": True
    }
    req = client.post("/api/upload-permissions", json=payload, headers={"X-User-Id": "student_101", "X-User-Role": "student"}).json()
    req_id = req["id"]

    # Other faculty trying to view detail -> 403
    res_other = client.get(f"/api/faculty/upload-permissions/{req_id}", headers={"X-User-Id": "fac_2", "X-User-Role": "faculty"})
    assert res_other.status_code == 403

    # Assigned faculty viewing detail -> 200
    res_assigned = client.get(f"/api/faculty/upload-permissions/{req_id}", headers={"X-User-Id": "fac_1", "X-User-Role": "faculty"})
    assert res_assigned.status_code == 200
    assert res_assigned.json()["id"] == req_id

def test_faculty_approval_workflow_and_unauthorized_rejection(client):
    # 1. Student submits request
    payload = {
        "faculty_id": "fac_1",
        "title": "Cloud Architecture",
        "content_type": "academic",
        "format": "pptx",
        "consent_declared": True
    }
    req = client.post("/api/upload-permissions", json=payload, headers={"X-User-Id": "student_101", "X-User-Role": "student"}).json()
    req_id = req["id"]

    # 2. Unassigned faculty (fac_2) attempts to decide -> 403 Forbidden
    dec_response = client.post(
        f"/api/faculty/upload-permissions/{req_id}/decision",
        json={"decision": "APPROVED", "remarks": "Looks great"},
        headers={"X-User-Id": "fac_2", "X-User-Role": "faculty"}
    )
    assert dec_response.status_code == 403

    # 3. Assigned faculty (fac_1) approves -> 200 OK
    approve_response = client.post(
        f"/api/faculty/upload-permissions/{req_id}/decision",
        json={"decision": "APPROVED", "remarks": "High quality content approved"},
        headers={"X-User-Id": "fac_1", "X-User-Role": "faculty"}
    )
    assert approve_response.status_code == 200
    assert approve_response.json()["status"] == "APPROVED"
    assert approve_response.json()["remarks"] == "High quality content approved"

    # 4. Duplicate / conflicting decision after finalization is rejected -> 400 Bad Request
    dup_response = client.post(
        f"/api/faculty/upload-permissions/{req_id}/decision",
        json={"decision": "REJECTED", "remarks": "Changed my mind"},
        headers={"X-User-Id": "fac_1", "X-User-Role": "faculty"}
    )
    assert dup_response.status_code == 400
    assert "Conflict" in dup_response.json()["detail"]
