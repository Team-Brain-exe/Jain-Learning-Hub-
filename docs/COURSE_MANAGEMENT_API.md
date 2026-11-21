# API Handoff Specification: Course Management & Faculty Review Pipeline

**Owner:** Haripriya (Backend Developer)  
**Audience:** Arya (Frontend Engineer), Aparna (Project & Auth Lead), Danwin (Learner Experience Lead), Prit (AI Validation Engineer)  
**Branch:** `feature/haripriya-course-review`  
**Base URL:** `http://localhost:8000` (or configured API host)

---

## 1. Authentication & Security Headers

All endpoints (unless marked `Public`) require standard **Bearer Token authentication** managed via Aparna's JWT module:

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

Roles supported: `student`, `faculty`, `admin`.

---

## 2. Course Authoring Pipeline (Student Creator)

### 2.1 Create Course Draft
Creates a structured course draft with embedded modules and lessons.  
**Security Gate:** Requires a valid, approved `permission_id` issued by faculty to this student. Blanket or unauthorized access is rejected with `403`.

- **Endpoint:** `POST /api/courses`
- **Role Required:** `student`
- **Request Body:**
```json
{
  "permission_id": "perm-8898144b-6ee4-4ba6-86c3-6302e1ca15b0",
  "title": "Introduction to Computer Vision",
  "description": "Comprehensive foundations of computer vision and image processing.",
  "category": "academic",
  "level": "intermediate",
  "thumbnail_url": "https://storage.jainuniversity.ac.in/assets/cv-thumbnail.jpg",
  "modules": [
    {
      "title": "Module 1: Image Processing Basics",
      "description": "Spatial filters and edge detection",
      "order_index": 1,
      "lessons": [
        {
          "title": "Lesson 1: Convolution Filters",
          "content": "Mathematical derivation of convolution kernels.",
          "duration_minutes": 25,
          "order_index": 1,
          "media_asset_id": null
        }
      ]
    }
  ]
}
```
- **Response:** `201 Created`
```json
{
  "id": "course-3103c80a-995b-4ec2-901b-90f757424ad8",
  "creator_id": "student_101",
  "permission_id": "perm-8898144b-6ee4-4ba6-86c3-6302e1ca15b0",
  "title": "Introduction to Computer Vision",
  "slug": "introduction-to-computer-vision-a1b2c3",
  "description": "Comprehensive foundations of computer vision and image processing.",
  "category": "academic",
  "level": "intermediate",
  "thumbnail_url": "https://storage.jainuniversity.ac.in/assets/cv-thumbnail.jpg",
  "status": "DRAFT",
  "faculty_reviewer_id": "fac_1",
  "review_remarks": null,
  "created_at": "2026-11-20T10:00:00Z",
  "updated_at": "2026-11-20T10:00:00Z",
  "modules": [...]
}
```

### 2.2 Update Course Draft
Student creator edits course metadata or syllabus while in `DRAFT` or `REVISION_REQUESTED` state. Locked once in review.

- **Endpoint:** `PATCH /api/courses/{id}`
- **Role Required:** `student` (course owner)
- **Request Body:**
```json
{
  "title": "Introduction to Computer Vision & Deep Learning",
  "level": "advanced",
  "description": "Updated syllabus with CNN architectures."
}
```
- **Response:** `200 OK`

### 2.3 Submit Course for Faculty Review
Transitions lifecycle: `DRAFT` $\rightarrow$ `SUBMITTED` $\rightarrow$ `AI_PROCESSING` $\rightarrow$ `FACULTY_REVIEW`. Dispatches the AI fact-checking/transcription review job.

- **Endpoint:** `POST /api/courses/{id}/submit`
- **Role Required:** `student` (course owner)
- **Response:** `200 OK`
```json
{
  "course_id": "course-3103c80a-995b-4ec2-901b-90f757424ad8",
  "status": "FACULTY_REVIEW",
  "ai_job_id": "job-f1e2d3c4-b5a6-7890",
  "message": "Course successfully submitted and processed by AI verification. Pending faculty review."
}
```

---

## 3. Media Asset Upload Pipeline

Enforces two-step signed upload sessions with server-side permission gating.

