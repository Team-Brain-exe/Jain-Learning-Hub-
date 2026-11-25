import logging
import os
import uuid
from unittest.mock import MagicMock, patch

import pytest
from app.services.notification_service import EmailNotificationService


def test_faculty_email_sent_with_synthetic_id(monkeypatch):
    """Confirm notification sends with a synthetic test ID and points to /faculty/consent/{id}."""
    monkeypatch.setenv("SMTP_HOST", "smtp.gmail.com")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USERNAME", "sender@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "test-password")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "sender@example.com")
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:5173")

    smtp = MagicMock()
    smtp.__enter__.return_value = smtp

    synthetic_req_id = "test_req_synthetic_123"

    with patch(
        "app.services.notification_service.smtplib.SMTP",
        return_value=smtp,
    ):
        result = EmailNotificationService.send_faculty_upload_request_notification(
            faculty_email="faculty@example.com",
            faculty_name="Dr. Rao",
            student_name="Student One",
            request_id=synthetic_req_id,
            title="Python Basics",
            content_type="academic",
            description="Introduction to Python",
        )

    assert result["status"] == "SENT"
    assert result["recipient"] == "faculty@example.com"
    assert result["review_url"] == (
        "http://localhost:5173/faculty/consent/test_req_synthetic_123"
    )

    smtp.starttls.assert_called_once()
    smtp.login.assert_called_once_with(
        "sender@example.com", "test-password"
    )
    smtp.send_message.assert_called_once()

    message = smtp.send_message.call_args.args[0]
    assert message["To"] == "faculty@example.com"
    content = message.get_content()
    assert "Python Basics" in content
    assert synthetic_req_id in content
    assert "http://localhost:5173/faculty/consent/test_req_synthetic_123" in content
    assert "Opening the link does not approve the request." in content


def test_faculty_email_sent_with_real_uuid(monkeypatch):
    """Confirm notification sends with a real UUID request ID and points to /faculty/consent/{id}."""
    monkeypatch.setenv("SMTP_HOST", "smtp.gmail.com")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USERNAME", "sender@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "test-password")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "sender@example.com")
    monkeypatch.setenv("FRONTEND_BASE_URL", "https://hub.jainuniversity.ac.in")

    smtp = MagicMock()
    smtp.__enter__.return_value = smtp

    real_req_id = str(uuid.uuid4())

    with patch(
        "app.services.notification_service.smtplib.SMTP",
        return_value=smtp,
    ):
        result = EmailNotificationService.send_faculty_upload_request_notification(
            faculty_email="dr.sharma@jainuniversity.ac.in",
            faculty_name="Dr. Sharma",
            student_name="Jane Doe",
            request_id=real_req_id,
            title="Data Structures Notes",
            content_type="academic",
            description="Lecture 5 slides and code samples",
        )

    assert result["status"] == "SENT"
    assert result["recipient"] == "dr.sharma@jainuniversity.ac.in"
    assert result["review_url"] == (
        f"https://hub.jainuniversity.ac.in/faculty/consent/{real_req_id}"
    )

    message = smtp.send_message.call_args.args[0]
    assert message["To"] == "dr.sharma@jainuniversity.ac.in"
    content = message.get_content()
    assert "Data Structures Notes" in content
    assert real_req_id in content
    assert f"https://hub.jainuniversity.ac.in/faculty/consent/{real_req_id}" in content


