import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RejectedRequestCard } from "@/components/consent/RejectedRequestCard";
import type { UploadPermission } from "@/data/upload-permissions";

const mockRejectedPermission: UploadPermission = {
  id: "up-mock-rejected",
  studentId: "u-creator",
  studentName: "Ananya Rao",
  department: "B.Tech CSE, Year 4",
  title: "Campus Fest Recap",
  category: "Non-academic",
  format: "video",
  description: "Highlights from the annual fest.",
  facultyEmail: "reviewer2@demo.jain.edu",
  consent: true,
  status: "rejected",
  facultyRemarks: "Please add a learning objective; this does not yet fit the learning-hub scope.",
  createdAt: "2026-11-20T10:00:00.000Z",
  decidedAt: "2026-11-20T12:00:00.000Z",
  step: 6,
};

describe("RejectedRequestCard", () => {
  it("renders the title, rejected badge, formatted date, and faculty remarks", () => {
    const onRevise = vi.fn();
    render(<RejectedRequestCard permission={mockRejectedPermission} onReviseRequest={onRevise} />);

    expect(screen.getByText("Campus Fest Recap")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Please add a learning objective; this does not yet fit the learning-hub scope./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The upload button stays locked until a new request is approved."),
    ).toBeInTheDocument();
  });

  it("renders fallback text when facultyRemarks is empty or missing", () => {
    const permissionWithoutRemarks: UploadPermission = {
      ...mockRejectedPermission,
      facultyRemarks: "   ",
    };

    render(<RejectedRequestCard permission={permissionWithoutRemarks} onReviseRequest={vi.fn()} />);

    expect(screen.getByText("The faculty member did not leave a reason.")).toBeInTheDocument();
  });

  it("calls onReviseRequest with the permission object when 'Submit revised request' is clicked", () => {
    const onRevise = vi.fn();
    render(<RejectedRequestCard permission={mockRejectedPermission} onReviseRequest={onRevise} />);

    const button = screen.getByRole("button", { name: "Submit revised request" });
    fireEvent.click(button);
    expect(onRevise).toHaveBeenCalledTimes(1);
    expect(onRevise).toHaveBeenCalledWith(mockRejectedPermission);
  });

  it("handles very long faculty remarks without breaking", () => {
    const longRemarks = "A".repeat(400);
    const permissionWithLongRemarks: UploadPermission = {
      ...mockRejectedPermission,
      facultyRemarks: longRemarks,
    };

    render(
      <RejectedRequestCard permission={permissionWithLongRemarks} onReviseRequest={vi.fn()} />,
    );

    expect(screen.getByText(`“${longRemarks}”`)).toBeInTheDocument();
  });
});
