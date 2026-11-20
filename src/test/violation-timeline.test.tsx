import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProctoredAttemptsTable } from "@/components/proctor/ProctoredAttemptsTable";
import { ViolationTimeline } from "@/components/proctor/ViolationTimeline";
import type { AppUser, QuizAttempt } from "@/data/platform";
import { ADMIN_TYPE_LABEL, TYPE_LABEL, type Violation } from "@/data/proctoring";
import { formatClock, formatOffset } from "@/lib/format-time";

const start = "2026-01-01T10:00:00.000Z";
const vs: Violation[] = [
  { type: "tab_hidden", at: "2026-01-01T10:00:30.000Z", counted: true },
  { type: "copy_paste", at: "2026-01-01T10:01:05.000Z", counted: false },
];

describe("ViolationTimeline", () => {
  it("renders violations in order with offsets", () => {
    render(<ViolationTimeline violations={vs} startedAt={start} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("+00:30");
    expect(items[0]).toHaveTextContent("Left the exam tab");
    expect(items[0]).toHaveTextContent(ADMIN_TYPE_LABEL.tab_hidden);
    expect(items[0]).not.toHaveTextContent(TYPE_LABEL.tab_hidden);
    expect(items[1]).toHaveTextContent("Copy/paste detected");
    expect(items[0]).toHaveTextContent("counted");
    expect(items[0]).not.toHaveTextContent("not counted");
    expect(items[1]).toHaveTextContent("+01:05");
    expect(items[1]).toHaveTextContent("not counted");
  });
  it("uses neutral, third-person wording for every type", () => {
    for (const label of Object.values(ADMIN_TYPE_LABEL)) {
      expect(label).not.toMatch(/\byou\b/i);
    }
    expect(ADMIN_TYPE_LABEL.fullscreen_unsupported).toBe("Fullscreen unavailable — warn-only");
  });
  it("shows an empty message", () => {
    render(<ViolationTimeline violations={[]} startedAt={start} />);
    expect(screen.getByText("No violations recorded.")).toBeInTheDocument();
  });
});

const users = [
  { id: "u1", name: "Ananya Rao", email: "a@x.com", role: "learner" },
  { id: "u2", name: "Ravi Shah", email: "r@x.com", role: "learner" },
] as AppUser[];
const att = (id: string, userId: string, at: string, meta?: QuizAttempt["meta"]): QuizAttempt => ({
  id,
  userId,
  slug: "nope",
  at,
  score: 80,
  passed: true,
  answers: {},
  meta,
});

describe("ProctoredAttemptsTable", () => {
  const attempts = [
    att("a1", "u1", "2026-01-01T10:10:00.000Z", {
      violations: vs,
      timeTakenSec: 600,
      autoSubmitted: false,
    }),
    att("a2", "u2", "2026-01-02T10:10:00.000Z", {
      violations: [],
      timeTakenSec: 300,
      autoSubmitted: true,
      autoSubmitReason: "timeout",
    }),
    att("a3", "u2", "2026-01-03T10:10:00.000Z"),
  ];
  it("lists only proctored attempts, newest first", () => {
    render(<ProctoredAttemptsTable attempts={attempts} users={users} />);
    expect(screen.getByText("Proctored attempts")).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Ravi Shah");
    expect(rows[0]).toHaveTextContent("Time ran out");
    expect(rows[1]).toHaveTextContent("Ananya Rao");
    expect(rows[1]).toHaveTextContent("—");
  });
  it("expands the timeline", () => {
    render(<ProctoredAttemptsTable attempts={attempts} users={users} />);
    const btn = screen.getByRole("button", { name: "Show violation timeline for Ananya Rao" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(btn).toHaveAccessibleName("Show violation timeline for Ananya Rao");
    const region = document.getElementById(btn.getAttribute("aria-controls")!)!;
    expect(within(region).getByText(/\+00:30/)).toBeInTheDocument();
  });
  it("renders a row with a corrupt date without throwing", () => {
    const bad = att("bad", "u1", "not-a-date", {
      violations: [{ type: "tab_hidden", at: "also-bad", counted: true }],
      timeTakenSec: 60,
      autoSubmitted: false,
    });
    render(<ProctoredAttemptsTable attempts={[bad]} users={users} />);
    const row = screen.getAllByRole("row")[1]!;
    expect(row.lastElementChild).toHaveTextContent(/^—$/);
    fireEvent.click(screen.getByRole("button", { name: "Show violation timeline for Ananya Rao" }));
    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("—");
    expect(item).not.toHaveTextContent("NaN");
  });
  it("shows the empty state", () => {
    render(<ProctoredAttemptsTable attempts={[att("a3", "u2", start)]} users={users} />);
    expect(screen.getByText("No proctored attempts yet.")).toBeInTheDocument();
  });
});

describe("format-time guards", () => {
  it("returns — for unparseable input instead of NaN text", () => {
    expect(formatOffset(start, "nope")).toBe("—");
    expect(formatOffset("nope", start)).toBe("—");
    expect(formatClock("nope")).toBe("—");
    expect(formatOffset(start, "2026-01-01T10:00:30.000Z")).toBe("+00:30");
  });
});
