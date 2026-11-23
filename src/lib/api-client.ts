const API_BASE_URL = (
  import.meta.env["VITE_API_URL"] || "http://localhost:8000"
).replace(/\/+$/, "");

export const TOKEN_STORAGE_KEY = "jfet-auth-token";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: "student" | "faculty" | "admin";
  name: string;
  user_id: string;
}

export interface CurrentUserResponse {
  id: string;
  name: string;
  email: string;
  role: "student" | "faculty" | "admin";
}

// ----------------- COURSE & LEARNING TYPES -----------------

export interface BackendLesson {
  id: string;
  module_id: string;
  title: string;
  content?: string | null;
  duration_minutes: number;
  order_index: number;
  media_asset_id?: string | null;
}

export interface BackendModule {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  order_index: number;
  lessons: BackendLesson[];
}

export interface BackendCourse {
  id: string;
  creator_id: string;
  permission_id: string;
  title: string;
  slug: string;
  description?: string | null;
  category: string;
  level: string;
  thumbnail_url?: string | null;
  status: string;
  faculty_reviewer_id?: string | null;
  review_remarks?: string | null;
  created_at: string;
  updated_at: string;
  modules: BackendModule[];
}

export interface BackendEnrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at?: string | null;
}

export interface BackendCourseProgress {
  course_id: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percentage: number;
  is_course_completed: boolean;
  completed_lesson_ids: string[];
  is_quiz_passed: boolean;
}

export interface BackendLessonProgress {
  id: string;
  student_id: string;
  lesson_id: string;
  is_completed: boolean;
  completed_at?: string | null;
}

export interface BackendQuizQuestion {
  id: string;
  question_text: string;
  options: string[];
  order_index: number;
}

export interface BackendQuiz {
  id: string;
  course_id: string;
  title: string;
  passing_score_percentage: number;
  questions: BackendQuizQuestion[];
}

