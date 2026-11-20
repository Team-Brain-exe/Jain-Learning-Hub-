import logging
import os
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.ai.schemas import (
    ContentSegment,
    VerifiedFinding,
    AIReportPayload,
    FindingSeverity,
    ClaimAssessmentType
)
from app.ai.extractors import get_extractor_for_file
from app.ai.verifier import ContentVerifier
from app.ai.rag.reference_store import default_reference_store

logger = logging.getLogger(__name__)

class AIReviewPipeline:
    """
    Coordinates multiformat extraction, transcript generation, grounded fact-checking,
    and faculty review report synthesis.
    """

    def __init__(self, verifier: Optional[ContentVerifier] = None):
        self.verifier = verifier or ContentVerifier(default_reference_store)

    def process_assets(
        self,
        submission_id: str,
        assets: List[Dict[str, Any]]
    ) -> AIReportPayload:
        """
        Executes end-to-end extraction and fact checking across provided assets.
        assets is a list of dicts with keys:
          - 'asset_id': str
          - 'file_name': str
          - 'file_path': str
          - 'mime_type': Optional[str]
        """
        all_segments: List[ContentSegment] = []
        transcripts_by_asset: Dict[str, List[ContentSegment]] = {}
        extraction_errors: List[str] = []

        # 1. Multi-format Extraction Stage
        for asset in assets:
            asset_id = asset.get("asset_id", "unknown-asset")
            file_name = asset.get("file_name", "unnamed-file")
            file_path = asset.get("file_path", "")
            mime_type = asset.get("mime_type", "")

            extractor = get_extractor_for_file(file_name, mime_type)
            if not extractor:
                msg = f"No extractor available for file: {file_name} (mime: {mime_type})"
                logger.warning(msg)
                extraction_errors.append(msg)
                continue

            try:
                if not os.path.exists(file_path):
                    msg = f"Asset file not found on disk: {file_path}"
                    logger.warning(msg)
                    extraction_errors.append(msg)
                    continue

                segments = extractor.extract(file_path=file_path, asset_id=asset_id, asset_name=file_name)
                all_segments.extend(segments)
                transcripts_by_asset[asset_id] = segments
                logger.info(f"Extracted {len(segments)} segment(s) from asset {file_name} ({asset_id}).")
            except Exception as e:
                err_msg = f"Failed to extract asset {file_name}: {str(e)}"
                logger.error(err_msg, exc_info=True)
                extraction_errors.append(err_msg)

        # 2. Candidate Claims & Grounded Verification Stage
        findings: List[VerifiedFinding] = []
        candidate_claims = self.verifier.extract_candidate_claims(all_segments)

        for claim_text, segment in candidate_claims:
            finding = self.verifier.verify_claim(claim_text, segment)
            if finding:
                # We retain findings that require human review or are informative
                findings.append(finding)

        # 3. Cross-Asset Contradiction Analysis Stage
        contradictions = self.verifier.check_cross_asset_contradictions(all_segments)
        findings.extend(contradictions)

        # Sort findings: HIGH first, then MEDIUM, then LOW
        sev_rank = {FindingSeverity.HIGH: 0, FindingSeverity.MEDIUM: 1, FindingSeverity.LOW: 2}
        findings.sort(key=lambda f: sev_rank.get(f.severity, 3))

        # 4. Report Synthesis
        total_issues = len([f for f in findings if f.finding_type in [
            ClaimAssessmentType.POTENTIAL_ERROR,
            ClaimAssessmentType.CONTRADICTION,
            ClaimAssessmentType.UNSUPPORTED
        ]])

        if not all_segments and extraction_errors:
            job_status = "FAILED"
            summary = f"AI extraction failed for all assets: {'; '.join(extraction_errors[:3])}"
        elif extraction_errors:
            job_status = "PARTIAL"
            summary = f"Processed with partial extractions. {total_issues} issue(s) flagged for faculty review."
        elif total_issues == 0:
            job_status = "COMPLETED"
            summary = "AI verification completed. No factual contradictions or unsupported claims identified."
        else:
            job_status = "COMPLETED"
            summary = f"AI verification completed. {total_issues} issue(s) identified for faculty review."

        return AIReportPayload(
            submission_id=submission_id,
            status=job_status,
            summary=summary,
            total_segments_analyzed=len(all_segments),
            total_claims_checked=len(candidate_claims),
            findings=findings,
            transcripts_and_text=transcripts_by_asset,
            generated_at=datetime.now(timezone.utc).isoformat()
        )
