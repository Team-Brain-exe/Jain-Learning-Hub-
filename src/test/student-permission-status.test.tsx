import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as api from "@/lib/api-client";
import { StudentPermissionStatus } from "@/components/consent/StudentPermissionStatus";

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return { ...actual, fetchMyUploadPermissions: vi.fn(), fetchFacultyDirectory: vi.fn() };
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
  vi.resetAllMocks();
  vi.mocked(api.fetchFacultyDirectory).mockResolvedValue(faculty);
});

describe("StudentPermissionStatus", () => {
  it("shows title, faculty name, and remarks for a request", async () => {
    vi.mocked(api.fetchMyUploadPermissions).mockResolvedValue([approved]);
    render(<StudentPermissionStatus />);
    expect(await screen.findByText("Intro to Docker")).toBeTruthy();
    expect(screen.getByText(/Dr\. Ramesh Rao/)).toBeTruthy();
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
    expect(await screen.findByText(/no permission requests yet/i)).toBeTruthy();
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
});
