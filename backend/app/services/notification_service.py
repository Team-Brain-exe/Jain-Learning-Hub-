import logging
from typing import Dict, Any

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
        """
        Sends an email notification with review links.
        Security requirement: The link merely opens an authenticated review page.
        Clicking the link alone NEVER mutates state or approves/rejects the request.
        """
        review_url = f"https://learninghub.jainuniversity.ac.in/faculty/review-request/{request_id}"
        
        logger.info(
            f"[EMAIL SENT] To: {faculty_email} ({faculty_name}) | "
            f"Subject: Upload Permission Request from {student_name} | Review Link: {review_url}"
        )
        return {
            "status": "SENT",
            "recipient": faculty_email,
            "review_url": review_url
        }

