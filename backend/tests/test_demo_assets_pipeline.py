import os
import pytest
from app.ai.pipeline import AIReviewPipeline
from app.ai.schemas import ClaimAssessmentType, FindingSeverity, LocationType

def test_full_multiformat_demo_bundle_pipeline():
    demo_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "demo_assets")
    assert os.path.exists(demo_dir), "Demo assets folder must exist"

    asset_descriptors = [
        {
            "asset_id": "asset-pdf-1",
            "file_name": "demo_python_lecture.pdf",
            "file_path": os.path.join(demo_dir, "demo_python_lecture.pdf"),
            "mime_type": "application/pdf"
        },
        {
            "asset_id": "asset-pptx-2",
            "file_name": "demo_algorithm_slides.pptx",
            "file_path": os.path.join(demo_dir, "demo_algorithm_slides.pptx"),
            "mime_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        },
        {
            "asset_id": "asset-docx-3",
            "file_name": "demo_operating_systems.docx",
            "file_path": os.path.join(demo_dir, "demo_operating_systems.docx"),
            "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        },
        {
            "asset_id": "asset-video-4",
            "file_name": "demo_lecture.mp4",
            "file_path": os.path.join(demo_dir, "demo_lecture.mp4"),
            "mime_type": "video/mp4"
        },
        {
            "asset_id": "asset-img-5",
            "file_name": "demo_architecture_diagram.png",
            "file_path": os.path.join(demo_dir, "demo_architecture_diagram.png"),
            "mime_type": "image/png"
        }
    ]

    pipeline = AIReviewPipeline()
    report = pipeline.process_assets(
        submission_id="demo-course-sub-100",
        assets=asset_descriptors
    )

    # 1. Status and extraction checks
    assert report.status == "COMPLETED"
    assert report.total_segments_analyzed >= 7
    assert len(report.transcripts_and_text) == 5

    # Check each asset is represented in transcripts_and_text
    assert "asset-pdf-1" in report.transcripts_and_text
    assert "asset-pptx-2" in report.transcripts_and_text
    assert "asset-docx-3" in report.transcripts_and_text
    assert "asset-video-4" in report.transcripts_and_text
    assert "asset-img-5" in report.transcripts_and_text

    # 2. Check POTENTIAL_ERROR detection in the video transcript
    error_findings = [f for f in report.findings if f.finding_type == ClaimAssessmentType.POTENTIAL_ERROR]
    assert len(error_findings) >= 1
    py_err = error_findings[0]
    assert "compiled-only" in py_err.claim.lower()
    assert py_err.source_location.location_value == "timestamp: 02:40"
    assert py_err.source_location.timestamp_seconds == 160
    assert "bytecode" in py_err.suggested_correction.lower()
    assert len(py_err.references) > 0
    assert py_err.references[0].reference_id == "ref-jain-py-001"

    # 3. Check Cross-Asset CONTRADICTION detection
    contradictions = [f for f in report.findings if f.finding_type == ClaimAssessmentType.CONTRADICTION]
    assert len(contradictions) >= 1
    contra = contradictions[0]
    assert contra.severity == FindingSeverity.HIGH
    assert contra.source_location.location_value in ["timestamp: 04:15", "Slide 2"]
    assert contra.conflicting_source_location.location_value in ["timestamp: 04:15", "Slide 2"]
    assert "binary search" in contra.claim.lower()
    assert contra.requires_human_review is True

    # 4. Check advisory nature (human reviewer required)
    assert any(f.requires_human_review for f in report.findings)
    assert report.disclaimer is not None
