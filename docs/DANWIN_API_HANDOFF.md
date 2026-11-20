# Backend API Handoff — Learning, Quizzes & Certificates

**Author:** Danwin (Backend Developer — Enrollment, Learning, Quizzes & Certificates)  
**Target Audience:** Arya (Frontend), Aparna (Authentication & Integration)  
**Branch:** `feature/danwin-learning-certificates`

---

## 1. Authentication & Security
- **Header:** `Authorization: Bearer <access_token>`
- **Token Generation & Validation:** Uses Aparna's standard JWT issuance (`/api/auth/login`).
- **Roles:**
  - `student`: Can browse courses, enroll, track lesson progress, take quizzes, view personal certificates, and check certificate eligibility.
  - `admin`: Can issue certificates (`/api/admin/certificates/issue`).
  - Public (no auth required): `/api/certificates/verify/{code}` (for public/employer credential verification).

---

## 2. API Endpoints Overview

### A. Enrollment & Learner Tracking

#### 1. Enroll in a Course
- **URL:** `POST /api/courses/{id}/enroll`
- **Auth:** `student`
- **Behavior:** Enrolls the student in a published course. Prevents enrollment in draft or unapproved courses (returns `400 Bad Request`). Idempotent: returns `201 Created` for new enrollment, `200 OK` if already enrolled.
- **Response (`201 Created` / `200 OK`):**
```json
{
  "id": "c71a396e-fbc2-466d-8e43-8e44143a131b",
  "student_id": "student_101",
  "course_id": "course_pub_01",
  "enrolled_at": "2026-11-20T16:20:00Z",
  "completed_at": null
}
```

#### 2. Get Student's Enrollments
- **URL:** `GET /api/enrollments/me`
- **Auth:** `student`
- **Response (`200 OK`):**
```json
[
  {
    "id": "c71a396e-fbc2-466d-8e43-8e44143a131b",
    "student_id": "student_101",
    "course_id": "course_pub_01",
    "enrolled_at": "2026-11-20T16:20:00Z",
    "completed_at": null
  }
]
```

#### 3. Check Enrollment Status for Specific Course
- **URL:** `GET /api/courses/{id}/enrollment`
- **Auth:** `student`
- **Response (`200 OK` if enrolled, `404 Not Found` if not enrolled):**
```json
{
  "id": "c71a396e-fbc2-466d-8e43-8e44143a131b",
  "student_id": "student_101",
  "course_id": "course_pub_01",
  "enrolled_at": "2026-11-20T16:20:00Z",
  "completed_at": null
}
```

---

### B. Lesson Progress Tracking

#### 1. Mark Lesson Complete / Incomplete
- **URL:** `POST /api/lessons/{id}/progress`
- **Auth:** `student`
- **Security:** Verifies that the student is actively enrolled in the course (`403 Forbidden` if unenrolled).
- **Request Payload:**
```json
{
  "is_completed": true
}
```
- **Response (`200 OK`):**
```json
{
  "id": "8482b8f8-b4b0-449e-b9b7-080ca34da250",
  "student_id": "student_101",
  "lesson_id": "les_01",
  "is_completed": true,
  "completed_at": "2026-11-20T16:25:00Z"
}
```

#### 2. Get Course Progress Overview
- **URL:** `GET /api/courses/{id}/progress`
- **Auth:** `student`
- **Security:** Enforces active enrollment check (`403 Forbidden` if unenrolled).
- **Response (`200 OK`):**
```json
{
  "course_id": "course_pub_01",
  "total_lessons": 2,
  "completed_lessons": 2,
  "progress_percentage": 100.0,
  "is_course_completed": true,
  "completed_lesson_ids": ["les_01", "les_02"],
  "is_quiz_passed": true
}
```

---

### C. Quizzes & Anti-Forgery Grading

#### 1. Get Quiz for a Course
- **URL:** `GET /api/courses/{id}/quiz` or `GET /api/quizzes/{id}`
- **Auth:** `student` (or faculty/admin)
- **Security:** Students must be enrolled in the course. Correct answer indices are stripped from the response.
- **Response (`200 OK`):**
```json
{
  "id": "quiz_01",
  "course_id": "course_pub_01",
  "title": "Sorting Mastery Quiz",
  "passing_score_percentage": 70.0,
  "questions": [
    {
      "id": "q_01",
      "question_text": "What is the average time complexity of Merge Sort?",
      "options": ["O(n)", "O(n log n)", "O(n^2)", "O(1)"],
      "order_index": 1
    },
    {
      "id": "q_02",
      "question_text": "Is Merge Sort a stable sort?",
      "options": ["Yes", "No"],
      "order_index": 2
    }
  ]
}
```