### 3.1 Request Upload URL (Initialization)
- **Endpoint:** `POST /api/uploads/request`
- **Role Required:** `student`
- **Supported File Types & Allowed MIME Types:**
  - `video`: `video/mp4`, `video/webm`, `video/quicktime` (Max 250MB)
  - `audio`: `audio/mpeg`, `audio/wav`, `audio/aac` (Max 50MB)
  - `pdf`: `application/pdf` (Max 50MB)
  - `ppt`: `application/vnd.ms-powerpoint` (Max 50MB)
  - `pptx`: `application/vnd.openxmlformats-officedocument.presentationml.presentation` (Max 50MB)
  - `docx`: `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (Max 30MB)
  - `image`: `image/jpeg`, `image/png`, `image/webp` (Max 10MB)
- **Request Body:**
```json
{
  "permission_id": "perm-8898144b-6ee4-4ba6-86c3-6302e1ca15b0",
  "course_id": "course-3103c80a-995b-4ec2-901b-90f757424ad8",
  "file_name": "lecture_01.mp4",
  "file_type": "video",
  "mime_type": "video/mp4",
  "file_size_bytes": 45000000
}
```
- **Response:** `201 Created`
```json
{
  "asset_id": "asset-99e8d7c6-5544-3322",
  "upload_url": "https://storage.jainuniversity.ac.in/signed-put/uploads/student_101/...?token=...",
  "storage_key": "uploads/student_101/perm_xxx/asset_yyy_lecture_01.mp4",
  "upload_status": "INITIALIZED",
  "expires_in_seconds": 3600
}
```

### 3.2 Finalize Upload
Re-verifies student authorization and locks storage asset reference for AI verification.

- **Endpoint:** `POST /api/uploads/finalize`
- **Role Required:** `student`
- **Request Body:**
```json
{
  "permission_id": "perm-8898144b-6ee4-4ba6-86c3-6302e1ca15b0",
  "asset_id": "asset-99e8d7c6-5544-3322"
}
```
- **Response:** `200 OK` (`upload_status`: `"FINALIZED"`)

---

## 4. Faculty Content Review & Publication Workflow

### 4.1 List Assigned Reviews
Faculty reviews all courses submitted to them.
- **Endpoint:** `GET /api/courses/faculty/reviews`
- **Role Required:** `faculty`
- **Response:** `200 OK` (Array of `CourseResponse`)

### 4.2 Inspect Course Review & AI Findings
Displays course structure, syllabus, uploaded media, and AI verification findings (transcripts, potential errors, contradictions, citations).
- **Endpoint:** `GET /api/courses/faculty/reviews/{id}`
- **Role Required:** `faculty` (assigned reviewer)
- **Response:** `200 OK`
```json
{
  "course_id": "course-3103c80a-995b-4ec2-901b-90f757424ad8",
  "title": "Introduction to Computer Vision",
  "creator_id": "student_101",
  "status": "FACULTY_REVIEW",
  "created_at": "2026-11-20T10:00:00Z",
  "latest_ai_job": {
    "id": "job-f1e2d3c4-b5a6-7890",
    "course_id": "course-3103c80a-995b-4ec2-901b-90f757424ad8",
    "status": "COMPLETED",
    "summary": "AI processing completed with 1 potential issue for faculty review.",
    "error_message": null,
    "findings": [
      {
        "id": "find-11223344",
        "asset_id": "asset-99e8d7c6-5544-3322",
        "finding_type": "POTENTIAL_ERROR",
        "severity": "medium",
        "claim": "Statement regarding Python execution model may require clarification.",
        "source_location": "timestamp: 04:32 (or slide 4)",
        "explanation": "Recommended clarifying byte-code compilation vs. pure interpreter execution.",
        "suggested_correction": "Clarify that Python compiles to bytecode (.pyc) before VM execution.",
        "requires_human_review": true
      }
    ]
  }
}
```

### 4.3 Submit Publication Decision
Faculty makes the deliberate final publication decision after evaluating AI findings. AI never publishes on its own.
- **Endpoint:** `POST /api/courses/faculty/reviews/{id}/decision`
- **Role Required:** `faculty` (assigned reviewer)
- **Allowed Decisions:**
  - `APPROVE` $\rightarrow$ Course transitions to `PUBLISHED`. Immediately becomes discoverable in public catalog (`GET /api/courses`).
  - `REJECT` $\rightarrow$ Course transitions to `REJECTED`.
  - `REQUEST_REVISION` $\rightarrow$ Course transitions to `REVISION_REQUESTED`. Unlocks the course draft for the student to revise and re-submit.
- **Request Body:**
```json
{
  "decision": "APPROVE",
  "remarks": "Excellent academic quality and clear video presentation. Approved for campus catalog."
}
```
- **Response:** `200 OK`

---

## 5. Public Course Catalog

### 5.1 Browse Catalog (Learners / Public)
- **Endpoint:** `GET /api/courses`
- **Auth:** Public (No token required)
- **Query Params:** `category` (optional, e.g. `academic` or `non-academic`)
- **Security Rule:** Strictly filters `status == 'PUBLISHED'`. Drafts and in-review courses are completely invisible.

### 5.2 Course Details
- **Endpoint:** `GET /api/courses/{id}`
- **Auth:** Authenticated user or Public for published courses. If course is `DRAFT`, access is strictly restricted to course creator or assigned faculty reviewer.

