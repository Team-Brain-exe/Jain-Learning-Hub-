# JAIN FET Learning Hub — AI Integration API Contract

**Owner:** Prit (AI Integration Engineer)  
**Collaborators:** Aparna (Backend Integration & Security), Haripriya (Uploads & Course Features), Arya (Frontend UI)  
**Branch:** `Prit-ai`  

---

## 1. Lifecycle & Integration Flow with Haripriya

The AI review process is tightly coupled to Haripriya's upload and course submission lifecycle:

```
[Student Creator]
       │
       ▼
1. POST /api/upload-permissions (Requires Student Consent & Faculty Approval)
       │
       ▼
2. POST /api/uploads/request (Generates signed URL, validates permission)
       │
       ▼
3. Storage Upload (Direct upload to storage bucket)
       │
       ▼
4. POST /api/uploads/finalize (Re-verifies permission, marks asset FINALIZED)
       │
       ▼
5. POST /api/courses/{id}/submit
       │
       ├─► Course Status: DRAFT -> SUBMITTED -> AI_PROCESSING
       │
       ├─► AI Review Trigger: Calls AIReviewService.trigger_ai_review(db, course)
       │       │
       │       ▼
       │   AI Job Progression:
       │   QUEUED ──► EXTRACTING ──► TRANSCRIBING ──► VERIFYING ──► COMPLETED / PARTIAL / FAILED
       │
       ▼
6. Course Status: Transitions to FACULTY_REVIEW (Never PUBLISHED)
       │
       ▼
[Assigned Faculty Member]
       │
       ├─► Inspects Assets, Transcripts, and Advisory AI Findings
       │
       ▼
7. POST /api/courses/faculty/reviews/{id}/decision
       ├─► "APPROVE"          ──► Course Status: PUBLISHED (Catalog visible)
       ├─► "REQUEST_REVISION" ──► Course Status: REVISION_REQUESTED
       └─► "REJECT"           ──► Course Status: REJECTED
```

---

## 2. Job Status Values & Meaning

| Status | Description | Failure / Retry Behavior |
|---|---|---|
| `QUEUED` | Job created and enqueued for extraction. | Safe to retry. |
| `EXTRACTING` | Text & slide extractors (PDF, PPTX, DOCX, Images) running. | In-progress. |
| `TRANSCRIBING` | Speech audio track being processed into timestamped segments. | In-progress. |
| `VERIFYING` | Claim extraction and reference fact-checking against syllabus RAG. | In-progress. |
| `COMPLETED` | All assets processed and findings cataloged. | Ready for faculty review. |
| `PARTIAL` | One or more non-critical assets encountered errors; valid assets evaluated. | Flagged in summary for faculty. |
| `FAILED` | Critical pipeline error. **Fail-safe: Course transitions to `FACULTY_REVIEW` for manual evaluation, never auto-published.** | Faculty can manually review or re-trigger. |

---

## 3. Idempotency Guarantees
- Re-triggering `trigger_ai_review` or calling `POST /api/ai-reviews/internal/jobs` multiple times with the same course or job ID updates the active job record rather than generating duplicate conflicting records.
- Previous findings for that job are safely cleared and refreshed, ensuring no race conditions or stale duplicate findings exist in `ai_findings`.

---

## 4. Authorization & Access Controls (Verified with Aparna)

| Role / Actor | Can Submit for AI Check? | Can View AI Report (`GET /api/ai-reviews/{id}`)? | Can Overwrite / Dismiss Finding? | Can Make Publication Decision? |
|---|:---:|:---:|:---:|:---:|
| **Student Creator** (Course Owner) | Yes (`POST /courses/{id}/submit`) | Yes (read-only for their own course) | No | No |
| **Assigned Faculty Reviewer** | No (reviews submitted courses) | Yes | Yes (with logged override remark) | Yes (`APPROVE` / `REQUEST_REVISION` / `REJECT`) |
| **Unassigned Faculty** | No | **Forbidden (403)** | No | **Forbidden (403)** |
| **University Admin** | Yes | Yes | Yes | Yes |

---

## 5. Endpoints & Schemas

### 5.1 `GET /api/ai-reviews/{job_id}`
Returns the comprehensive AI review job details, itemized findings, citations, and full transcripts.

**Headers:**
`Authorization: Bearer <token>` or `X-User-Id`, `X-User-Role`

**Response Example:**
```json
{
  "id": "job-550e8400-e29b-41d4-a716-446655440000",
  "course_id": "course-101",
  "status": "COMPLETED",
  "summary": "AI verification completed. 2 issues identified for faculty review.",
  "total_segments": 12,
  "total_claims": 8,
  "transcripts_json": "{\"asset-video-1\": [{\"location_value\": \"timestamp: 02:40\", \"text\": \"Python is a compiled-only programming language.\"}]}",
  "created_at": "2026-11-20T17:00:00Z",
  "updated_at": "2026-11-20T17:00:05Z",
  "findings": [
    {
      "id": "fnd-1",
      "asset_id": "asset-video-1",
      "finding_type": "POTENTIAL_ERROR",
      "severity": "medium",
      "claim": "Python is a compiled-only programming language.",
      "source_location": "timestamp: 02:40",
      "conflicting_location": null,
      "explanation": "The claim characterizes Python as a compiled-only language, oversimplifying its execution model.",
      "suggested_correction": "Clarify that Python compiles source code to bytecode (.pyc) before execution on the CPython Virtual Machine.",
      "references_json": "[{\"reference_id\":\"ref-jain-py-001\",\"title\":\"Python Official Execution Model & Runtime Architecture\",\"snippet\":\"Python is an interpreted, high-level language that first compiles source code (.py) into an intermediate bytecode format (.pyc)...\",\"source_document\":\"Jain FET CSE Curriculum: Programming Paradigms v2.1\"}]",
      "confidence": 0.92,
      "requires_human_review": true
    }
  ]
}
```

### 5.2 `GET /api/ai-reviews/course/{course_id}`
Retrieves the most recent AI review job for a given course. Accessible to the course creator and assigned faculty reviewer.

### 5.3 `POST /api/ai-reviews/internal/jobs?course_id={course_id}`
Internal endpoint for queue workers or creators to re-run the verification pipeline.

---

## 6. Frontend Mapping for Arya (`AiReportView.tsx`)

In [AiReportView.tsx](file:///Users/pritthacker/Jain-Learning-Hub-/src/components/studio/AiReportView.tsx), each finding seamlessly maps to:
- `f.severity` ──► High (red badge), Medium (amber badge), Low (gray badge)
- `f.area` ──► `finding_type` (`POTENTIAL_ERROR`, `UNSUPPORTED`, `CONTRADICTION`, etc.)
- `f.message` ──► `claim`
- `f.suggestion` ──► `suggested_correction`
- `f.source_location` ──► Clickable anchor to jump to video timestamp, slide, or page
- `f.references` ──► Verified citations from `references_json`
- `canOverride` ──► Enables faculty to override the advisory finding with a recorded rationale.