#### 2. Submit Quiz Attempt
- **URL:** `POST /api/quizzes/{id}/attempts`
- **Auth:** `student`
- **Anti-Forgery Protections:**
  - Requires active enrollment (`403 Forbidden` if not enrolled).
  - Deduplicates submitted question IDs on the backend (prevents inflating score by submitting repeated answers).
  - Ignores question IDs that do not belong to the quiz.
  - Automatically syncs `enrollment.completed_at` once both quiz is passed and all required lessons are complete.
- **Request Payload:**
```json
{
  "answers": [
    {
      "question_id": "q_01",
      "selected_option_index": 1
    },
    {
      "question_id": "q_02",
      "selected_option_index": 0
    }
  ]
}
```
- **Response (`200 OK`):**
```json
{
  "id": "9d9010aa-2d06-44c5-aee0-d2c6792ba485",
  "quiz_id": "quiz_01",
  "student_id": "student_101",
  "total_questions": 2,
  "correct_answers": 2,
  "score_percentage": 100.0,
  "passed": true,
  "passing_score_percentage": 70.0,
  "attempted_at": "2026-11-20T16:30:00Z"
}
```

#### 3. View Historical Quiz Attempts
- **URL:** `GET /api/quizzes/{id}/attempts`
- **Auth:** `student`
- **Response (`200 OK`):** List of past attempts sorted latest first.

---

### D. Certificates & Verification

#### 1. Check Certificate Eligibility
- **URL:** `GET /api/courses/{id}/certificate-eligibility`
- **Auth:** `student`
- **Purpose:** Allows frontend UI to determine whether to display the "Claim Certificate" button or eligibility checkmark.
- **Response (`200 OK`):**
```json
{
  "course_id": "course_pub_01",
  "is_enrolled": true,
  "total_lessons": 2,
  "completed_lessons": 2,
  "lessons_completed": true,
  "has_quiz": true,
  "quiz_passed": true,
  "is_eligible_for_completion_cert": true,
  "is_eligible_for_peer_educator_cert": false,
  "existing_completion_certificate_code": "JAIN-COUR-A1B2C3D4",
  "existing_peer_educator_certificate_code": null
}
```

#### 2. Student View My Certificates
- **URL:** `GET /api/certificates/me`
- **Auth:** `student`
- **Response (`200 OK`):**
```json
[
  {
    "id": "f51b5c2a-a92f-410d-8524-ec1faea3df6d",
    "certificate_code": "JAIN-COUR-A1B2C3D4",
    "recipient_id": "student_101",
    "recipient_name": "Test Student",
    "certificate_type": "COURSE_COMPLETION",
    "course_id": "course_pub_01",
    "title": "Course Completion - Algorithms and Data Structures",
    "issuer_id": "admin_user",
    "is_sample": true,
    "verification_url": "https://learninghub.jainuniversity.ac.in/verify/JAIN-COUR-A1B2C3D4",
    "qr_code_data": "CERT:JAIN-COUR-A1B2C3D4|RECIPIENT:student_101|VERIFY:https://learninghub.jainuniversity.ac.in/verify/JAIN-COUR-A1B2C3D4",
    "issued_at": "2026-11-20T16:35:00Z"
  }
]
```

#### 3. Admin Issue Certificate
- **URL:** `POST /api/admin/certificates/issue`
- **Auth:** `admin`
- **Eligibility Checks Enforced:**
  - For `COURSE_COMPLETION`: Requires published course, active student enrollment, 100% lessons complete, and passing quiz score.
  - For `PEER_EDUCATOR`: Restricted to student creators whose course has been approved and published by faculty. Non-student creators or unpublished courses return `400 Bad Request`.
  - Idempotent: Re-issuing returns existing certificate with status `200 OK`.
- **Request Payload:**
```json
{
  "recipient_id": "student_101",
  "course_id": "course_pub_01",
  "certificate_type": "COURSE_COMPLETION",
  "is_sample": true
}
```
- **Response (`201 Created` / `200 OK`):** `CertificateResponse`

#### 4. Public Certificate Verification
- **URL:** `GET /api/certificates/verify/{code}`
- **Auth:** Public (None required)
- **Response (`200 OK`):**
```json
{
  "certificate_code": "JAIN-COUR-A1B2C3D4",
  "recipient_name": "Test Student",
  "certificate_type": "COURSE_COMPLETION",
  "course_title": "Algorithms and Data Structures",
  "is_valid": true,
  "is_sample": true,
  "issued_at": "2026-11-20T16:35:00Z",
  "university": "JAIN (Deemed-to-be University) - Faculty of Engineering & Technology"
}
```
- **Response on Invalid Code (`404 Not Found`):**
```json
{
  "detail": "Invalid certificate: Credential code not found in Jain FET registry."
}
```
