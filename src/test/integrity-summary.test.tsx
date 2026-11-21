import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IntegritySummary } from "@/components/proctor/IntegritySummary";
import type { AttemptMeta } from "@/data/proctoring";
import { formatDuration } from "@/lib/format-time";

const meta = (extra: Partial<AttemptMeta> = {}): AttemptMeta => ({
  violations: [],
  timeTakenSec: 1399,
  autoSubmitted: false,
  ...extra,
});

describe("formatDuration", () => {
  it("formats minutes and seconds", () => {
    expect(formatDuration(1399)).toBe("23 min 19 s");
    expect(formatDuration(45)).toBe("45 s");
  });
});

describe("IntegritySummary", () => {
  it("shows the no-issues message and nothing destructive", () => {
    const { container } = render(<IntegritySummary meta={meta()} />);
    expect(screen.getByText("No integrity issues recorded.").className).toContain("text-success");
    expect(container.querySelector(".text-destructive")).toBeNull();
    expect(screen.getByText("23 min 19 s")).toBeTruthy();
    expect(screen.getByText("By student")).toBeTruthy();
  });

  it("describes auto-submit reasons", () => {
    const { rerender } = render(
      <IntegritySummary meta={meta({ autoSubmitted: true, autoSubmitReason: "violations" })} />,
    );
    expect(screen.getByText("Auto-submitted (too many violations)")).toBeTruthy();
    rerender(
      <IntegritySummary meta={meta({ autoSubmitted: true, autoSubmitReason: "timeout" })} />,
    );
    expect(screen.getByText("Auto-submitted (time ran out)")).toBeTruthy();
  });

  it("lists all violations, marks uncounted ones, counts warnings", () => {
    const at = new Date(2026, 0, 1, 9, 5, 7).toISOString();
    render(
      <IntegritySummary
        meta={meta({
          violations: [
            { type: "tab_hidden", at, counted: true },
            { type: "window_blur", at, counted: false },
          ],
        })}
      />,
    );
    expect(
      screen.getByText(
        (_, el) => el?.tagName === "LI" && el.textContent === "09:05:07 · You left the exam tab.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === "LI" &&
          el.textContent === "09:05:07 · The exam window lost focus.(not counted)",
      ),
    ).toBeTruthy();
    expect(screen.getAllByText("(not counted)")).toHaveLength(1);
    expect(screen.getByText("1").className).toContain("text-warning");
    expect(screen.queryByText("No integrity issues recorded.")).toBeNull();
  });
});
