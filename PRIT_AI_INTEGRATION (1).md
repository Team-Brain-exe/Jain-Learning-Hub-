# JAIN FET Learning Hub — Prit AI Integration Work Plan

**Owner:** Prit  
**Role:** AI Integration Engineer — Multiformat Extraction, Transcription, Fact-Checking and Reports  
**Project Lead:** Aparna  
**Collaborators:** Danwin (auth/consent), Haripriya (content/backend), Arya (Lovable-generated frontend)

## Mission
Implement **AI-assisted verification of every approved uploaded content item**, including academic and non-academic materials. The system extracts what was actually said or shown, identifies potentially incorrect or unsupported factual claims, and gives faculty an evidence-grounded review report. **AI must not claim perfect correctness or approve publication on its own.**

## Input support and extraction
| Input | Processing | Location markers |
|---|---|---|
| Video MP4/MOV | FFmpeg audio extraction → speech-to-text; analyze embedded slide frames if enabled | Timestamps |
| Audio MP3/WAV | Speech-to-text | Timestamps |
| PPT/PPTX | Slide text, tables, speaker notes, relevant embedded images via image analysis | Slide number |
| PDF | Native text extraction; OCR fallback only for scans | Page number |
| DOCX | Paragraphs, tables, headings and embedded figures | Section/page if available |
| PNG/JPG | Image-text extraction and relevant diagram interpretation | Image ID/region |
| Multiple assets | Merge extracted text and compare claims across files | Asset + timestamp/slide/page |

**Important:** Transcription applies to speech; slides/documents require extraction, not speech transcription. Handle unsupported/encrypted/corrupt files with explicit errors and manual review.

## AI processing pipeline
1. Receive finalized `asset_id` and `submission_id` from Haripriya; check allowed file type and access-controlled storage.
2. Extract text/audio; for speech, produce timestamped transcript and WebVTT captions where relevant.
3. Normalize text into segments preserving asset ID, version and source location.
4. Extract factual/technical claims using structured LLM JSON output.
5. Retrieve supporting references from an approved document collection (RAG); retain citation IDs, snippets and source metadata.
6. Assess each claim as `POTENTIAL_ERROR`, `UNSUPPORTED`, `CONTRADICTION`, `NO_ISSUE_DETECTED`, or `UNCERTAIN` with reasons. Never invent references.
7. Compare claims across uploaded assets for contradictions (e.g. video versus slide 6).
8. Produce report summary and itemized findings for the faculty dashboard; include original quote, suggested correction, evidence and location.
9. Return status `COMPLETED`, `PARTIAL`, or `FAILED` to Haripriya. On failure, block auto-publication and allow manual faculty review.

## Suggested stack
- Python 3.12, FFmpeg, faster-whisper/Whisper or hosted transcription service.
- `python-pptx`, `python-docx`, PyMuPDF for text extraction.
- Vision/OCR service only when necessary for images/scanned documents.
- LLM provider with schema-constrained JSON for claims and explanations.
- PostgreSQL + pgvector or small approved reference index for RAG.
- Redis + Celery/RQ for background processing; unit tests with mock models.

## Report schema (example)
```json
{
  "submission_id": "demo-submission-001",
  "asset_id": "demo-video-001",
  "status": "COMPLETED",
  "summary": "Two potential issues need faculty review.",
  "findings": [
    {
      "type": "POTENTIAL_ERROR",
      "severity": "medium",
      "claim": "Python is a compiled-only programming language.",
      "source_location": {"asset_id": "demo-video-001", "timestamp_seconds": 272},
      "explanation": "This statement oversimplifies Python execution.",
      "suggested_correction": "Explain compilation to bytecode and interpreter/runtime behavior.",
      "references": [{"title": "Approved Python reference", "reference_id": "ref-001"}],
      "requires_human_review": true
    }
  ]
}
```
**The example reference is a placeholder and must never be shown as a real citation in a live report.**

## API/job integration contract
- Haripriya triggers `POST /internal/ai/jobs` or a background queue message after upload finalization.
- Implement `GET /api/ai-reviews/{submission_id}` (or expose results through Haripriya's backend) and progress statuses `QUEUED`, `EXTRACTING`, `TRANSCRIBING`, `VERIFYING`, `COMPLETED`, `PARTIAL`, `FAILED`.
- Use idempotent job IDs; record input version and prompt/model version so reruns are traceable.
- Never process arbitrary public URLs or user-supplied storage paths without validation.
- Keep secrets server-side; set retention policy for raw media, transcripts and third-party AI processing.

## Faculty-facing report requirements
- Searchable transcript/extracted text.
- Findings grouped by severity and asset.
- Video/audio timestamps, PPT slide numbers, PDF page numbers.
- Highlight source claim and show evidence link/snippet.
- Indicate uncertainty; do not show an unvalidated 'accuracy percentage'.
- Allow faculty to mark finding valid/false positive, add comments, request revision and make final publication decision via Haripriya's review API.

## Prototype priorities
**P0:** Audio/video transcription, PPT/PDF/DOCX text extraction, 2–3 grounded demo findings, asynchronous status updates, faculty-readable report.  
**P1:** Cross-file contradiction detection, scanned image OCR, WebVTT captions, robust reference indexing.  
**P2:** Multilingual transcription, advanced diagram analysis, plagiarism/originality checks (requires separate design and policy).

## Evaluation and safety
- Build a small faculty-reviewed test set with known correct, incorrect, ambiguous and unsupported claims.
- Measure extraction completeness, timestamp accuracy, factual-flag precision/recall and citation validity.
- Test adversarial instructions inside uploaded files; treat extracted content as data, never system instructions.
- Do not guarantee all misinformation is detected; require human publication approval.

## Milestones (suggested two-week prototype)
- **Days 1–3:** file-type extraction and job contract.
- **Days 4–7:** speech transcription and claim extraction.
- **Days 8–10:** reference retrieval, report generation and backend integration.
- **Days 11–14:** test cases, demo data and faculty report integration.

## Definition of done
At least one video/audio, one PPT, one PDF and one DOCX complete extraction; AI reports show source locations and evidence or explicit uncertainty; errors are handled; faculty can review findings through the existing frontend without any automatic publication.
