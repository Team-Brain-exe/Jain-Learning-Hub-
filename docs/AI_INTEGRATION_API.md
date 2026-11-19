# JAIN FET Learning Hub — AI Integration API Specification

**Author:** Prit (AI Integration Engineer)  
**Collaborators:** Haripriya (Backend Features), Arya (Frontend UI), Danwin (Backend Lead), Aparna (Project Lead)  
**Branch:** `Prit-ai`

---

## 1. Overview
The AI verification pipeline extracts multiformat content (Video, Audio, PPTX, PDF, DOCX, Images), normalizes segments with precise location markers, extracts testable claims, and performs grounded fact-checking against an approved curriculum reference index (RAG).

**Crucial Safety Rule:** AI findings are strictly **advisory**. The AI system **never approves or publishes courses automatically**. All decisions require explicit faculty action.

---

## 2. Supported Formats & Location Anchors

| Input Type | Processing Engine | Location Marker | UI Display |
|---|---|---|---|
| **Video (`.mp4`, `.mov`)** | FFmpeg extraction → Speech-to-text transcript & WebVTT | `timestamp: MM:SS` | Clickable video timestamp |
| **Audio (`.mp3`, `.wav`)** | Speech-to-text transcript & WebVTT | `timestamp: MM:SS` | Audio player position |
| **Presentation (`.pptx`)** | `python-pptx` (slides, notes, tables) | `Slide N` | Direct slide link/reference |
| **Document (`.pdf`)** | `PyMuPDF` (page-by-page extraction) | `Page N` | Page reference in viewer |
| **Document (`.docx`)** | `python-docx` (headings, sections, tables) | `Section: [Heading]` | Section heading tag |
| **Graphic (`.png`, `.jpg`)** | PIL & OCR diagram analysis | `Image: [filename]` | Image inspection dialog |

---

## 3. Endpoints

### 3.1 Get AI Review by Job ID
`GET /api/ai-reviews/{job_id}`
- **Auth:** Bearer Token / Role Headers (`student` [owner], `faculty` [reviewer], or `admin`).
- **Response:** `200 OK`

```json
{
  "id": "job-550e8400-e29b-41d4-a716-446655440000",
  "course_id": "course-12345",
  "status": "COMPLETED",
  "summary": "AI verification completed. 2 issues identified for faculty review.",
  "total_segments": 14,
  "total_claims": 8,
  "transcripts_json": "{...}",
  "created_at": "2026-11-19T17:30:00Z",
  "updated_at": "2026-11-19T17:30:05Z",
  "findings": [
    {
      "id": "fnd-a1b2c3d4",
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
    },
    {
      "id": "fnd-e5f6g7h8",
      "asset_id": "asset-video-1",
      "finding_type": "CONTRADICTION",
      "severity": "high",
      "claim": "Contradicting binary search complexity statements between timestamp: 04:15 and Slide 2.",
      "source_location": "timestamp: 04:15",
      "conflicting_location": "Slide 2",
      "explanation": "timestamp: 04:15 states 'binary search lookup is O(1) in all scenarios.', whereas Slide 2 states 'Binary search runs in O(log n) time.'.",
      "suggested_correction": "Align materials on standard O(log n) time complexity for binary search.",
      "references_json": "[{\"reference_id\":\"ref-jain-dsa-003\",\"title\":\"Algorithms & Complexity Analysis Standards\",\"snippet\":\"Binary search requires a sorted array and operates in O(log n) time complexity.\",\"source_document\":\"Jain FET Data Structures & Algorithms Core Textbook\"}]",
      "confidence": 0.94,
      "requires_human_review": true
    }
  ]
}
```

### 3.2 Get Latest AI Review for Course
`GET /api/ai-reviews/course/{course_id}`
- **Auth:** Bearer Token / Role Headers (`student` [owner], `faculty` [reviewer], or `admin`).
- **Response:** `200 OK` (returns latest `AIReviewJobResponse` for the given course).

### 3.3 Trigger / Rerun AI Job
`POST /api/ai-reviews/internal/jobs?course_id={course_id}`
- **Auth:** Student Creator or Admin.
- **Response:** `202 Accepted`

---

## 4. Finding Types & Classification Semantics

1. **`POTENTIAL_ERROR`**: Factual assertion contradicts approved academic reference. Requires review; suggested correction and verified curriculum citation provided.
2. **`UNSUPPORTED`**: Strong or absolute assertion (e.g. *"always guaranteed to be fastest"*) lacking academic backing in the syllabus corpus. Never synthesizes citations.
3. **`CONTRADICTION`**: Conflict between two separate assets belonging to the same course (e.g. spoken audio transcript contradicts presentation slide bullet). Contains both `source_location` and `conflicting_location`.
4. **`NO_ISSUE_DETECTED`**: Claim corroborated by approved curriculum references.
5. **`UNCERTAIN`**: Ambiguous or borderline claim explicitly surfaced for faculty discretion.

---

## 5. UI Integration for Arya (`AiReportView.tsx`)

In [AiReportView.tsx](file:///Users/pritthacker/Jain-Learning-Hub-/src/components/studio/AiReportView.tsx), each finding exposes:
- **`severity`**: `"high"` | `"medium"` | `"low"`
- **`finding_type`**: maps to `area`
- **`claim`**: original extracted statement
- **`suggested_correction`**: actionable guidance for the student/creator
- **`source_location`**: anchor for jumping to player timestamp, slide, or page
- **`references`**: parsed from `references_json` containing authentic citation details
- **`requires_human_review`**: enables the faculty override / remark input field.
