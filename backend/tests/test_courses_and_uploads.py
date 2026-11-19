import pytest
from app.models.upload_permission import VerifiedFaculty, UploadPermission, PermissionStatus

@pytest.fixture(autouse=True)
def seed_test_data(db_session):
    f1 = VerifiedFaculty(id="fac_cse", name="Dr. Rao", email="rao@jain.ac.in", department="CSE", is_active=True)
    db_session.add(f1)
    
    # Seed an APPROVED upload permission for student_101
    perm_approved = UploadPermission(
        id="perm_appr_101",
        student_id="student_101",
        faculty_id="fac_cse",
        title="Python Data Structures",
        content_type="academic",
        format="video",
        consent_declared=True,
        status=PermissionStatus.APPROVED
    )
    # Seed a PENDING upload permission for student_101
    perm_pending = UploadPermission(
        id="perm_pend_101",
        student_id="student_101",
        faculty_id="fac_cse",
        title="Web Security 101",
        content_type="academic",
        format="pdf",
        consent_declared=True,
        status=PermissionStatus.PENDING
    )
    db_session.add_all([perm_approved, perm_pending])
    db_session.commit()

# ==================== UPLOAD GATING & FILE VALIDATION TESTS ====================

def test_upload_init_fails_without_approved_permission(client):
    payload = {
        "permission_id": "perm_pend_101",
        "file_name": "lesson1.pdf",
        "file_type": "pdf",
        "mime_type": "application/pdf",
        "file_size_bytes": 1024 * 500
    }
    res = client.post("/api/uploads/request", json=payload, headers={"X-User-Id": "student_101", "X-User-Role": "student"})
    assert res.status_code == 403
    assert "not approved" in res.json()["detail"]

def test_upload_init_fails_for_cross_student_permission(client):
    payload = {
        "permission_id": "perm_appr_101",
        "file_name": "intro.mp4",
        "file_type": "video",
        "mime_type": "video/mp4",
        "file_size_bytes": 1024 * 1024 * 10
    }
    res = client.post("/api/uploads/request", json=payload, headers={"X-User-Id": "student_200", "X-User-Role": "student"})
    assert res.status_code == 403
    assert "does not belong to you" in res.json()["detail"]

def test_upload_init_fails_on_mime_mismatch_or_oversize(client):
    payload_bad_mime = {
        "permission_id": "perm_appr_101",
        "file_name": "malware.exe",
        "file_type": "video",
        "mime_type": "application/x-msdownload",
        "file_size_bytes": 1024
    }
    res1 = client.post("/api/uploads/request", json=payload_bad_mime, headers={"X-User-Id": "student_101", "X-User-Role": "student"})
    assert res1.status_code == 422

    payload_oversize = {
        "permission_id": "perm_appr_101",
        "file_name": "huge_diagram.png",
        "file_type": "image",
        "mime_type": "image/png",
        "file_size_bytes": 20 * 1024 * 1024
    }
    res2 = client.post("/api/uploads/request", json=payload_oversize, headers={"X-User-Id": "student_101", "X-User-Role": "student"})
    assert res2.status_code == 422

def test_upload_lifecycle_init_and_finalize_success(client):
    init_payload = {
        "permission_id": "perm_appr_101",
        "file_name": "binary_trees.mp4",
        "file_type": "video",
        "mime_type": "video/mp4",
        "file_size_bytes": 25 * 1024 * 1024
    }
    init_res = client.post("/api/uploads/request", json=init_payload, headers={"X-User-Id": "student_101", "X-User-Role": "student"})
    assert init_res.status_code == 201
    init_data = init_res.json()
    assert init_data["upload_status"] == "INITIALIZED"
    assert "signed-put" in init_data["upload_url"]
    asset_id = init_data["asset_id"]

    final_payload = {
        "permission_id": "perm_appr_101",
        "asset_id": asset_id
    }
    final_res = client.post("/api/uploads/finalize", json=final_payload, headers={"X-User-Id": "student_101", "X-User-Role": "student"})
    assert final_res.status_code == 200
    final_data = final_res.json()
    assert final_data["upload_status"] == "FINALIZED"
    assert final_data["id"] == asset_id
    assert final_data["uploader_id"] == "student_101"

