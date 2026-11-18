# JAIN FET Learning Hub — Danwin's Revised Work Plan

**Owner:** Danwin  
**Role:** Backend Lead (limited feature development)  
**Project Lead:** Aparna  
**Collaborators:** Haripriya (backend implementation), Prit (AI), Arya (frontend)

## Main responsibility
Lead the backend technically while keeping hands-on coding focused. Own architecture, integration standards, code review, and backend release readiness. Haripriya owns most feature endpoints.

## Your coding tasks (small, clearly bounded)
1. **FastAPI foundation:** create `app/main.py`, shared configuration, database session wiring, health check (`GET /api/health`), error response conventions and CORS settings for Arya's frontend.
2. **Authentication foundation:** implement login (`POST /api/auth/login`), current user (`GET /api/auth/me`), password hashing, JWT/session validation, and reusable role guards for `student`, `faculty`, `admin`. Verify faculty identities from an approved directory or seeded records; never trust a freely typed email alone.
3. **Shared authorization helpers:** implement reusable `require_user`, `require_role`, and `require_approved_upload_permission(student_id, permission_id)` interfaces. Haripriya calls these in upload endpoints; Danwin does not build the entire consent workflow.
4. **Integration smoke tests:** verify login, role denial, health endpoint, and a permitted-versus-blocked upload path together with Haripriya.

## Backend lead responsibilities (review/coordination, not additional feature coding)
- Agree with Haripriya on model ownership, API response shapes, database migrations, error conventions and branch/PR workflow.
- Review Haripriya's consent/email, course, upload, quiz and certificate PRs for authorization and data consistency.
- Agree with Prit on AI job lifecycle (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`), report schema and storage references.
- Help Arya map Lovable frontend calls to actual endpoints; do not take over frontend implementation.
- Resolve integration blockers, oversee environment variables/secrets, review deployment readiness, and approve backend merges.

## Explicitly NOT assigned to Danwin
- Faculty consent request form APIs, faculty approval/rejection endpoints, email notifications or request status screens (Haripriya).
- Course/lesson CRUD, file storage and uploads, enrollment/progress, quizzes, certificates, final publication review (Haripriya).
- Transcription, PPT/PDF/DOCX/image extraction, factual checks, AI findings or reports (Prit).
- Frontend pages or UI components (Arya).

## Handoff contracts
- `users` and auth/role guard implementation: **Danwin**.
- `upload_permissions`, faculty decision workflow and email delivery: **Haripriya**, using Danwin's role guards.
- Upload permission must be checked on the server when creating an upload and when finalizing it; approval must match the student and content request.
- `ai_review_jobs` and `ai_findings`: **Prit** owns processing and output schema; Haripriya owns persistence/connection to course submission state, with agreement on interfaces.
- Final publication always requires an authorized faculty decision after AI review.

## Suggested 14-day plan
| Period | Focus | Deliverable |
|---|---|---|
| Days 1–3 | Foundation and shared contracts | FastAPI scaffold, database wiring, `/health`, API conventions |
| Days 4–6 | Auth and reusable guards | Login, `/me`, roles, unit tests |
| Days 7–10 | Lead reviews and integration | Review Haripriya's consent/upload endpoints, Prit's AI interface, Arya's API needs |
| Days 11–14 | Stabilization | Integration smoke tests, PR review, environment and release checklist |

## Definition of done
- Auth and role protections are functional and tested.
- Shared backend conventions and API contracts are documented.
- Haripriya's feature routes can use your authentication and authorization helpers.
- Backend integration is reviewed and ready for a demo.
- You are not the primary implementer of the consent, course, upload, quiz or certificate features.
