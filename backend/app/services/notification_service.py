import logging
import os
import smtplib
import ssl
from email.message import EmailMessage
from typing import Any, Dict
from urllib.parse import quote

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class EmailNotificationService:
    @staticmethod
    def send_faculty_upload_request_notification(
        faculty_email: str,
        faculty_name: str,
        student_name: str,
        request_id: str,
        title: str,
        content_type: str,
        description: str,
    ) -> Dict[str, Any]:
        raw_frontend_url = os.getenv("FRONTEND_BASE_URL")
        frontend_url = (
            raw_frontend_url if raw_frontend_url is not None else "http://localhost:8080"
        ).strip().rstrip("/")
        review_url = (
            f"{frontend_url}/faculty/consent/"
            f"{quote(str(request_id), safe='')}"
        )

        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME", "").strip()
        smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
        from_email = os.getenv("SMTP_FROM_EMAIL", "").strip()

        if not all([
            frontend_url,
            smtp_username,
            smtp_password,
            from_email,
        ]):
            logger.error("Faculty email notification: SMTP configuration incomplete")
            return {
                "status": "FAILED",
                "recipient": faculty_email,
                "review_url": review_url,
            }

        message = EmailMessage()
        message["From"] = from_email
        message["To"] = faculty_email
        message["Subject"] = "JAIN Learning Hub - Upload Permission Request"

        message.set_content(
            f"Dear {faculty_name},\n\n"
            f"A student has requested permission to upload content "
            f"to JAIN Learning Hub.\n\n"
            f"Student: {student_name}\n"
            f"Title: {title}\n"
            f"Content Type: {content_type}\n"
            f"Description: {description}\n\n"
            f"Review the request:\n{review_url}\n\n"
            f"Please sign in with your faculty account to approve "
            f"or reject this request.\n"
            f"Opening the link does not approve the request.\n\n"
            f"JAIN Learning Hub"
        )

        try:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.starttls(context=ssl.create_default_context())
                server.login(smtp_username, smtp_password)
                server.send_message(message)

            logger.info(
                "Faculty upload request email submitted successfully: request_id=%s",
                request_id,
            )
            return {
                "status": "SENT",
                "recipient": faculty_email,
                "review_url": review_url,
            }

        except Exception as exc:
            logger.error(
                "Faculty email delivery failed for request_id=%s: %s",
                request_id,
                type(exc).__name__,
            )
            return {
                "status": "FAILED",
                "recipient": faculty_email,
                "review_url": review_url,
            }

    @staticmethod
    def send_faculty_course_review_notification(
        faculty_email: str,
        faculty_name: str,
        student_name: str,
        course_id: str,
        course_title: str,
        student_message: str = "",
    ) -> Dict[str, Any]:

        frontend_url = os.getenv(
            "FRONTEND_BASE_URL",
            "http://localhost:8080"
        ).strip().rstrip("/")

        review_url = (
            f"{frontend_url}/faculty/review/"
            f"{quote(str(course_id), safe='')}"
        )

        result = {
            "status": "FAILED",
            "recipient": faculty_email,
            "review_url": review_url,
        }

        try:
            smtp_host = os.getenv(
                "SMTP_HOST", "smtp.gmail.com"
            ).strip()

            smtp_port = int(os.getenv("SMTP_PORT", "587"))
            smtp_username = os.getenv("SMTP_USERNAME", "").strip()
            smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
            from_email = os.getenv("SMTP_FROM_EMAIL", "").strip()

            if not all([
                frontend_url,
                smtp_host,
                smtp_username,
                smtp_password,
                from_email,
                faculty_email,
            ]):
                logger.error("Course review email: SMTP configuration incomplete")
                return result

            message = EmailMessage()
            message["From"] = from_email
            message["To"] = faculty_email

            safe_title = " ".join(course_title.split())

            message["Subject"] = (
                f"JAIN Learning Hub - Course Review Request: {safe_title}"
            )

            optional_message = (
                f"Message from student:\n{student_message}\n\n"
                if student_message.strip()
                else ""
            )

            message.set_content(
                f"Dear {faculty_name},\n\n"
                f"A student has selected you as the faculty reviewer "
                f"for their course on JAIN Learning Hub.\n\n"
                f"Student: {student_name}\n"
                f"Course: {course_title}\n\n"
                f"{optional_message}"
                f"Please sign in with your authorized faculty account "
                f"to review the submitted course.\n\n"
                f"You can review:\n"
                f"- Uploaded video sessions\n"
                f"- Course modules and lessons\n"
                f"- Supporting learning materials\n"
                f"- Assessments, if available\n"
                f"- AI verification report\n\n"
                f"Sign in and review the course:\n"
                f"{review_url}\n\n"
                f"After reviewing, you may approve the course, "
                f"request modifications, or reject it with feedback.\n\n"
                f"Opening this link does not automatically approve "
                f"the course.\n\n"
                f"Thank you for supporting student-led learning.\n\n"
                f"Regards,\n"
                f"JAIN Learning Hub Team"
            )

            with smtplib.SMTP(
                smtp_host, smtp_port, timeout=15
            ) as server:
                server.starttls(context=ssl.create_default_context())
                server.login(smtp_username, smtp_password)

                refused = server.send_message(message)

                if refused:
                    raise RuntimeError("SMTP recipient refused")

            logger.info(
                "Faculty course review email submitted: course_id=%s",
                course_id,
            )

            result["status"] = "SENT"
            return result

        except Exception as exc:
            logger.error(
                "Course review email failed: course_id=%s, error=%s",
                course_id,
                type(exc).__name__,
            )

            return result

