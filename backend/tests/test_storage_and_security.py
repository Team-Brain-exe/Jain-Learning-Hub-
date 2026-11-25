import pytest
from app.models.upload_permission import VerifiedFaculty, UploadPermission, PermissionStatus
from app.models.course import Course, CourseLifecycleStatus, MediaAsset, UploadSessionStatus
from app.models.ai_review import AIReviewJob, AIJobStatus


@pytest.fixture(autouse=True)
def seed_storage_security_data(db_session, tmp_path, monkeypatch):
    monkeypatch.setenv("STORAGE_LOCAL_DIR", str(tmp_path / "storage_objects"))
    monkeypatch.setenv("STORAGE_SIGNING_SECRET", "test-storage-signing-secret-32-chars")

    perm_approved = UploadPermission(
        id="perm_sec_appr",
        student_id="student_101",
        faculty_id="fac_1",
        title="Approved Storage Course",
        content_type="academic",
        format="pdf",
        consent_declared=True,
        status=PermissionStatus.APPROVED,
    )
    perm_pending = UploadPermission(
        id="perm_sec_pend",
        student_id="student_101",
        faculty_id="fac_1",
        title="Pending Storage Course",
        content_type="academic",
        format="pdf",
        consent_declared=True,
        status=PermissionStatus.PENDING,
    )
    perm_rejected = UploadPermission(
        id="perm_sec_rej",
        student_id="student_101",
        faculty_id="fac_1",
        title="Rejected Storage Course",
        content_type="academic",
        format="pdf",
        consent_declared=True,
        status=PermissionStatus.REJECTED,
    )
    db_session.add_all([perm_approved, perm_pending, perm_rejected])
    db_session.commit()


def test_rejected_and_pending_consent_blocked_for_upload_and_course(client, auth_headers):
    for perm_id in ("perm_sec_pend", "perm_sec_rej"):
        up_res = client.post(
            "/api/uploads/request",
            json={
                "permission_id": perm_id,
                "file_name": "notes.pdf",
                "file_type": "pdf",
                "mime_type": "application/pdf",
                "file_size_bytes": 1024,
            },
            headers=auth_headers["student_101"],
        )
        assert up_res.status_code == 403

        course_res = client.post(
            "/api/courses",
            json={
                "permission_id": perm_id,
                "title": f"Course {perm_id}",
                "category": "academic",
                "level": "beginner",
                "modules": [],
            },
            headers=auth_headers["student_101"],
        )
        assert course_res.status_code == 403


def test_unsafe_keys_and_invalid_file_extensions_rejected(client, auth_headers):
    # Path traversal filename
    res_traversal = client.post(
        "/api/uploads/request",
        json={
            "permission_id": "perm_sec_appr",
            "file_name": "../../etc/passwd.pdf",
            "file_type": "pdf",
            "mime_type": "application/pdf",
            "file_size_bytes": 1024,
        },
        headers=auth_headers["student_101"],
    )
    assert res_traversal.status_code == 400

    # Extension mismatch (exe disguised as application/pdf)
    res_ext = client.post(
        "/api/uploads/request",
        json={
            "permission_id": "perm_sec_appr",
            "file_name": "payload.exe",
            "file_type": "pdf",
            "mime_type": "application/pdf",
            "file_size_bytes": 1024,
        },
        headers=auth_headers["student_101"],
    )
    assert res_ext.status_code == 400


def test_signed_url_tampering_and_empty_upload_rejected(client, auth_headers):
    init_res = client.post(
        "/api/uploads/request",
        json={
            "permission_id": "perm_sec_appr",
            "file_name": "lecture1.pdf",
            "file_type": "pdf",
            "mime_type": "application/pdf",
            "file_size_bytes": 512,
        },
        headers=auth_headers["student_101"],
    )
    assert init_res.status_code == 201
    init_data = init_res.json()
    upload_url = init_data["upload_url"]
    assert "mock_signed_token" not in upload_url
    assert "sig=" in upload_url and "expires=" in upload_url

    # Tampered signature -> 403
    bad_sig_url = upload_url.rsplit("sig=", 1)[0] + "sig=0000deadbeef"
    res_bad_sig = client.put(bad_sig_url, content=b"%PDF-1.4 test")
    assert res_bad_sig.status_code == 403

    # Empty upload -> 400
    res_empty = client.put(upload_url, content=b"")
    assert res_empty.status_code == 400


