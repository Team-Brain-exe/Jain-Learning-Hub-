import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConsentStepper } from "@/components/consent/ConsentStepper";
import { ProceedToUploadButton } from "@/components/consent/ProceedToUploadButton";
import { RejectedRequestCard } from "@/components/consent/RejectedRequestCard";
import { fmtDate, fmtDateTime } from "@/components/studio/ui";
import type { UploadPermission } from "@/data/upload-permissions";

const rejected: UploadPermission = {
  id: "up-x",
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
  createdAt: "2026-11-18T10:00:00.000Z",
  decidedAt: "2026-11-19T10:00:00.000Z",
  step: 6,
};

describe("#18 dates are the same on server and client", () => {
  it("formats with a fixed locale and time zone", () => {
    expect(fmtDate("2026-11-19T10:00:00.000Z")).toBe("19 Nov 2026");
    // 10:00 UTC is 15:30 in India, whatever the runtime's own time zone is.
    expect(fmtDateTime("2026-11-19T10:00:00.000Z")).toMatch(/^19 Nov, 0?3:30\s?pm$/i);
  });

  it("still shows a dash for a missing date", () => {
    expect(fmtDate(undefined)).toBe("—");
  });
});

describe("#19 rejected card is not an alert", () => {
  it("renders as a labelled region, not role=alert", () => {
    render(<RejectedRequestCard permission={rejected} onReviseRequest={vi.fn()} />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("region", { name: "Campus Fest Recap" })).toBeInTheDocument();
  });
});

describe("#20 text contrast", () => {
  it("Faculty actor chip text uses the foreground colour, not text-warning", () => {
    render(<ConsentStepper currentStep={4} />);
    const chip = screen.getAllByText("Faculty")[0]!;
    expect(chip.className).not.toMatch(/\btext-warning\b/);
    expect(chip.className).toMatch(/\btext-foreground\b/);
  });

  it("revise button text is not text-destructive", () => {
    render(<RejectedRequestCard permission={rejected} onReviseRequest={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Submit revised request" });
    expect(button.className).not.toMatch(/(^|\s)text-destructive(\s|$)/);
  });
});

describe("#21 stepper", () => {
  it.each([
    [0, 1],
    [-3, 1],
    [11, 10],
    [99, 10],
  ])("clamps currentStep %i so step %i is current", (given, expected) => {
    render(<ConsentStepper currentStep={given} />);
    const current = screen
      .getAllByRole("listitem")
      .filter((li) => li.getAttribute("aria-current") === "step");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent(`Step ${expected} current:`);
  });

  it("shows a scroll cue for the wide layout", () => {
    render(<ConsentStepper currentStep={4} />);
    expect(screen.getByTestId("stepper-scroll-cue")).toHaveAttribute("aria-hidden", "true");
  });

  it("scrolls only the list (never the page) to the current step when it overflows", () => {
    const pageScroll = vi.fn();
    const listScroll = vi.fn();
    const origIntoView = Element.prototype.scrollIntoView;
    const origScrollTo = Element.prototype.scrollTo;
    Element.prototype.scrollIntoView = pageScroll;
    Element.prototype.scrollTo = listScroll as unknown as typeof Element.prototype.scrollTo;
    const sw = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(1800);
    const cw = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000);
    try {
      render(<ConsentStepper currentStep={8} />);
      expect(listScroll).toHaveBeenCalled();
      expect(pageScroll).not.toHaveBeenCalled();
    } finally {
      Element.prototype.scrollIntoView = origIntoView;
      Element.prototype.scrollTo = origScrollTo;
      sw.mockRestore();
      cw.mockRestore();
    }
  });
});

describe("#22 locked hint is announced once", () => {
  it("focus opens the tooltip but the wrapper is described only by the visible hint", () => {
    render(<ProceedToUploadButton status="pending" onProceed={vi.fn()} />);
    const wrapper = screen.getByText("Proceed to Upload").closest("span[tabindex]") as HTMLElement;
    fireEvent.focus(wrapper);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Waiting for faculty approval.");
    const ids = (wrapper.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
    expect(ids).toHaveLength(1);
    expect(document.getElementById(ids[0]!)).toHaveTextContent("Waiting for faculty approval.");
    fireEvent.blur(wrapper);
  });

  it("hover also opens the tooltip", () => {
    render(<ProceedToUploadButton status="rejected" onProceed={vi.fn()} />);
    const wrapper = screen.getByText("Proceed to Upload").closest("span[tabindex]") as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    expect(within(document.body).getByRole("tooltip")).toHaveTextContent(
      "Your request was rejected. Submit a revised request.",
    );
  });
});
