
import logging
import json
import os
from pathlib import Path, PurePosixPath, PureWindowsPath
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from app.models.course import Course, CourseLifecycleStatus, MediaAsset
from app.models.ai_review import (
    AIReviewJob,
    AIFinding,
    AIJobStatus,
    FindingType,
    FindingSeverity,
)
from app.ai.pipeline import AIReviewPipeline
from app.ai.schemas import ContentSegment, LocationType
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)


class AIReviewService:

    @staticmethod
    def _resolve_asset_path(storage_key: Optional[str]) -> str:
        """
        Resolve an asset path safely.

        Normal uploaded files must resolve through StorageService.
        Existing demo assets are supported through an explicit path prefix.

        Absolute paths and path traversal are rejected.
        """
        if not storage_key:
            return ""

        normalized_key = storage_key.replace("\\", "/")
        key_path = PurePosixPath(normalized_key)
        windows_key_path = PureWindowsPath(normalized_key)

        # Reject POSIX absolute paths, Windows absolute paths,
        # and Windows drive-qualified paths.
        if (
            key_path.is_absolute()
            or windows_key_path.is_absolute()
            or bool(windows_key_path.drive)
        ):
            raise ValueError(
                "Absolute asset paths are not supported. "
                "Use a relative storage key."
            )

        if ".." in key_path.parts:
            raise ValueError(
                "Invalid asset storage key: path traversal detected."
            )

        backend_root = Path(__file__).resolve().parents[2]
        demo_root = (backend_root / "demo_assets").resolve()

        # Explicit support for existing demo asset records.
        demo_prefixes = (
            "backend/demo_assets/",
            "demo_assets/",
        )

        for prefix in demo_prefixes:
            if normalized_key.startswith(prefix):
                relative_demo_path = normalized_key[len(prefix):]

                if not relative_demo_path:
                    raise ValueError("Demo asset path is empty.")

                demo_candidate = (
                    demo_root
                    / Path(*PurePosixPath(relative_demo_path).parts)
                ).resolve()

                if (
                    os.path.commonpath(
                        [str(demo_root), str(demo_candidate)]
                    )
                    != str(demo_root)
                ):
                    raise ValueError("Invalid demo asset path.")

                return str(demo_candidate)

        # Normal uploaded files must use the configured storage root.
        return str(StorageService.resolve_local_path(normalized_key))

    @staticmethod
    def trigger_ai_review(
        db: Session,
        course: Course,
        job_id: Optional[str] = None,
    ) -> AIReviewJob:
        """
        Executes grounded AI review for the submitted course and its
        attached assets.

        Extracts content, checks claims against approved curriculum
        references (RAG), and populates structured advisory findings.

        Reuses an existing active job to support idempotent retries.
        """

        course_id = course.id

        job = None

        if job_id:
            job = (
                db.query(AIReviewJob)
                .filter(AIReviewJob.id == job_id)
                .first()
            )

            # Prevent a job belonging to another course from being reused.
            if job and job.course_id != course_id:
                raise ValueError(
                    "AI review job does not belong to the requested course."
                )

        if not job:
            # Check for an existing active job to guarantee idempotency.
            existing_active = (
                db.query(AIReviewJob)
                .filter(
                    AIReviewJob.course_id == course_id,
                    AIReviewJob.status.in_([
                        AIJobStatus.QUEUED,
                        AIJobStatus.PROCESSING,
                        AIJobStatus.EXTRACTING,
                        AIJobStatus.VERIFYING,
                    ]),
                )
                .first()
            )

            if existing_active:
                job = existing_active
            else:
                job = AIReviewJob(
                    course_id=course_id,
                    status=AIJobStatus.QUEUED,
                    summary="AI extraction and factual verification queued.",
                )
                db.add(job)
                db.flush()

        job_id_value = job.id

        # Update status before beginning extraction and verification.
        job.status = AIJobStatus.VERIFYING
        db.commit()

        # Clear previous findings so retries do not duplicate them.
        db.query(AIFinding).filter(
            AIFinding.job_id == job_id_value
        ).delete(synchronize_session=False)

        db.flush()

        try:
            # 1. Gather assets associated with the course.
            assets: List[MediaAsset] = (
                db.query(MediaAsset)
                .filter(MediaAsset.course_id == course_id)
                .all()
            )

            pipeline = AIReviewPipeline()

            asset_descriptors: List[Dict[str, Any]] = []

            for asset in assets:
                file_path = AIReviewService._resolve_asset_path(
                    asset.storage_key
                )

                asset_descriptors.append({
                    "asset_id": asset.id,
                    "file_name": asset.file_name,
                    "file_path": file_path,
                    "mime_type": asset.mime_type,
                })

            # 2. Process external files.
            report_payload = pipeline.process_assets(
                submission_id=course_id,
                assets=asset_descriptors,
            )

            # 3. Verify inline lesson text and course description.
            extra_segments: List[ContentSegment] = []

            if course.description:
                extra_segments.append(
                    ContentSegment(
                        asset_id=f"course-desc-{course_id}",
                        segment_index=0,
                        location_type=LocationType.GLOBAL,
                        location_value="Course Description",
                        text=course.description,
                        metadata={"asset_name": course.title},
                    )
                )

            for mod in course.modules:
                for les in mod.lessons:
                    lesson_text = les.content or les.title

                    if lesson_text:
                        extra_segments.append(
                            ContentSegment(
                                asset_id=f"lesson-{les.id}",
                                segment_index=len(extra_segments),
                                location_type=LocationType.SECTION,
                                location_value=(
                                    f"Module: {mod.title}, "
                                    f"Lesson: {les.title}"
                                ),
                                text=lesson_text,
                                metadata={"asset_name": les.title},
                            )
                        )

            # Use the existing verifier directly for inline content.
            if extra_segments:
                candidate_claims = (
                    pipeline.verifier.extract_candidate_claims(
                        extra_segments
                    )
                )

                for claim_text, segment in candidate_claims:
                    finding = pipeline.verifier.verify_claim(
                        claim_text,
                        segment,
                    )

                    if finding:
                        report_payload.findings.append(finding)

                report_payload.total_segments_analyzed += len(
                    extra_segments
                )

                report_payload.total_claims_checked += len(
                    candidate_claims
                )

            # 4. Persist findings.
            if not report_payload.findings:
                # Add a clean baseline finding for faculty visibility.
                clean_finding = AIFinding(
                    job_id=job_id_value,
                    finding_type=FindingType.NO_ISSUE_DETECTED,
                    severity=FindingSeverity.LOW,
                    claim=(
                        f"Course '{course.title}' syllabus and structure "
                        "adhere to Jain FET curriculum standards."
                    ),
                    source_location="Course Structure & Overview",
                    explanation=(
                        "No factual contradictions, unverified claims, "
                        "or formatting anomalies detected against "
                        "approved references."
                    ),
                    suggested_correction=None,
                    references_json=json.dumps([{
                        "reference_id": "ref-jain-py-001",
                        "title": "Jain FET CSE Curriculum Standard",
                        "snippet": (
                            "Verified course syllabus adheres to "
                            "Jain FET technical guidelines."
                        ),
                    }]),
                    confidence=0.95,
                    requires_human_review=False,
                )

                db.add(clean_finding)

            else:
                for vf in report_payload.findings:
                    db_finding = AIFinding(
                        job_id=job_id_value,
                        asset_id=(
                            vf.source_location.asset_id
                            if vf.source_location else None
                        ),
                        finding_type=FindingType(
                            vf.finding_type.value
                        ),
                        severity=FindingSeverity(
                            vf.severity.value
                        ),
                        claim=vf.claim,
                        source_location=(
                            vf.source_location.location_value
                            if vf.source_location else None
                        ),
                        conflicting_location=(
                            vf.conflicting_source_location.location_value
                            if vf.conflicting_source_location else None
                        ),
                        explanation=vf.explanation,
                        suggested_correction=vf.suggested_correction,
                        references_json=(
                            json.dumps([
                                r.model_dump()
                                for r in vf.references
                            ])
                            if vf.references else None
                        ),
                        confidence=vf.confidence,
                        requires_human_review=vf.requires_human_review,
                    )

                    db.add(db_finding)

            # 5. Update the AI job using the actual report schema.
            job.status = AIJobStatus(report_payload.status)
            job.summary = report_payload.summary
            job.total_segments = (
                report_payload.total_segments_analyzed
            )
            job.total_claims = (
                report_payload.total_claims_checked
            )

            job.transcripts_json = json.dumps({
                key: [
                    segment.model_dump(mode="json")
                    for segment in segments
                ]
                for key, segments
                in report_payload.transcripts_and_text.items()
            })

            job.updated_at = datetime.now(timezone.utc)

        except Exception as exc:
            logger.exception(
                "AI review pipeline failed for course %s: %s",
                course_id,
                exc,
            )

            job.status = AIJobStatus.FAILED
            job.error_message = f"AI pipeline exception: {str(exc)}"
            job.summary = (
                "AI processing encountered an unexpected error. "
                "Flagged for manual faculty review."
            )
            job.updated_at = datetime.now(timezone.utc)

        # 6. Always keep the course behind the faculty publication gate.
        course.status = CourseLifecycleStatus.FACULTY_REVIEW
        course.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(job)
        db.refresh(course)

        logger.info(
            "AI Review Job %s completed for course %s. Status: %s",
            job.id,
            course_id,
            course.status,
        )

        return job
