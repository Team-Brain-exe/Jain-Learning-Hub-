import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UploadPermissionBadge } from "@/components/consent/UploadPermissionBadge";
import type { PermissionStatus } from "@/data/upload-permissions";

const cases: [PermissionStatus, string, string][] = [
  ["pending", "Pending", "text-warning"],
  ["approved", "Approved", "text-success"],
  ["rejected", "Rejected", "text-destructive"],
];

describe("UploadPermissionBadge", () => {
  it.each(cases)("renders the %s status with its label and colour", (status, label, tone) => {
    render(<UploadPermissionBadge status={status} />);
    const badge = screen.getByText(label);
    expect(badge).toHaveClass(tone);
    expect(badge.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("merges a custom className", () => {
    render(<UploadPermissionBadge status="pending" className="ml-2" />);
    expect(screen.getByText("Pending")).toHaveClass("ml-2");
  });
});