def test_faculty_email_link_construction_trailing_slashes_and_whitespace(monkeypatch):
    """FRONTEND_BASE_URL with trailing slashes or whitespace must be cleanly stripped."""
    monkeypatch.setenv("SMTP_USERNAME", "sender@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "test-password")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "sender@example.com")
    monkeypatch.setenv("FRONTEND_BASE_URL", "   https://hub.jainuniversity.ac.in///   ")

    smtp = MagicMock()
    smtp.__enter__.return_value = smtp

    with patch(
        "app.services.notification_service.smtplib.SMTP",
        return_value=smtp,
    ):
        result = EmailNotificationService.send_faculty_upload_request_notification(
            faculty_email="faculty@example.com",
            faculty_name="Dr. Rao",
            student_name="Student One",
            request_id="req_clean_url",
            title="Test Title",
            content_type="academic",
            description="Desc",
        )

    assert result["review_url"] == (
        "https://hub.jainuniversity.ac.in/faculty/consent/req_clean_url"
    )
    assert "//faculty" not in result["review_url"]


def test_faculty_email_special_characters_quoted(monkeypatch):
    """Special characters in request_id must be safely URL-encoded."""
    monkeypatch.setenv("SMTP_USERNAME", "sender@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "test-password")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "sender@example.com")
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:5173")

    smtp = MagicMock()
    smtp.__enter__.return_value = smtp

    with patch(
        "app.services.notification_service.smtplib.SMTP",
        return_value=smtp,
    ):
        result = EmailNotificationService.send_faculty_upload_request_notification(
            faculty_email="faculty@example.com",
            faculty_name="Dr. Rao",
            student_name="Student One",
            request_id="req#123/special test",
            title="Test Title",
            content_type="academic",
            description="Desc",
        )

    assert result["review_url"] == (
        "http://localhost:5173/faculty/consent/req%23123%2Fspecial%20test"
    )


def test_faculty_email_failure(monkeypatch):
    monkeypatch.setenv("SMTP_USERNAME", "sender@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "test-password")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "sender@example.com")
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:5173")

    with patch(
        "app.services.notification_service.smtplib.SMTP",
        side_effect=OSError("Connection unavailable"),
    ):
        result = EmailNotificationService.send_faculty_upload_request_notification(
            faculty_email="faculty@example.com",
            faculty_name="Dr. Rao",
            student_name="Student One",
            request_id="req_456",
            title="Python Basics",
            content_type="academic",
            description="Introduction to Python",
        )

    assert result["status"] == "FAILED"
    assert result["review_url"] == "http://localhost:5173/faculty/consent/req_456"


def test_faculty_email_delivery_failure_safe_logging(monkeypatch, caplog):
    """Safe error logging on delivery failure without exposing passwords or sensitive details."""
    monkeypatch.setenv("SMTP_USERNAME", "sender@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "super-secret-password-12345")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "sender@example.com")
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:5173")

    secret_in_error = "super-secret-password-12345 leaked in exception string"

    with caplog.at_level(logging.ERROR):
        with patch(
            "app.services.notification_service.smtplib.SMTP",
            side_effect=Exception(secret_in_error),
        ):
            result = EmailNotificationService.send_faculty_upload_request_notification(
                faculty_email="faculty@example.com",
                faculty_name="Dr. Rao",
                student_name="Student One",
                request_id="req_safe_log_789",
                title="Python Basics",
                content_type="academic",
                description="Introduction to Python",
            )

    assert result["status"] == "FAILED"
    assert "req_safe_log_789" in caplog.text
    assert "Exception" in caplog.text
    # Ensure secret exception message and smtp password are NOT logged
    assert "super-secret-password-12345" not in caplog.text
    assert secret_in_error not in caplog.text


@pytest.mark.parametrize(
    "missing_var",
    [
        "SMTP_USERNAME",
        "SMTP_PASSWORD",
        "SMTP_FROM_EMAIL",
    ],
)
def test_faculty_email_incomplete_configuration(monkeypatch, missing_var):
    """Missing any critical SMTP configuration should fail gracefully."""
    monkeypatch.setenv("SMTP_USERNAME", "sender@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "test-password")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "sender@example.com")
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:5173")

    monkeypatch.setenv(missing_var, "")

    result = EmailNotificationService.send_faculty_upload_request_notification(
        faculty_email="faculty@example.com",
        faculty_name="Dr. Rao",
        student_name="Student One",
        request_id="req_missing_cfg",
        title="Python Basics",
        content_type="academic",
        description="Introduction to Python",
    )

    assert result["status"] == "FAILED"
    assert result["recipient"] == "faculty@example.com"
    assert result["review_url"] == (
        "http://localhost:5173/faculty/consent/req_missing_cfg"
    )


def test_faculty_email_with_port_8080_origin(monkeypatch):
    """Test frontend base URL configured to local port 8080."""
    monkeypatch.setenv("SMTP_USERNAME", "sender@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "test-password")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "sender@example.com")
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:8080")

    smtp = MagicMock()
    smtp.__enter__.return_value = smtp

    with patch(
        "app.services.notification_service.smtplib.SMTP",
        return_value=smtp,
    ):
        result = EmailNotificationService.send_faculty_upload_request_notification(
            faculty_email="faculty@jain.ac.in",
            faculty_name="Dr. Rao",
            student_name="Student",
            request_id="req_8080_test",
            title="AI Ethics",
            content_type="academic",
            description="Course syllabus",
        )

    assert result["status"] == "SENT"
    assert result["review_url"] == "http://localhost:8080/faculty/consent/req_8080_test"


def test_faculty_email_default_frontend_base_url_port_8080(monkeypatch):
    """When FRONTEND_BASE_URL is not set, it safely defaults to http://localhost:8080."""
    monkeypatch.setenv("SMTP_USERNAME", "sender@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "test-password")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "sender@example.com")
    monkeypatch.delenv("FRONTEND_BASE_URL", raising=False)

    smtp = MagicMock()
    smtp.__enter__.return_value = smtp

    with patch(
        "app.services.notification_service.smtplib.SMTP",
        return_value=smtp,
    ):
        result = EmailNotificationService.send_faculty_upload_request_notification(
            faculty_email="faculty@jain.ac.in",
            faculty_name="Dr. Rao",
            student_name="Student",
            request_id="req_default_port",
            title="AI Ethics",
            content_type="academic",
            description="Course syllabus",
        )

    assert result["status"] == "SENT"
    assert result["review_url"] == "http://localhost:8080/faculty/consent/req_default_port"

