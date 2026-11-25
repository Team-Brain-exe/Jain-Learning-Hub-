# Backend Storage Configuration & API Contracts

## 1. Environment Configuration (`backend/.env`)

Configure the following environment variables locally (never commit `.env` or secrets):

```env
# JWT Authentication (required, >= 32 chars)
JWT_SECRET_KEY=replace-with-strong-32-char-secret
JWT_EXPIRE_MINUTES=1440

# Object Storage (Local HMAC-SHA256 Signed Storage)
STORAGE_SIGNING_SECRET=replace-with-strong-storage-signing-secret
STORAGE_LOCAL_DIR=./storage_objects
STORAGE_BASE_URL=http://localhost:8000
STORAGE_URL_EXPIRY_SECONDS=3600
```

- If `STORAGE_SIGNING_SECRET` is omitted, `StorageService` falls back to `JWT_SECRET_KEY`.
- Uploaded objects are stored under `{STORAGE_LOCAL_DIR}/uploads/{student_id}/{permission_id}/{asset_id}_{safe_filename}` with strict path-traversal and extension checks.

---

## 2. Two-Step Signed Upload Flow

1. **Initialize Upload Session (`POST /api/uploads/request`)** — Student JWT + approved `permission_id` required.
   - Validates `file_type`, `mime_type`, file extension, and `file_size_bytes` against `ALLOWED_MIME_TYPES` and `MAX_FILE_SIZE_BYTES`.
   - Returns `{ asset_id, upload_url, storage_key, upload_status: "INITIALIZED", expires_in_seconds }`.
2. **Upload Object Bytes (`PUT /api/uploads/storage/{asset_id}?expires=...&sig=...`)**
   - Verifies HMAC-SHA256 signature, expiration, `INITIALIZED` status, non-empty body, and max byte size (`413` if exceeded, `403` if invalid/expired signature).
3. **Finalize Upload (`POST /api/uploads/finalize`)** — Student JWT + matching `permission_id` required.
   - Re-verifies approved upload permission and asset ownership (`403` on mismatch).
   - Rejects duplicate finalization (`409 Conflict`).
   - Verifies actual object existence and byte size in storage; marks `FAILED` and returns `400` if missing/empty.
4. **View Finalized Object (`GET /api/uploads/storage/{asset_id}/view?expires=...&sig=...`)**
   - Verifies HMAC-SHA256 view signature and serves the finalized object.
5. **Asset Metadata (`GET /api/uploads/{asset_id}`)**
   - Accessible to the uploader, assigned course faculty reviewer, or admin (`403` otherwise).

---

## 3. Supported Formats & Size Limits

| `file_type` | Allowed Extensions | Allowed MIME Types | Max Size |
| :--- | :--- | :--- | :--- |
| `video` | `.mp4`, `.webm`, `.mov` | `video/mp4`, `video/webm`, `video/quicktime` | 250 MB |
| `audio` | `.mp3`, `.wav`, `.aac`, `.m4a` | `audio/mpeg`, `audio/wav`, `audio/aac` | 50 MB |
| `pdf` | `.pdf` | `application/pdf` | 50 MB |
| `ppt` | `.ppt` | `application/vnd.ms-powerpoint` | 50 MB |
| `pptx` | `.pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | 50 MB |
| `docx` | `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 30 MB |
| `image` | `.jpg`, `.jpeg`, `.png`, `.webp` | `image/jpeg`, `image/png`, `image/webp` | 10 MB |

---

## 4. Contract Notes for Frontend / Danwin Integration

- **`POST /api/quizzes/{id}/attempts`**: Expects `{ "answers": [{ "question_id": "<id>", "selected_option_index": 0 }] }` and validates `0 <= selected_option_index < len(options)`. Note that `src/lib/api-client.ts` currently types `submitQuizAttempt` with `Record<string, number>` — frontend callers should map that record to the array format before sending.
- **`POST /api/courses/faculty/reviews/{id}/decision`**: Requires course status in `FACULTY_REVIEW` or `SUBMITTED`, and blocks `APPROVE` while an `AIReviewJob` is still in an active processing state (`QUEUED`, `PROCESSING`, `EXTRACTING`, `VERIFYING`).
- **`GET /api/courses/{id}/certificate-eligibility` & `POST /api/admin/certificates/issue`**:
  - `COURSE_COMPLETION`: Published course + active enrollment + 100% lessons completed + quiz passed (if quiz exists).
  - `PEER_EDUCATOR`: Student creator + published course + `student` role + approved upload permission on the course.