def test_upload_finalize_reverifies_authorization(client):
    init_payload = {
        "permission_id": "perm_appr_101",
        "file_name": "module1.pdf",
        "file_type": "pdf",
        "mime_type": "application/pdf",
        "file_size_bytes": 1024 * 50
    }
    init_data = client.post("/api/uploads/request", json=init_payload, headers={"X-User-Id": "student_101", "X-User-Role": "student"}).json()
    asset_id = init_data["asset_id"]

    final_payload = {"permission_id": "perm_appr_101", "asset_id": asset_id}
    res = client.post("/api/uploads/finalize", json=final_payload, headers={"X-User-Id": "student_hacker", "X-User-Role": "student"})
    assert res.status_code == 403

# ==================== COURSE, MODULE, LESSON CRUD TESTS ====================

def test_course_creation_enforces_approved_permission(client):
    course_payload = {
        "permission_id": "perm_pend_101",
        "title": "Unauthorized Course",
        "category": "academic",
        "level": "beginner",
        "modules": []
    }
    res = client.post("/api/courses", json=course_payload, headers={"X-User-Id": "student_101", "X-User-Role": "student"})
    assert res.status_code == 403

def test_course_creation_with_modules_and_lessons_success(client):
    course_payload = {
        "permission_id": "perm_appr_101",
        "title": "Full Stack Python Development",
        "description": "Comprehensive guide from syntax to web framework",
        "category": "academic",
        "level": "intermediate",
        "modules": [
            {
                "title": "Module 1: Foundations",
                "order_index": 1,
                "lessons": [
                    {"title": "Lesson 1: Intro", "duration_minutes": 15, "order_index": 1},
                    {"title": "Lesson 2: Variables & Types", "duration_minutes": 20, "order_index": 2}
                ]
            },
            {
                "title": "Module 2: Advanced OOP",
                "order_index": 2,
                "lessons": [
                    {"title": "Lesson 1: Classes & Inheritance", "duration_minutes": 25, "order_index": 1}
                ]
            }
        ]
    }
    res = client.post("/api/courses", json=course_payload, headers={"X-User-Id": "student_101", "X-User-Role": "student"})
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "DRAFT"
    assert data["creator_id"] == "student_101"
    assert len(data["modules"]) == 2
    assert len(data["modules"][0]["lessons"]) == 2
    assert "full-stack-python-development" in data["slug"]

def test_course_visibility_and_catalog_filtering(client):
    # 1. Create a DRAFT course
    course_payload = {
        "permission_id": "perm_appr_101",
        "title": "Secret Draft Course",
        "category": "academic",
        "level": "beginner"
    }
    course_res = client.post("/api/courses", json=course_payload, headers={"X-User-Id": "student_101", "X-User-Role": "student"}).json()
    c_id = course_res["id"]

    # 2. Public catalog /api/courses must NOT display draft courses
    catalog = client.get("/api/courses").json()
    assert all(c["id"] != c_id for c in catalog)

    # 3. Random student cannot view draft course details -> 403
    res_other = client.get(f"/api/courses/{c_id}", headers={"X-User-Id": "student_999", "X-User-Role": "student"})
    assert res_other.status_code == 403

    # 4. Creator can view their own draft course details -> 200
    res_creator = client.get(f"/api/courses/{c_id}", headers={"X-User-Id": "student_101", "X-User-Role": "student"})
    assert res_creator.status_code == 200
    assert res_creator.json()["id"] == c_id

def test_course_update_by_creator(client):
    course_payload = {
        "permission_id": "perm_appr_101",
        "title": "Original Title",
        "category": "academic",
        "level": "beginner"
    }
    c_id = client.post("/api/courses", json=course_payload, headers={"X-User-Id": "student_101", "X-User-Role": "student"}).json()["id"]

    patch_unauth = client.patch(f"/api/courses/{c_id}", json={"title": "Hacked Title"}, headers={"X-User-Id": "student_200", "X-User-Role": "student"})
    assert patch_unauth.status_code == 403

    patch_res = client.patch(f"/api/courses/{c_id}", json={"title": "Updated Title", "level": "advanced"}, headers={"X-User-Id": "student_101", "X-User-Role": "student"})
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Updated Title"
    assert patch_res.json()["level"] == "advanced"
