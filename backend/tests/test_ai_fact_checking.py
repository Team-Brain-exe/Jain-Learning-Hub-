import pytest
from app.ai.rag.reference_store import ApprovedReferenceStore, default_reference_store
from app.ai.verifier import ContentVerifier
from app.ai.schemas import (
    ContentSegment,
    LocationType,
    ClaimAssessmentType,
    FindingSeverity
)

def test_approved_reference_store_retrieval():
    store = ApprovedReferenceStore()
    
    # Query Python execution
    results = store.retrieve("How does Python compilation and execution work on the virtual machine?")
    assert len(results) > 0
    citation, score = results[0]
    assert "ref-jain-py-001" == citation.reference_id
    assert "Python Official Execution Model" in citation.title
    assert "bytecode" in citation.snippet.lower()
    assert citation.source_document is not None
    assert score > 0.3

    # Query binary search
    results_dsa = store.retrieve("binary search complexity sorted array")
    assert len(results_dsa) > 0
    citation_dsa, _ = results_dsa[0]
    assert "ref-jain-dsa-003" == citation_dsa.reference_id
    assert "O(log n)" in citation_dsa.snippet

def test_verifier_flags_potential_error():
    verifier = ContentVerifier(default_reference_store)
    segment = ContentSegment(
        asset_id="asset-v1",
        segment_index=1,
        location_type=LocationType.TIMESTAMP,
        location_value="timestamp: 04:32",
        text="Python is a compiled-only programming language.",
        metadata={"timestamp_seconds": 272, "asset_name": "lecture-1.mp4"}
    )

    finding = verifier.verify_claim(segment.text, segment)
    assert finding is not None
    assert finding.finding_type == ClaimAssessmentType.POTENTIAL_ERROR
    assert finding.severity == FindingSeverity.MEDIUM
    assert finding.source_location.location_value == "timestamp: 04:32"
    assert finding.source_location.timestamp_seconds == 272
    assert "bytecode" in finding.suggested_correction.lower()
    assert len(finding.references) > 0
    assert finding.references[0].reference_id == "ref-jain-py-001"
    assert finding.requires_human_review is True

def test_verifier_flags_binary_search_error():
    verifier = ContentVerifier(default_reference_store)
    segment = ContentSegment(
        asset_id="asset-ppt-1",
        segment_index=2,
        location_type=LocationType.SLIDE,
        location_value="Slide 4",
        text="Binary search can run directly on unsorted arrays in any arbitrary order.",
        metadata={"slide_number": 4, "asset_name": "dsa-slides.pptx"}
    )

    finding = verifier.verify_claim(segment.text, segment)
    assert finding is not None
    assert finding.finding_type == ClaimAssessmentType.POTENTIAL_ERROR
    assert finding.severity == FindingSeverity.HIGH
    assert finding.source_location.slide_number == 4
    assert "sorted" in finding.suggested_correction.lower()

def test_verifier_flags_unsupported_claim():
    verifier = ContentVerifier(default_reference_store)
    segment = ContentSegment(
        asset_id="asset-doc-1",
        segment_index=3,
        location_type=LocationType.SECTION,
        location_value="Section: Benchmarks",
        text="This algorithm is always guaranteed to be the fastest in the universe.",
        metadata={"asset_name": "overview.docx"}
    )

    finding = verifier.verify_claim(segment.text, segment)
    assert finding is not None
    assert finding.finding_type == ClaimAssessmentType.UNSUPPORTED
    assert finding.requires_human_review is True
    # Never fabricate references for unsupported claims
    assert len(finding.references) == 0

def test_cross_asset_contradiction_detection():
    verifier = ContentVerifier(default_reference_store)
    seg_video = ContentSegment(
        asset_id="asset-video-1",
        segment_index=0,
        location_type=LocationType.TIMESTAMP,
        location_value="timestamp: 02:15",
        text="Binary search runs in O(log n) time.",
        metadata={"asset_name": "algorithms.mp4"}
    )
    seg_slide = ContentSegment(
        asset_id="asset-slides-2",
        segment_index=1,
        location_type=LocationType.SLIDE,
        location_value="Slide 6",
        text="Binary search lookup is O(1) in all scenarios.",
        metadata={"asset_name": "algorithms.pptx"}
    )

    contradictions = verifier.check_cross_asset_contradictions([seg_video, seg_slide])
    assert len(contradictions) == 1
    c = contradictions[0]
    assert c.finding_type == ClaimAssessmentType.CONTRADICTION
    assert c.severity == FindingSeverity.HIGH
    assert c.source_location.location_value == "timestamp: 02:15"
    assert c.conflicting_source_location.location_value == "Slide 6"
    assert c.requires_human_review is True
