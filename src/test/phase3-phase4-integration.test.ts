import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  fetchFacultyDirectory,
  createUploadPermission,
  fetchMyUploadPermissions,
  fetchFacultyAssignedPermissions,
  fetchFacultyPermissionDetail,
  submitFacultyPermissionDecision,
  submitCourseForReview,
  fetchFacultyCourseReviews,
  fetchFacultyCourseReviewDetail,
  submitFacultyPublicationDecision,
  fetchMyCertificates,
  fetchCertificateEligibility,
  issueCertificate,
  verifyCertificateByCode,
  setStoredToken,
} from "@/lib/api-client";

describe("Phase 3 & 4: Faculty consent, review & certificates integration", () => {
  beforeEach(() => {
    localStorage.clear();
    setStoredToken("test-auth-token");
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setStoredToken(null);
    vi.restoreAllMocks();
  });

  describe("Phase 3: Faculty Consent API adapters", () => {
    it("fetches active verified faculty from /api/faculty/directory", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        expect(String(url)).toContain("/api/faculty/directory");
        return new Response(
          JSON.stringify([
            {
              id: "fac_1",
              name: "Dr. Rao",
              email: "rao@jain.ac.in",
              department: "Computer Science",
              is_active: true,
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const directory = await fetchFacultyDirectory();
      expect(directory).toHaveLength(1);
      expect(directory[0]?.name).toBe("Dr. Rao");
      expect(directory[0]?.department).toBe("Computer Science");
    });

    it("creates an upload permission request at /api/upload-permissions", async () => {
      let requestBody: any;
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        expect(String(url)).toContain("/api/upload-permissions");
        expect(init?.method).toBe("POST");
        requestBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            id: "perm-101",
            student_id: "student_101",
            faculty_id: "fac_1",
            title: "Microservices with Go",
            content_type: "Academic Course",
            format: "Video + Code",
            consent_declared: true,
            consent_declared_at: "2026-01-01T00:00:00Z",
            status: "PENDING",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      });

      const res = await createUploadPermission({
        faculty_id: "fac_1",
        title: "Microservices with Go",
        content_type: "Academic Course",
        format: "Video + Code",
        consent_declared: true,
      });

      expect(requestBody.faculty_id).toBe("fac_1");
      expect(res.id).toBe("perm-101");
      expect(res.status).toBe("PENDING");
    });

    it("submits faculty decision on upload permission at /api/faculty/upload-permissions/:id/decision", async () => {
      let requestBody: any;
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        expect(String(url)).toContain("/api/faculty/upload-permissions/perm-101/decision");
        requestBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            id: "perm-101",
            student_id: "student_101",
            faculty_id: "fac_1",
            title: "Microservices with Go",
            content_type: "Academic Course",
            format: "Video + Code",
            consent_declared: true,
            consent_declared_at: "2026-01-01T00:00:00Z",
            status: "APPROVED",
            remarks: "Course syllabus approved.",
            decision_timestamp: "2026-01-02T00:00:00Z",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-02T00:00:00Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const res = await submitFacultyPermissionDecision("perm-101", {
        decision: "APPROVED",
        remarks: "Course syllabus approved.",
      });

      expect(requestBody.decision).toBe("APPROVED");
      expect(res.status).toBe("APPROVED");
      expect(res.remarks).toBe("Course syllabus approved.");
    });
  });

  describe("Phase 3: Faculty Review & Publication Decision adapters", () => {
    it("submits course for review at /api/courses/:id/submit", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        expect(String(url)).toContain("/api/courses/c-101/submit");
        expect(init?.method).toBe("POST");
        return new Response(
          JSON.stringify({
            course_id: "c-101",
            status: "SUBMITTED",
            ai_job_id: "job-001",
            message: "Course successfully submitted and processed by AI verification.",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const res = await submitCourseForReview("c-101");
      expect(res.course_id).toBe("c-101");
      expect(res.status).toBe("SUBMITTED");
      expect(res.ai_job_id).toBe("job-001");
    });

    it("fetches faculty review queue from /api/courses/faculty/reviews", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        expect(String(url)).toContain("/api/courses/faculty/reviews");
        return new Response(
          JSON.stringify([
            {
              id: "c-101",
              creator_id: "student_creator",
              permission_id: "perm-101",
              title: "Microservices with Go",
              slug: "microservices-with-go",
              category: "Cloud",
              level: "intermediate",
              status: "FACULTY_REVIEW",
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-02T00:00:00Z",
              modules: [],
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const reviews = await fetchFacultyCourseReviews();
      expect(reviews).toHaveLength(1);
      expect(reviews[0]?.status).toBe("FACULTY_REVIEW");
    });

    it("submits faculty publication decision at /api/courses/faculty/reviews/:id/decision", async () => {
      let requestBody: any;
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        expect(String(url)).toContain("/api/courses/faculty/reviews/c-101/decision");
        requestBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            id: "c-101",
            creator_id: "student_creator",
            permission_id: "perm-101",
            title: "Microservices with Go",
            slug: "microservices-with-go",
            category: "Cloud",
            level: "intermediate",
            status: "PUBLISHED",
            review_remarks: "Approved for publication.",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-03T00:00:00Z",
            modules: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const res = await submitFacultyPublicationDecision("c-101", {
        decision: "APPROVE",
        remarks: "Approved for publication.",
      });

      expect(requestBody.decision).toBe("APPROVE");
      expect(res.status).toBe("PUBLISHED");
      expect(res.review_remarks).toBe("Approved for publication.");
    });
  });

  describe("Phase 4: Certificates API adapters", () => {
    it("fetches student certificates from /api/certificates/me", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        expect(String(url)).toContain("/api/certificates/me");
        return new Response(
          JSON.stringify([
            {
              id: "cert-01",
              certificate_code: "CERT-JAIN-ABC12345",
              course_id: "course_pub_01",
              recipient_id: "student_101",
              recipient_name: "Aarav Sharma",
              course_title: "Distributed Systems",
              certificate_type: "COURSE_COMPLETION",
              issued_at: "2026-01-01T00:00:00Z",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const certs = await fetchMyCertificates();
      expect(certs).toHaveLength(1);
      expect(certs[0]?.certificate_code).toBe("CERT-JAIN-ABC12345");
      expect(certs[0]?.certificate_type).toBe("COURSE_COMPLETION");
    });

    it("checks certificate eligibility from /api/courses/:id/certificate-eligibility", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        expect(String(url)).toContain("/api/courses/course_pub_01/certificate-eligibility");
        return new Response(
          JSON.stringify({
            course_id: "course_pub_01",
            is_enrolled: true,
            total_lessons: 5,
            completed_lessons: 5,
            lessons_completed: true,
            has_quiz: true,
            quiz_passed: true,
            is_eligible_for_completion_cert: true,
            is_eligible_for_peer_educator_cert: false,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const el = await fetchCertificateEligibility("course_pub_01");
      expect(el.is_eligible_for_completion_cert).toBe(true);
      expect(el.lessons_completed).toBe(true);
      expect(el.quiz_passed).toBe(true);
    });

    it("verifies certificate publicly by code via /api/certificates/verify/:code", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        expect(String(url)).toContain("/api/certificates/verify/CERT-JAIN-ABC12345");
        return new Response(
          JSON.stringify({
            is_valid: true,
            certificate_code: "CERT-JAIN-ABC12345",
            recipient_name: "Aarav Sharma",
            course_title: "Distributed Systems",
            certificate_type: "COURSE_COMPLETION",
            issued_at: "2026-01-01T00:00:00Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const res = await verifyCertificateByCode("CERT-JAIN-ABC12345");
      expect(res.is_valid).toBe(true);
      expect(res.recipient_name).toBe("Aarav Sharma");
      expect(res.course_title).toBe("Distributed Systems");
    });
  });
});
