from app.models.upload_permission import UploadPermission, PermissionStatus


def test_missing_token_blocked(client):
    response = client.get("/api/upload-permissions/me")
    assert response.status_code == 401


def test_invalid_token_blocked(client):
    response = client.get(
        "/api/upload-permissions/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401


def test_forged_faculty_headers_blocked(client):
    response = client.get(
        "/api/faculty/upload-permissions",
        headers={
            "X-User-Id": "fac_1",
            "X-User-Role": "faculty",
        },
    )
    assert response.status_code == 401


def test_student_cannot_access_faculty_requests(client, auth_headers):
    response = client.get(
        "/api/faculty/upload-permissions",
        headers=auth_headers["student_101"],
    )
    assert response.status_code == 403


def test_faculty_cannot_create_student_request(client, auth_headers):
    response = client.post(
        "/api/upload-permissions",
        headers=auth_headers["fac_1"],
        json={
            "faculty_id": "fac_2",
            "title": "Unauthorized request",
            "content_type": "academic",
            "format": "pdf",
            "consent_declared": True,
        },
    )
    assert response.status_code == 403


def test_pending_permission_cannot_be_used(db_session):
    from fastapi import HTTPException
    from app.core.auth_guards import verify_approved_upload_permission

    permission = UploadPermission(
        id="pending_test",
        student_id="student_101",
        faculty_id="fac_1",
        title="Pending document",
        content_type="academic",
        format="pdf",
        consent_declared=True,
        status=PermissionStatus.PENDING,
    )
    db_session.add(permission)
    db_session.flush()

    try:
        verify_approved_upload_permission(
            db_session, "student_101", permission.id
        )
        assert False, "Pending permission should have been blocked"
    except HTTPException as exc:
        assert exc.status_code == 403


def test_rejected_permission_cannot_be_used(db_session):
    from fastapi import HTTPException
    from app.core.auth_guards import verify_approved_upload_permission

    permission = UploadPermission(
        id="rejected_test",
        student_id="student_101",
        faculty_id="fac_1",
        title="Rejected document",
        content_type="academic",
        format="pdf",
        consent_declared=True,
        status=PermissionStatus.REJECTED,
    )
    db_session.add(permission)
    db_session.flush()

    try:
        verify_approved_upload_permission(
            db_session, "student_101", permission.id
        )
        assert False, "Rejected permission should have been blocked"
    except HTTPException as exc:
        assert exc.status_code == 403
