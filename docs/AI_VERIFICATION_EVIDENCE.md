# JAIN Learning Hub - Final AI Pipeline & Notification Verification Report

**Author:** Prit (AI Integration & Notifications)  
**Project Lead:** Aparna | **Merge Coordinator:** Arya  
**Target Branch:** `feature/prit-final-verification`  
**Base Branch:** `main` (latest known commit: `05ff8b4`)
**Verification Date:** November 26, 2026

---

## 1. Executive Summary

This report documents verification of the AI Verification Pipeline, local file storage integration, faculty publication review workflow, and consent email deep links.

The verification covers:

- AI extraction and factual verification.
- Storage-service integration with AI asset processing.
- Faculty review and publication restrictions.
- AI job retries and failure handling.
- Adversarial prompt-injection detection.
- Asset storage path validation and traversal protection.
- Consent notification URL generation and safe failure handling.

The AI review pipeline does not automatically publish courses. Courses remain subject to faculty review.

---

## 2. Test Execution Evidence

### A. Latest Verified Test Results

| Test Suite | Tests Passed | Tests Failed | Status |
|---|---:|---:|---|
| Frontend unit and integration tests (Vitest) | 294 | 0 | PASS |
| Complete backend test suite (Pytest) | 101 | 0 | PASS |
| Frontend production build (`npm run build`) | Success | 0 | PASS |
| **Combined automated tests** | **395** | **0** | **PASS** |

**Backend full-suite verification**

The complete backend test suite was executed after the storage-path resolution and security changes.

Run from the `backend` directory:

```powershell
python -m pytest -q
```

Result:

```text
101 passed, 1 warning in 114.25s
```

**Focused AI verification**

The following modules were executed separately.

Run from the `backend` directory:

```powershell
python -m pytest tests/test_ai_adversarial_safety.py tests/test_ai_pipeline_and_api.py tests/test_ai_verification_e2e.py tests/test_submission_and_faculty_review.py -q
```

Result:

```text
14 passed, 1 warning
```

**Asset-path security verification**

Run from the `backend` directory:

```powershell
python -m pytest tests/test_ai_asset_path_security.py -q
```

Result:

```text
9 passed
```

These nine security tests are included in the complete backend test count of 101.

They cover rejection of absolute paths, Windows drive paths, UNC paths, and path traversal attempts.

**AI verification E2E verification**

The complete AI verification E2E module was also executed separately.

Run from the `backend` directory:

```powershell
python -m pytest tests/test_ai_verification_e2e.py -q
```

Result:

```text
6 passed, 1 warning
```

**Frontend verification**

Run from the project root:

```powershell
npm test
```

Result:

```text
294 tests passed
```

**Frontend production build**

Run from the project root:

```powershell
npm run build
```

Result: successful production build.

The warnings observed during backend testing were dependency/configuration warnings involving `pytest-asyncio` and the deprecated `fitz` API. They did not cause test failures.

---

## 3. Scope Item Verifications

### 1. Stored File Access and Course Submission Integration

The AI review service resolves media assets using the storage service.

**Normal uploaded files:**

- Upload storage is configured through `STORAGE_LOCAL_DIR`.
- The default local storage directory is `backend/storage_objects`.
- Uploaded files are resolved through `StorageService.resolve_local_path()`.
- The AI review service uses the same storage resolver used by the upload storage implementation.
- Relative storage keys are validated against absolute paths and path traversal.
- Windows drive-qualified paths and UNC paths are also rejected.

**Demo assets:**

- Existing demo asset records are supported through an explicit `demo_assets` path.
- Demo asset resolution is separate from normal uploaded-file resolution.
- Arbitrary fallback directory searches have been removed.

**Storage-to-AI integration test:**

The test `test_uploaded_storage_file_is_processed_by_ai_review` verifies that:

1. A real PDF is loaded from the demo asset directory.
2. The PDF is written using `StorageService.write_object()`.
3. The resulting storage key is resolved using the storage service.
4. A `MediaAsset` references the stored file.
5. `AIReviewService.trigger_ai_review()` processes the stored PDF.
6. The AI job completes and contains extracted transcript data.
7. The course remains in `FACULTY_REVIEW`.

This test verifies storage-service-to-AI integration. It does not independently establish the entire HTTP upload-request, upload, and finalization flow.

**Course submission and enrollment gate:**

When a student submits a course through:

`POST /api/courses/{id}/submit`

the course transitions to `FACULTY_REVIEW`.

The learner enrollment endpoint:

`POST /api/courses/{id}/enroll`

requires the course to be published. Enrollment during faculty review is rejected with `400 Bad Request`.

Only the faculty approval workflow can publish the course.

### 2. AI Job Lifecycle, Failures, and Adversarial Defenses

**Idempotency and retries:**

- Existing active AI review jobs are reused.
- Reprocessing clears previous findings for the job.
- Duplicate jobs are avoided during the tested retry workflow.

**Corrupt and unsupported files:**

- Extractor edge cases are covered by backend tests.
- Unsupported formats and extraction failures are handled by the pipeline.
- Failed or partial extraction does not automatically publish a course.

