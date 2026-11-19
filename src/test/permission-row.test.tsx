import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PermissionRow } from "@/components/consent/PermissionRow";
import type { UploadPermission } from "@/data/upload-permissions";

const base: UploadPermission = {
  id: "up-1",
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
  facultyRemarks: "Please add a learning objective.",
  createdAt: "2026-11-01T10:00:00.000Z",
  decidedAt: "2026-11-02T10:00:00.000Z",
  step: 6,
};

describe("PermissionRow", () => {
  it("shows title, badge, remarks and the action slot", () => {
    render(
      <ul>
        <PermissionRow permission={base} actions={<button>Resubmit</button>} />
      </ul>,
    );
    expect(screen.getByText("Campus Fest Recap")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.getByText(/Please add a learning objective/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resubmit" })).toBeInTheDocument();
  });

  it("hides remarks when not rejected", () => {
    render(
      <ul>
        <PermissionRow permission={{ ...base, status: "approved" }} />
      </ul>,
    );
    expect(screen.queryByText(/Faculty remarks/)).not.toBeInTheDocument();
  });
});
