import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as api from "@/lib/api-client";
import * as auth from "@/hooks/use-auth";
import { StudentPermissionStatus } from "@/components/consent/StudentPermissionStatus";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
  }: {
    to: string;
    children: import("react").ReactNode;
  }) => <a href={to}>{children}</a>,
}));

vi.mock("@/hooks/use-auth", () => ({
  initializeAuth: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    fetchMyUploadPermissions: vi.fn(),
    fetchFacultyDirectory: vi.fn(),
    createUploadPermission: vi.fn(),
  };
});

const approved: api.UploadPermissionResponse = {
  id: "perm-1",
  student_id: "student_test_001",
  faculty_id: "fac_cs_01",
  title: "Intro to Docker",
  content_type: "video",
  format: "video",
  description: null,
  consent_declared: true,
  consent_declared_at: "2026-11-20T10:00:00Z",
  status: "APPROVED",
  remarks: "Good work",
  decision_timestamp: "2026-11-21T09:00:00Z",
  created_at: "2026-11-20T10:00:00Z",
  updated_at: "2026-11-21T09:00:00Z",
};

const faculty: api.FacultyDirectoryItem[] = [
  {
    id: "fac_cs_01",
    name: "Dr. Ramesh Rao",
    email: "ramesh.rao@jainuniversity.ac.in",
    department: "CSE",
    is_active: true,
  },
];

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(auth.initializeAuth).mockResolvedValue(null);

  vi.mocked(auth.useAuth).mockReturnValue({
    user: {
      id: "student_test_001",
      role: "learner",
    },
    role: "learner",
    token: "test-student-token",
    isSignedIn: true,
  } as ReturnType<typeof auth.useAuth>);

  vi.mocked(api.fetchFacultyDirectory).mockResolvedValue(faculty);
  vi.mocked(api.fetchMyUploadPermissions).mockResolvedValue([]);
  vi.mocked(api.createUploadPermission).mockResolvedValue(approved);
});

describe("StudentPermissionStatus", () => {
  it("shows title, faculty name, and remarks for a request", async () => {
    vi.mocked(api.fetchMyUploadPermissions).mockResolvedValue([approved]);

    render(<StudentPermissionStatus />);

    expect(await screen.findByText("Intro to Docker")).toBeTruthy();
    expect(
      screen.getByText(/Faculty:\s*Dr\. Ramesh Rao/),
    ).toBeTruthy();
    expect(screen.getByText(/Good work/)).toBeTruthy();
  });

  it("falls back to the faculty ID when the name is not in the directory", async () => {
    vi.mocked(api.fetchFacultyDirectory).mockResolvedValue([]);
    vi.mocked(api.fetchMyUploadPermissions).mockResolvedValue([approved]);

    render(<StudentPermissionStatus />);

    expect(await screen.findByText(/fac_cs_01/)).toBeTruthy();
  });

  it("shows the empty state when there are no requests", async () => {
    vi.mocked(api.fetchMyUploadPermissions).mockResolvedValue([]);

    render(<StudentPermissionStatus />);

    expect(
      await screen.findByText(/no permission requests yet/i),
    ).toBeTruthy();
  });

  it("shows an error and retries when Try again is clicked", async () => {
    vi.mocked(api.fetchMyUploadPermissions)
      .mockRejectedValueOnce(new Error("Network down"))
      .mockResolvedValueOnce([approved]);

    render(<StudentPermissionStatus />);

    expect(await screen.findByText("Network down")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByText("Intro to Docker")).toBeTruthy();
  });

  it("does not fetch permission requests when signed out", async () => {
    vi.mocked(auth.useAuth).mockReturnValue({
      user: null,
      role: "learner",
      token: null,
      isSignedIn: false,
    } as ReturnType<typeof auth.useAuth>);

    render(<StudentPermissionStatus />);

    expect(
      await screen.findByText(/sign in with your backend student account to view/i),
    ).toBeTruthy();

    expect(api.fetchMyUploadPermissions).not.toHaveBeenCalled();
    expect(api.fetchFacultyDirectory).not.toHaveBeenCalled();
    expect(screen.queryByText(/no permission requests yet/i)).toBeNull();
  });

  it("does not fetch permission requests for a non-student role", async () => {
    vi.mocked(auth.useAuth).mockReturnValue({
      user: {
        id: "faculty_test_001",
        role: "reviewer",
      },
      role: "reviewer",
      token: "test-faculty-token",
      isSignedIn: true,
    } as ReturnType<typeof auth.useAuth>);

    render(<StudentPermissionStatus />);

    expect(
      await screen.findByText(/permission requests are available only to student accounts/i),
    ).toBeTruthy();

    expect(api.fetchMyUploadPermissions).not.toHaveBeenCalled();
    expect(api.fetchFacultyDirectory).not.toHaveBeenCalled();
    expect(screen.queryByText(/no permission requests yet/i)).toBeNull();
  });
});
