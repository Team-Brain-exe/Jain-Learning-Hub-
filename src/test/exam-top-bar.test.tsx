import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExamTopBar } from "@/components/proctor/ExamTopBar";

const props = {
  title: "Ethics Final",
  section: "Part A",
  saveState: "saved" as const,
  counted: 0,
  max: 3,
  secondsLeft: 600,
  answeredPct: 40,
  onSubmit: vi.fn(),
};

describe("ExamTopBar", () => {
  it("renders the title and hides the warnings chip at zero", () => {
    render(<ExamTopBar {...props} />);
    expect(screen.getByText("Ethics Final")).toBeInTheDocument();
    expect(screen.queryByText(/warnings/)).toBeNull();
  });

  it("shows the warnings chip with full text for assistive tech", () => {
    render(<ExamTopBar {...props} counted={1} />);
    expect(screen.getByText("⚠ 1 of 3 warnings")).toBeInTheDocument();
  });

  it.each([
    ["saving", "Saving…"],
    ["saved", "Saved ✓"],
    ["error", "Not saved: don't close this tab"],
  ] as const)("announces %s state", (saveState, text) => {
    render(<ExamTopBar {...props} saveState={saveState} />);
    expect(screen.getAllByText(text).length).toBeGreaterThan(0);
  });

  it("calls onSubmit", () => {
    render(<ExamTopBar {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(props.onSubmit).toHaveBeenCalled();
  });
});
