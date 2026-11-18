# JAIN FET Learning Hub — Haripriya's Revised Work Plan

**Owner:** Haripriya  
**Role:** Primary Backend Feature Developer  
**Backend Lead:** Danwin  
**Project Lead:** Aparna  
**Collaborators:** Prit (AI), Arya (frontend)

## Main responsibility
Implement the platform's feature APIs on top of Danwin's FastAPI foundation and auth/role guards. You own the **faculty upload-consent workflow**, course content pipeline, learning features and certificate workflows. Coordinate scope and priorities with Danwin to avoid overload.

## Priority P0 — Faculty consent and email decision workflow
1. Build `upload_permissions` model and migrations with student, assigned verified faculty, content title/type/format, description, consent declaration timestamp, status (`PENDING`, `APPROVED`, `REJECTED`), remarks, and audit timestamps.
2. Implement `POST /api/upload-permissions`, `GET /api/upload-permissions/me`, `GET /api/faculty/upload-permissions`, `GET /api/faculty/upload-permissions/{id}`, `POST /api/faculty/upload-permissions/{id}/decision`.
3. Validate selected faculty against verified faculty records. Require student consent and allow both academic and non-academic proposed content.
4. Email the assigned faculty a request summary and **Allow Peer / Reject Request** links. Links open a secure faculty-authenticated review page; clicking an email link alone must never change state. Require a deliberate POST decision and store remarks/audit trail.
5. Expose request status to the student's dashboard. Only matching, active, approved permissions can unlock upload. Reject unauthorized faculty decisions and duplicate/conflicting decisions.
6. Add notification status/retry handling and clear errors; coordinate with Arya for UI updates.

## Priority P0 — Courses, uploads and review states
1. Create course, module, lesson and media asset models plus creator CRUD APIs.
2. Implement secure file upload initialization/finalization with validated type, size, ownership and signed storage URLs. Support video, audio, PPT/PPTX, PDF, DOCX and images.
3. At **both** upload initialization and finalization, verify Danwin's server-side authorization helper and the matching approved upload permission. Approval is specific to the requested content; no blanket access.
4. On finalized upload, create an AI review job and pass a stable file reference to Prit's pipeline. Track `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`.
5. Implement faculty publication review: show uploaded assets, AI findings, evidence and transcripts; allow `APPROVE`, `REJECT`, `REQUEST_REVISION`. Only approved content becomes visible in the catalog.
6. Model content lifecycle: `DRAFT → SUBMITTED → AI_PROCESSING → FACULTY_REVIEW → APPROVED → PUBLISHED`; support rejected/revision paths.

## Priority P1 — Learning and certificates
1. Catalog/course details, enrollment and lesson-progress APIs.
2. Quiz questions, attempts and passing thresholds; prevent forged completion.
3. Certificate eligibility rules for **Course Completion** (learner meets requirements) and **Peer Educator** (student creator's original course is approved/published).
4. Admin-authorized certificate issuance, PDF/QR verification, unique ID and public verification endpoint. Prototype certificates must be marked as samples unless university-approved.

## Suggested API ownership
```text
POST /api/upload-permissions
GET  /api/upload-permissions/me
GET  /api/faculty/upload-permissions
GET  /api/faculty/upload-permissions/{id}
POST /api/faculty/upload-permissions/{id}/decision
GET  /api/courses
POST /api/courses
PATCH /api/courses/{id}
POST /api/courses/{id}/submit
POST /api/uploads/request
POST /api/uploads/finalize
GET  /api/faculty/reviews
POST /api/faculty/reviews/{id}/decision
POST /api/courses/{id}/enroll
POST /api/lessons/{id}/progress
POST /api/quizzes/{id}/attempts
GET  /api/certificates/me
POST /api/admin/certificates/{id}/issue
GET  /api/certificates/verify/{id}
```

## Integration boundaries
- **Danwin:** provides auth, role guards, base app and reviews your PRs.
- **Prit:** builds extraction/transcription/fact verification and returns structured reports; do not implement AI models yourself.
- **Arya:** connects Lovable frontend to your endpoints; share OpenAPI docs and sample payloads.
- **Aparna:** confirms acceptance criteria and demo priorities.

## Suggested 14-day prototype plan
| Period | Focus | Deliverable |
|---|---|---|
| Days 1–3 | Models and consent request API | Request submission, faculty lookup, status tracking |
| Days 4–6 | Faculty email approval | Authenticated decision endpoint, email links, audit trail |
| Days 7–9 | Course and upload API | Secure upload with permission enforcement, AI job trigger |
| Days 10–11 | Publication review | Faculty approval/revision and catalog visibility |
| Days 12–14 | Demo features and integration | Minimal progress/quiz/certificate demo, tests with Arya and Prit |

**Scope note:** This is a substantial workload. For a 14-day prototype, build P0 first and use limited sample data for P1. Full assessment and certificate automation can follow in later sprints.

## Must-pass tests
- Student cannot upload without faculty permission.
- Faculty email link by itself does not approve.
- Unassigned faculty cannot approve/reject another faculty's request.
- Approved permission only authorizes its matching student/content.
- Finalized upload queues AI review; AI findings are visible to faculty.
- Content cannot publish without final faculty approval.
- Certificate cannot be officially issued without authorized eligibility checks.