def test_failed_upload_finalize_missing_object_and_duplicate_finalization(client, auth_headers, db_session):
    # 1. Initialize without uploading bytes -> finalize must fail and mark FAILED
    init_missing = client.post(
        "/api/uploads/request",
        json={
            "permission_id": "perm_sec_appr",
            "file_name": "missing.pdf",
            "file_type": "pdf",
            "mime_type": "application/pdf",
            "file_size_bytes": 100,
        },
        headers=auth_headers["student_101"],
    ).json()

    fin_missing = client.post(
        "/api/uploads/finalize",
        json={"permission_id": "perm_sec_appr", "asset_id": init_missing["asset_id"]},
        headers=auth_headers["student_101"],
    )
    assert fin_missing.status_code == 400
    assert "does not exist in storage" in fin_missing.json()["detail"]

    failed_asset = db_session.query(MediaAsset).filter(MediaAsset.id == init_missing["asset_id"]).first()
    assert failed_asset.upload_status == UploadSessionStatus.FAILED

    # 2. Initialize, PUT real bytes, finalize -> 200 OK, then duplicate finalize -> 409 Conflict
    init_ok = client.post(
        "/api/uploads/request",
        json={
            "permission_id": "perm_sec_appr",
            "file_name": "valid_notes.pdf",
            "file_type": "pdf",
            "mime_type": "application/pdf",
            "file_size_bytes": 16,
        },
        headers=auth_headers["student_101"],
    ).json()

    put_res = client.put(init_ok["upload_url"], content=b"%PDF-1.4 content")
    assert put_res.status_code == 200

    fin_ok = client.post(
        "/api/uploads/finalize",
        json={"permission_id": "perm_sec_appr", "asset_id": init_ok["asset_id"]},
        headers=auth_headers["student_101"],
    )
    assert fin_ok.status_code == 200
    assert fin_ok.json()["upload_status"] == "FINALIZED"
    assert fin_ok.json()["file_size_bytes"] == 16

    # Signed view URL works for finalized object
    view_res = client.get(fin_ok.json()["signed_url"])
    assert view_res.status_code == 200
    assert view_res.content == b"%PDF-1.4 content"

    # Duplicate finalization -> 409 Conflict
    fin_dup = client.post(
        "/api/uploads/finalize",
        json={"permission_id": "perm_sec_appr", "asset_id": init_ok["asset_id"]},
        headers=auth_headers["student_101"],
    )
    assert fin_dup.status_code == 409

    # Cross-user metadata access -> 403 Forbidden
    meta_other = client.get(f"/api/uploads/{init_ok['asset_id']}", headers=auth_headers["student_200"])
    assert meta_other.status_code == 403


def test_faculty_decision_blocked_for_draft_or_active_ai_job(client, auth_headers, db_session):
    c_res = client.post(
        "/api/courses",
        json={
            "permission_id": "perm_sec_appr",
            "title": "Draft Guard Course",
            "category": "academic",
            "level": "beginner",
            "modules": [],
        },
        headers=auth_headers["student_101"],
    )
    assert c_res.status_code == 201
    c_id = c_res.json()["id"]

    # Faculty cannot approve DRAFT course -> 400
    draft_dec = client.post(
        f"/api/courses/faculty/reviews/{c_id}/decision",
        json={"decision": "APPROVE", "remarks": "Should fail"},
        headers=auth_headers["fac_1"],
    )
    assert draft_dec.status_code == 400

    # Simulate FACULTY_REVIEW with an active VERIFYING AI job -> APPROVE blocked
    course = db_session.query(Course).filter(Course.id == c_id).first()
    course.status = CourseLifecycleStatus.FACULTY_REVIEW
    job = AIReviewJob(course_id=c_id, status=AIJobStatus.VERIFYING, summary="Running")
    db_session.add(job)
    db_session.commit()

    active_ai_dec = client.post(
        f"/api/courses/faculty/reviews/{c_id}/decision",
        json={"decision": "APPROVE", "remarks": "AI still running"},
        headers=auth_headers["fac_1"],
    )
    assert active_ai_dec.status_code == 400
    assert "AI verification job" in active_ai_dec.json()["detail"]