**Adversarial content:**

- Prompt-injection content is treated as untrusted course content.
- Adversarial findings can be classified as high severity.
- Findings requiring human review are routed to faculty review.

**Asset-path security:**

- Absolute POSIX paths are rejected.
- Windows drive-qualified paths are rejected.
- UNC paths are rejected.
- Parent-directory traversal attempts are rejected.
- Security tests verify that unsafe storage keys raise `ValueError`.

**Fail-safe recovery:**

If the AI pipeline raises an unexpected exception:

- The AI job is marked `FAILED`.
- An error message is recorded.
- The course transitions to `FACULTY_REVIEW`.
- AI failure does not automatically publish the course.

### 3. Faculty Review Gate - No AI Auto-Publishing

Assigned faculty can inspect AI findings through:

`GET /api/courses/faculty/reviews/{id}`

AI reports can also be retrieved through:

`GET /api/ai-reviews/course/{course_id}`

The faculty decision workflow uses:

`POST /api/courses/faculty/reviews/{id}/decision`

The AI review service transitions the course to `FACULTY_REVIEW`, not `PUBLISHED`.

Publication requires an authenticated faculty approval decision.

### 4. Consent Email Deep Links and SMTP Configuration

**Route contract:**

Consent email deep links use:

`/faculty/consent/{request_id}`

The frontend review route follows:

`/faculty/consent/$id`

**Frontend base URL:**

`FRONTEND_BASE_URL` defaults to:

`http://localhost:8080`

Whitespace and trailing slashes are normalized to avoid malformed URLs.

**Safe failure logging:**

Notification delivery failures are handled safely.

Logs are designed to avoid exposing SMTP passwords, tokens, or sensitive exception messages.

Real email delivery requires valid SMTP credentials. Automated tests use mocked SMTP behavior.

---

## 4. Local Environment Setup and Configuration

### A. Backend Environment

Run the following command from the `backend` directory:

```powershell
Copy-Item .env.example .env
```

Configure the following values in `backend/.env` as appropriate:

```env
# Frontend application URL
FRONTEND_BASE_URL=http://localhost:8080

# SMTP configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=

# Local upload storage
STORAGE_LOCAL_DIR=./storage_objects

# Maximum upload size
MAX_UPLOAD_SIZE_BYTES=524288000

# AI pipeline configuration
AI_LLM_PROVIDER=local-grounded
AI_OCR_ENABLED=true

# JWT configuration
JWT_SECRET_KEY=replace-with-a-secure-secret-of-at-least-32-characters
JWT_EXPIRE_MINUTES=1440

# Database configuration
DATABASE_URL=sqlite:///./sql_app.db
```

`STORAGE_LOCAL_DIR` is the primary local storage directory used by the storage service. Its default, when unset, is `backend/storage_objects`.

The JWT secret shown above is a placeholder. Use a secure secret for actual deployments.

Real outbound notification email requires valid SMTP credentials. SMTP credentials are not required for tests that mock email delivery.

### B. Reproducible Test Execution - Windows PowerShell

Run backend tests from the `backend` directory:

```powershell
python -m pytest -q
```

Run focused AI tests from the `backend` directory:

```powershell
python -m pytest tests/test_ai_adversarial_safety.py tests/test_ai_pipeline_and_api.py tests/test_ai_verification_e2e.py tests/test_submission_and_faculty_review.py -q
```

Run asset-path security tests from the `backend` directory:

```powershell
python -m pytest tests/test_ai_asset_path_security.py -q
```

Run frontend tests from the project root:

```powershell
npm test
```

Build the frontend from the project root:

```powershell
npm run build
```

---

## 5. Provider and Credential Blockers Analysis

| Provider / Service | Requirement | Local or Offline Behavior | Blocker |
|---|---|---|---|
| SMTP delivery | Real email delivery to faculty | Automated tests use mocked SMTP behavior | SMTP credentials required for real delivery |
| AI verification | Content extraction and factual verification | Local grounded pipeline and reference data | No external API key required for the tested local configuration |
| Media storage | Persist and retrieve uploaded course files | Local filesystem through `STORAGE_LOCAL_DIR` | Storage directory must be writable |
| Database | Persist courses, assets, and AI review jobs | Configurable database URL; SQLite supported | Database must be configured and accessible |

---

## 6. Final Verification Status

The following results were observed during verification:

- Backend: 101 tests passed.
- Frontend: 294 tests passed.
- Focused AI verification tests: 14 passed.
- Asset-path security tests: 9 passed.
- AI verification E2E tests: 6 passed.
- Frontend production build: successful.
- Automated test failures: zero.

**Combined automated test count: 395 passed.**

The focused AI, asset-path security, and E2E results are subsets of the full backend test suite and are not added again to the combined count.

The verification results establish successful automated test execution. They do not replace production deployment checks, real SMTP delivery checks, or validation of legacy production database records.

**Final status:** Automated verification passed. Final Git review, documentation integration, and PR review remain necessary before merging.