export interface BackendQuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  passed: boolean;
  passing_score_percentage: number;
  attempted_at: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const effectiveToken = token !== undefined ? token : getStoredToken();
  if (effectiveToken) {
    headers.set("Authorization", `Bearer ${effectiveToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const data: unknown = await response.json();

      if (data && typeof data === "object" && "detail" in data) {
        const detail = data.detail;
        if (typeof detail === "string") message = detail;
      }
    } catch {
      // Use the default error message.
    }

    if (response.status === 401 && effectiveToken) {
      setStoredToken(null);
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function loginWithPassword(email: string, password: string) {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function fetchCurrentUser(token?: string) {
  return apiRequest<CurrentUserResponse>(
    "/api/auth/me",
    { method: "GET" },
    token,
  );
}

export function logoutUser() {
  setStoredToken(null);
}

// ----------------- PHASE 2 API METHODS -----------------

export function fetchCourses(category?: string) {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiRequest<BackendCourse[]>(`/api/courses${query}`, { method: "GET" });
}

export function fetchCourseById(id: string) {
  return apiRequest<BackendCourse>(`/api/courses/${encodeURIComponent(id)}`, { method: "GET" });
}

export function fetchMyEnrollments() {
  return apiRequest<BackendEnrollment[]>("/api/enrollments/me", { method: "GET" });
}

export function checkCourseEnrollment(courseId: string) {
  return apiRequest<BackendEnrollment>(
    `/api/courses/${encodeURIComponent(courseId)}/enrollment`,
    { method: "GET" },
  );
}

export function enrollInCourse(courseId: string) {
  return apiRequest<BackendEnrollment>(
    `/api/courses/${encodeURIComponent(courseId)}/enroll`,
    { method: "POST" },
  );
}

export function fetchCourseProgress(courseId: string) {
  return apiRequest<BackendCourseProgress>(
    `/api/courses/${encodeURIComponent(courseId)}/progress`,
    { method: "GET" },
  );
}

export function recordLessonProgress(lessonId: string, isCompleted: boolean) {
  return apiRequest<BackendLessonProgress>(
    `/api/lessons/${encodeURIComponent(lessonId)}/progress`,
    {
      method: "POST",
      body: JSON.stringify({ is_completed: isCompleted }),
    },
  );
}

export function fetchCourseQuiz(courseId: string) {
  return apiRequest<BackendQuiz>(
    `/api/courses/${encodeURIComponent(courseId)}/quiz`,
    { method: "GET" },
  );
}

export function fetchQuizAttempts(quizId: string) {
  return apiRequest<BackendQuizAttempt[]>(
    `/api/quizzes/${encodeURIComponent(quizId)}/attempts`,
    { method: "GET" },
  );
}

export function submitQuizAttempt(quizId: string, answers: Record<string, number>) {
  return apiRequest<BackendQuizAttempt>(
    `/api/quizzes/${encodeURIComponent(quizId)}/attempts`,
    {
      method: "POST",
      body: JSON.stringify({ answers }),
    },
  );
}

// ----------------- PHASE 3: FACULTY CONSENT & REVIEW TYPES -----------------

export interface FacultyDirectoryItem {
  id: string;
  name: string;
  email: string;
  department: string;
  is_active: boolean;
}

export interface UploadPermissionRequest {
  faculty_id: string;
  title: string;
  content_type: string;
  format: string;
  description?: string;
  consent_declared: boolean;
}

export interface UploadPermissionResponse {
  id: string;
  student_id: string;
  faculty_id: string;
  title: string;
  content_type: string;
  format: string;
  description?: string | null;
  consent_declared: boolean;
  consent_declared_at: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  remarks?: string | null;
  decision_timestamp?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FacultyDecisionPayload {
  decision: "APPROVED" | "REJECTED";
  remarks: string;
}

export interface CourseSubmissionResponse {
  course_id: string;
  status: string;
  ai_job_id: string;
  message: string;
}

export interface FacultyReviewDetail {
  course_id: string;
  title: string;
  creator_id: string;
  status: string;
  created_at: string;
  latest_ai_job?: {
    id: string;
    course_id: string;
    status: string;
    score?: number | null;
    summary?: string | null;
    findings?: {
      id: string;
      severity: string;
      category: string;
      message: string;
      suggestion?: string | null;
    }[];
  } | null;
}

export interface FacultyPublicationDecisionPayload {
  decision: "APPROVE" | "REJECT" | "REQUEST_REVISION";
  remarks?: string;
}

// ----------------- PHASE 3 API METHODS -----------------

export function fetchFacultyDirectory() {
  return apiRequest<FacultyDirectoryItem[]>("/api/faculty/directory", { method: "GET" });
}

export function createUploadPermission(payload: UploadPermissionRequest) {
  return apiRequest<UploadPermissionResponse>("/api/upload-permissions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchMyUploadPermissions() {
  return apiRequest<UploadPermissionResponse[]>("/api/upload-permissions/me", { method: "GET" });
}

export function fetchFacultyAssignedPermissions() {
  return apiRequest<UploadPermissionResponse[]>("/api/faculty/upload-permissions", { method: "GET" });
}

export function fetchFacultyPermissionDetail(id: string) {
  return apiRequest<UploadPermissionResponse>(
    `/api/faculty/upload-permissions/${encodeURIComponent(id)}`,
    { method: "GET" },
  );
}

export function submitFacultyPermissionDecision(id: string, payload: FacultyDecisionPayload) {
  return apiRequest<UploadPermissionResponse>(
    `/api/faculty/upload-permissions/${encodeURIComponent(id)}/decision`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function submitCourseForReview(courseId: string) {
  return apiRequest<CourseSubmissionResponse>(
    `/api/courses/${encodeURIComponent(courseId)}/submit`,
    { method: "POST" },
  );
}

export function fetchFacultyCourseReviews() {
  return apiRequest<BackendCourse[]>("/api/courses/faculty/reviews", { method: "GET" });
}

export function fetchFacultyCourseReviewDetail(courseId: string) {
  return apiRequest<FacultyReviewDetail>(
    `/api/courses/faculty/reviews/${encodeURIComponent(courseId)}`,
    { method: "GET" },
  );
}

export function submitFacultyPublicationDecision(
  courseId: string,
  payload: FacultyPublicationDecisionPayload,
) {
  return apiRequest<BackendCourse>(
    `/api/courses/faculty/reviews/${encodeURIComponent(courseId)}/decision`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

// ----------------- PHASE 4: CERTIFICATE TYPES -----------------

export interface BackendCertificate {
  id: string;
  certificate_code: string;
  course_id: string;
  recipient_id: string;
  recipient_name: string;
  course_title: string;
  certificate_type: "COURSE_COMPLETION" | "PEER_EDUCATOR";
  issued_at: string;
  verification_url?: string;
}

export interface CertificateEligibility {
  course_id: string;
  is_enrolled: boolean;
  total_lessons: number;
  completed_lessons: number;
  lessons_completed: boolean;
  has_quiz: boolean;
  quiz_passed: boolean;
  is_eligible_for_completion_cert: boolean;
  is_eligible_for_peer_educator_cert: boolean;
  existing_completion_certificate_code?: string | null;
  existing_peer_educator_certificate_code?: string | null;
}

export interface CertificateIssuePayload {
  recipient_id: string;
  course_id: string;
  certificate_type: "COURSE_COMPLETION" | "PEER_EDUCATOR";
}

export interface CertificatePublicVerification {
  is_valid: boolean;
  certificate_code: string;
  recipient_name: string;
  course_title: string;
  certificate_type: string;
  issued_at: string;
}

// ----------------- PHASE 4 API METHODS -----------------

export function fetchMyCertificates() {
  return apiRequest<BackendCertificate[]>("/api/certificates/me", { method: "GET" });
}

export function fetchCertificateEligibility(courseId: string) {
  return apiRequest<CertificateEligibility>(
    `/api/courses/${encodeURIComponent(courseId)}/certificate-eligibility`,
    { method: "GET" },
  );
}

export function issueCertificate(payload: CertificateIssuePayload) {
  return apiRequest<BackendCertificate>("/api/admin/certificates/issue", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyCertificateByCode(certificateCode: string) {
  return apiRequest<CertificatePublicVerification>(
    `/api/certificates/verify/${encodeURIComponent(certificateCode)}`,
    { method: "GET" },
  );
}
