import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as apiClient from "@/lib/api-client";
import * as useAuthModule from "@/hooks/use-auth";

// Mock tanstack router components and hooks
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => {
    return (options: any) => {
      const Comp = options.component;
      Comp.useParams = () => ({ id: "perm-123" });
      return {
        ...options,
        useParams: () => ({ id: "perm-123" }),
      };
    };
  },
  Link: ({ children, to, params, className }: any) => (
    <a href={to} data-params={JSON.stringify(params)} className={className}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

// Mock useAuth to simulate logged-in faculty (reviewer role)
vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
  user: {
    id: "fac-1",
    email: "faculty@jainuniversity.ac.in",
    role: "reviewer",
    name: "Dr. Faculty",
  },
  token: "fake-jwt-token",
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
} as any);

describe("Faculty Consent Pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Faculty Consents Queue (src/routes/faculty.consents.tsx)", () => {
    it("renders loading state then displays list of assigned permissions", async () => {
      vi.spyOn(apiClient, "fetchFacultyAssignedPermissions").mockResolvedValueOnce([
        {
          id: "perm-1",
          courseId: "course-101",
          courseTitle: "Data Structures & Algorithms",
          studentId: "student-42",
          studentName: "Aarav Sharma",
          contentType: "PDF_DOCUMENT",
          expectedFormat: "pdf",
          description: "Chapter 1 supplementary notes",
          status: "PENDING",
          createdAt: "2026-11-20T10:00:00Z",
        },
        {
          id: "perm-2",
          courseId: "course-102",
          courseTitle: "Web Architecture",
          studentId: "student-43",
          studentName: "Priya Patel",
          contentType: "VIDEO_LECTURE",
          expectedFormat: "mp4",
          description: "Introductory module video",
          status: "APPROVED",
          createdAt: "2026-11-21T10:00:00Z",
          decidedAt: "2026-11-22T10:00:00Z",
        },
      ]);

      const { Route } = await import("@/routes/faculty.consents");
      const Component = Route.component;

      render(<Component />);

      expect(screen.getByText(/Faculty Upload Permissions & Consent/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Data Structures & Algorithms")).toBeInTheDocument();
        expect(screen.getByText("Web Architecture")).toBeInTheDocument();
        expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
        expect(screen.getByText("Priya Patel")).toBeInTheDocument();
      });
    });

    it("displays empty state when no permissions are assigned", async () => {
      vi.spyOn(apiClient, "fetchFacultyAssignedPermissions").mockResolvedValueOnce([]);

      const { Route } = await import("@/routes/faculty.consents");
      const Component = Route.component;

      render(<Component />);

      await waitFor(() => {
        expect(screen.getByText(/No assigned permission requests/i)).toBeInTheDocument();
      });
    });

    it("displays error message when API fails", async () => {
      vi.spyOn(apiClient, "fetchFacultyAssignedPermissions").mockRejectedValueOnce(
        new Error("Network connection failed")
      );

      const { Route } = await import("@/routes/faculty.consents");
      const Component = Route.component;

      render(<Component />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to load permissions/i)).toBeInTheDocument();
        expect(screen.getByText(/Network connection failed/i)).toBeInTheDocument();
      });
    });
  });

  describe("Faculty Consent Detail Review (src/routes/faculty.consent.$id.tsx)", () => {
    it("renders detail view with pending status and allows approve action", async () => {
      vi.spyOn(apiClient, "fetchFacultyPermissionDetail").mockResolvedValueOnce({
        id: "perm-123",
        courseId: "course-101",
        courseTitle: "Cloud Computing Systems",
        studentId: "student-99",
        studentName: "Neha Reddy",
        contentType: "LAB_MANUAL",
        expectedFormat: "pdf",
        description: "Hands-on Docker lab guide for students",
        status: "PENDING",
        createdAt: "2026-11-24T08:00:00Z",
        consentDeclaredAt: "2026-11-24T08:05:00Z",
      });

      const submitSpy = vi.spyOn(apiClient, "submitFacultyPermissionDecision").mockResolvedValueOnce({
        id: "perm-123",
        courseId: "course-101",
        courseTitle: "Cloud Computing Systems",
        studentId: "student-99",
        studentName: "Neha Reddy",
        contentType: "LAB_MANUAL",
        expectedFormat: "pdf",
        description: "Hands-on Docker lab guide for students",
        status: "APPROVED",
        remarks: "Looks comprehensive, approved for upload.",
        createdAt: "2026-11-24T08:00:00Z",
        decidedAt: "2026-11-24T09:00:00Z",
      });

      const { Route } = await import("@/routes/faculty.consent.$id");
      const Component = Route.component;

      render(<Component />);

      await waitFor(() => {
        expect(screen.getAllByText("Cloud Computing Systems").length).toBeGreaterThan(0);
        expect(screen.getByText("Neha Reddy")).toBeInTheDocument();
        expect(screen.getByText(/Hands-on Docker lab guide/i)).toBeInTheDocument();
      });

      const remarksInput = screen.getByLabelText(/Feedback \/ Remarks/i);
      fireEvent.change(remarksInput, { target: { value: "Looks comprehensive, approved for upload." } });

      const approveBtn = screen.getByRole("button", { name: /Approve Permission/i });
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(submitSpy).toHaveBeenCalledWith("perm-123", {
          decision: "APPROVED",
          remarks: "Looks comprehensive, approved for upload.",
        });
        expect(screen.getByText(/successfully approved/i)).toBeInTheDocument();
      });
    });

    it("requires remarks when rejecting a permission request", async () => {
      vi.spyOn(apiClient, "fetchFacultyPermissionDetail").mockResolvedValueOnce({
        id: "perm-123",
        courseId: "course-101",
        courseTitle: "Cloud Computing Systems",
        studentId: "student-99",
        studentName: "Neha Reddy",
        contentType: "LAB_MANUAL",
        expectedFormat: "pdf",
        description: "Hands-on Docker lab guide",
        status: "PENDING",
        createdAt: "2026-11-24T08:00:00Z",
      });

      const submitSpy = vi.spyOn(apiClient, "submitFacultyPermissionDecision");

      const { Route } = await import("@/routes/faculty.consent.$id");
      const Component = Route.component;

      render(<Component />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Reject Permission/i })).toBeInTheDocument();
      });

      const rejectBtn = screen.getByRole("button", { name: /Reject Permission/i });
      fireEvent.click(rejectBtn);

      expect(screen.getByText(/Please provide remarks explaining why the request was rejected/i)).toBeInTheDocument();
      expect(submitSpy).not.toHaveBeenCalled();
    });

    it("renders read-only view when request is already decided", async () => {
      vi.spyOn(apiClient, "fetchFacultyPermissionDetail").mockResolvedValueOnce({
        id: "perm-123",
        courseId: "course-101",
        courseTitle: "Cloud Computing Systems",
        studentId: "student-99",
        studentName: "Neha Reddy",
        contentType: "LAB_MANUAL",
        expectedFormat: "pdf",
        description: "Hands-on Docker lab guide",
        status: "REJECTED",
        remarks: "Needs citations and verified references.",
        createdAt: "2026-11-24T08:00:00Z",
        decidedAt: "2026-11-24T08:30:00Z",
      });

      const { Route } = await import("@/routes/faculty.consent.$id");
      const Component = Route.component;

      render(<Component />);

      await waitFor(() => {
        expect(screen.getByText("Needs citations and verified references.")).toBeInTheDocument();
        expect(screen.getByText(/This upload permission request has already been finalized/i)).toBeInTheDocument();
      });

      expect(screen.queryByRole("button", { name: /Approve Permission/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Reject Permission/i })).not.toBeInTheDocument();
    });
  });
});

