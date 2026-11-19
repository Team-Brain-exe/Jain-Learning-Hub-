from unittest.mock import MagicMock, patch

from app.services.notification_service import EmailNotificationService


def test_faculty_email_sent(monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.gmail.com")
    monkeypatch.setenv("SMTP_PORT", "587")
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
            request_id="req_123",
            title="Python Basics",
            content_type="academic",
            description="Introduction to Python",
        )

    assert result["status"] == "SENT"
    assert result["recipient"] == "faculty@example.com"
    assert result["review_url"].endswith(
        "/faculty/review-request/req_123"
    )

    smtp.starttls.assert_called_once()
    smtp.login.assert_called_once_with(
        "sender@example.com", "test-password"
    )
    smtp.send_message.assert_called_once()

    message = smtp.send_message.call_args.args[0]
    assert message["To"] == "faculty@example.com"
    assert "Python Basics" in message.get_content()
    assert "req_123" in message.get_content()


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
