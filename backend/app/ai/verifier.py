import logging
import uuid
import re
from typing import List, Dict, Any, Tuple, Optional
from app.ai.schemas import (
    ContentSegment,
    VerifiedFinding,
    ClaimAssessmentType,
    FindingSeverity,
    SourceLocation,
    CitationReference,
    LocationType
)
from app.ai.rag.reference_store import ApprovedReferenceStore, default_reference_store

logger = logging.getLogger(__name__)

class ContentVerifier:
    """
    Grounded fact-checker and claim verification engine.
    Extracts atomic technical claims, compares against the approved reference index,
    and identifies cross-asset contradictions without ever hallucinating citations.
    """

    def __init__(self, reference_store: Optional[ApprovedReferenceStore] = None):
        self.ref_store = reference_store or default_reference_store

    def extract_candidate_claims(self, segments: List[ContentSegment]) -> List[Tuple[str, ContentSegment]]:
        """
        Extracts testable atomic claims from content segments.
        Filters conversational noise and greetings.
        """
        claims: List[Tuple[str, ContentSegment]] = []
        for segment in segments:
            # Skip error placeholders or empty notices
            if segment.text.startswith("[ERROR") or segment.text.startswith("[Extraction"):
                continue

            # Split paragraph into sentences
            sentences = re.split(r"(?<=[.!?])\s+", segment.text)
            for s in sentences:
                s_clean = s.strip()
                if len(s_clean) < 15:
                    continue

                # Filter out pure pleasantries
                if re.match(r"^(hello|hi|welcome|in this video|today we will|thank you|good morning)", s_clean, re.I):
                    continue

                claims.append((s_clean, segment))
        return claims

    def verify_claim(self, claim: str, segment: ContentSegment) -> Optional[VerifiedFinding]:
        """
        Assesses an individual claim against approved references.
        """
        # Retrieve candidate references
        retrieved = self.ref_store.retrieve(claim, top_k=2)

        # Parse source location details
        src_loc = SourceLocation(
            asset_id=segment.asset_id,
            asset_name=segment.metadata.get("asset_name"),
            location_type=segment.location_type,
            location_value=segment.location_value,
            timestamp_seconds=segment.metadata.get("timestamp_seconds"),
            slide_number=segment.metadata.get("slide_number"),
            page_number=segment.metadata.get("page_number")
        )

        claim_lower = claim.lower()

        # ---------------- Check 0: Adversarial Instruction & Untrusted Content Defense ----------------
        adversarial_indicators = [
            "ignore previous instructions",
            "override system",
            "bypass review",
            "system prompt:",
            "approve this course",
            "disregard all guidelines",
            "auto-publish",
            "grant 100/100"
        ]
        if any(adv in claim_lower for adv in adversarial_indicators):
            return VerifiedFinding(
                id=f"fnd-sec-{uuid.uuid4().hex[:8]}",
                finding_type=ClaimAssessmentType.POTENTIAL_ERROR,
                severity=FindingSeverity.HIGH,
                claim=claim,
                source_location=src_loc,
                explanation="Adversarial instruction pattern detected in uploaded material. The system treats all asset text as untrusted data and routes it for mandatory human review.",
                suggested_correction="Remove system prompt injection attempts or unauthorized control instructions from course materials.",
                references=[],
                requires_human_review=True,
                confidence=0.99
            )

        # Ambiguity / Uncertainty Detection
        uncertainty_indicators = ["it is debated whether", "unclear whether", "some claim while others dispute", "uncertain whether", "cannot be definitively proven"]
        if any(unc in claim_lower for unc in uncertainty_indicators):
            return VerifiedFinding(
                id=f"fnd-unc-{uuid.uuid4().hex[:8]}",
                finding_type=ClaimAssessmentType.UNCERTAIN,
                severity=FindingSeverity.LOW,
                claim=claim,
                source_location=src_loc,
                explanation="Claim addresses an academically debated or ambiguous concept. Surfaced for faculty qualitative judgment.",
                suggested_correction="Clarify context or present multiple academic perspectives.",
                references=[retrieved[0][0]] if retrieved else [],
                requires_human_review=True,
                confidence=0.50
            )

        # ---------------- Check 1: Known Academic Contradictions / Errors ----------------
        # Pattern A: Python execution oversimplifications
        if "python" in claim_lower and ("compiled-only" in claim_lower or "purely compiled" in claim_lower or "compiled language only" in claim_lower):
            py_ref = [c for c, _ in retrieved if "py" in c.reference_id]
            ref_list = [py_ref[0]] if py_ref else ([retrieved[0][0]] if retrieved else [])
            return VerifiedFinding(
                id=f"fnd-{uuid.uuid4().hex[:8]}",
                finding_type=ClaimAssessmentType.POTENTIAL_ERROR,
                severity=FindingSeverity.MEDIUM,
                claim=claim,
                source_location=src_loc,
                explanation="The claim characterizes Python as a compiled-only language, oversimplifying its execution model.",
                suggested_correction="Clarify that Python compiles source code to bytecode (.pyc) before execution on the CPython Virtual Machine.",
                references=ref_list,
                requires_human_review=True,
                confidence=0.92
            )

        # Pattern B: Binary search sorting prerequisite violation
        if "binary search" in claim_lower and ("unsorted" in claim_lower or "any arbitrary order" in claim_lower or "random order" in claim_lower):
            dsa_ref = [c for c, _ in retrieved if "dsa" in c.reference_id]
            ref_list = [dsa_ref[0]] if dsa_ref else ([retrieved[0][0]] if retrieved else [])
            return VerifiedFinding(
                id=f"fnd-{uuid.uuid4().hex[:8]}",
                finding_type=ClaimAssessmentType.POTENTIAL_ERROR,
                severity=FindingSeverity.HIGH,
                claim=claim,
                source_location=src_loc,
                explanation="Binary search fundamentally requires an ordered/sorted array to divide the search space in O(log n) time.",
                suggested_correction="Specify that Binary Search operates exclusively on sorted sequences.",
                references=ref_list,
                requires_human_review=True,
                confidence=0.96
            )

        # Pattern C: Protocol reliability reversal (UDP vs TCP)
        if "udp" in claim_lower and ("guarantees delivery" in claim_lower or "reliable delivery" in claim_lower or "handshake" in claim_lower):
            net_ref = [c for c, _ in retrieved if "net" in c.reference_id]
            ref_list = [net_ref[0]] if net_ref else ([retrieved[0][0]] if retrieved else [])
            return VerifiedFinding(
                id=f"fnd-{uuid.uuid4().hex[:8]}",
                finding_type=ClaimAssessmentType.POTENTIAL_ERROR,
                severity=FindingSeverity.HIGH,
                claim=claim,
                source_location=src_loc,
                explanation="UDP is a connectionless protocol that does not guarantee delivery, packet ordering, or 3-way handshake.",
                suggested_correction="Highlight that TCP provides reliable, ordered transmission, whereas UDP provides low-latency, connectionless transmission.",
                references=ref_list,
                requires_human_review=True,
                confidence=0.95
            )

        # Pattern D: Linux chmod misunderstanding
        if "chmod" in claim_lower and ("delete" in claim_lower or "remove" in claim_lower):
            os_ref = [c for c, _ in retrieved if "linux" in c.reference_id]
            ref_list = [os_ref[0]] if os_ref else ([retrieved[0][0]] if retrieved else [])
            return VerifiedFinding(
                id=f"fnd-{uuid.uuid4().hex[:8]}",
                finding_type=ClaimAssessmentType.POTENTIAL_ERROR,
                severity=FindingSeverity.HIGH,
                claim=claim,
                source_location=src_loc,
                explanation="The chmod command alters file access mode bits (permissions); it never deletes or removes files.",
                suggested_correction="Explain that chmod +x marks files executable, while rm is used to remove files.",
                references=ref_list,
                requires_human_review=True,
                confidence=0.98
            )

        # ---------------- Check 2: Strong Unsupported Assertion ----------------
        if retrieved:
            top_ref, score = retrieved[0]
            if score >= 0.45:
                # Corroborated with approved reference!
                return VerifiedFinding(
                    id=f"fnd-{uuid.uuid4().hex[:8]}",
                    finding_type=ClaimAssessmentType.NO_ISSUE_DETECTED,
                    severity=FindingSeverity.LOW,
                    claim=claim,
                    source_location=src_loc,
                    explanation="Claim is substantiated by approved curriculum references.",
                    suggested_correction=None,
                    references=[top_ref],
                    requires_human_review=False,
                    confidence=0.90
                )

        # Check if technical assertion lacks backing
        technical_keywords = ["always", "never", "guaranteed", "fastest", "impossible", "strictly"]
        if any(w in claim_lower for w in technical_keywords) and len(claim_lower.split()) > 6:
            return VerifiedFinding(
                id=f"fnd-{uuid.uuid4().hex[:8]}",
                finding_type=ClaimAssessmentType.UNSUPPORTED,
                severity=FindingSeverity.LOW,
                claim=claim,
                source_location=src_loc,
                explanation="Statement asserts an absolute technical constraint that lacks explicit backing in the approved course reference corpus.",
                suggested_correction="Qualify statement or provide academic source citation for faculty review.",
                references=[],
                requires_human_review=True,
                confidence=0.65
            )

        return None

    def check_cross_asset_contradictions(self, segments: List[ContentSegment]) -> List[VerifiedFinding]:
        """
        Scans across different assets (e.g. video audio transcript vs. PPT slide or PDF page)
        for contradictory statements.
        """
        contradiction_findings: List[VerifiedFinding] = []
        assets_seen = set(s.asset_id for s in segments)
        if len(assets_seen) < 2:
            return []

        # Group segments by asset_id
        by_asset: Dict[str, List[ContentSegment]] = {}
        for s in segments:
            by_asset.setdefault(s.asset_id, []).append(s)

        asset_keys = list(by_asset.keys())
        for i in range(len(asset_keys)):
            for j in range(i + 1, len(asset_keys)):
                a1 = asset_keys[i]
                a2 = asset_keys[j]

                for s1 in by_asset[a1]:
                    t1 = s1.text.lower()
                    for s2 in by_asset[a2]:
                        t2 = s2.text.lower()

                        # Example contradiction check: Time complexity disagreement
                        if "binary search" in t1 and "binary search" in t2:
                            if ("o(1)" in t1 and "o(log n)" in t2) or ("o(log n)" in t1 and "o(1)" in t2):
                                loc1 = SourceLocation(
                                    asset_id=s1.asset_id,
                                    asset_name=s1.metadata.get("asset_name"),
                                    location_type=s1.location_type,
                                    location_value=s1.location_value
                                )
                                loc2 = SourceLocation(
                                    asset_id=s2.asset_id,
                                    asset_name=s2.metadata.get("asset_name"),
                                    location_type=s2.location_type,
                                    location_value=s2.location_value
                                )
                                contradiction_findings.append(
                                    VerifiedFinding(
                                        id=f"fnd-contra-{uuid.uuid4().hex[:8]}",
                                        finding_type=ClaimAssessmentType.CONTRADICTION,
                                        severity=FindingSeverity.HIGH,
                                        claim=f"Contradicting binary search complexity statements between {loc1.location_value} and {loc2.location_value}.",
                                        source_location=loc1,
                                        conflicting_source_location=loc2,
                                        explanation=f"{loc1.location_value} states '{s1.text.strip()}', whereas {loc2.location_value} states '{s2.text.strip()}'.",
                                        suggested_correction="Align materials on standard O(log n) time complexity for binary search.",
                                        references=[c for c, _ in self.ref_store.retrieve("binary search complexity", top_k=1)],
                                        requires_human_review=True,
                                        confidence=0.94
                                    )
                                )

                        # Example contradiction check: Python execution definition
                        if "python" in t1 and "python" in t2:
                            if ("interpreted" in t1 and "compiled-only" in t2) or ("compiled-only" in t1 and "interpreted" in t2):
                                loc1 = SourceLocation(
                                    asset_id=s1.asset_id,
                                    asset_name=s1.metadata.get("asset_name"),
                                    location_type=s1.location_type,
                                    location_value=s1.location_value
                                )
                                loc2 = SourceLocation(
                                    asset_id=s2.asset_id,
                                    asset_name=s2.metadata.get("asset_name"),
                                    location_type=s2.location_type,
                                    location_value=s2.location_value
                                )
                                contradiction_findings.append(
                                    VerifiedFinding(
                                        id=f"fnd-contra-{uuid.uuid4().hex[:8]}",
                                        finding_type=ClaimAssessmentType.CONTRADICTION,
                                        severity=FindingSeverity.HIGH,
                                        claim=f"Conflicting descriptions of Python execution model across uploaded assets.",
                                        source_location=loc1,
                                        conflicting_source_location=loc2,
                                        explanation=f"{loc1.location_value} and {loc2.location_value} provide inconsistent definitions.",
                                        suggested_correction="Harmonize presentation slides and video narration with bytecode compilation model.",
                                        references=[c for c, _ in self.ref_store.retrieve("Python execution bytecode", top_k=1)],
                                        requires_human_review=True,
                                        confidence=0.91
                                    )
                                )

        return contradiction_findings
