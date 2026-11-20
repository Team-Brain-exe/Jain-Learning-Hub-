import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExamEntryCard } from "@/components/proctor/ExamEntryCard";
import type { Quiz } from "@/data/platform";

const quiz: Quiz = {
  passMark: 60,
  maxAttempts: 2,
  questions: [{ id: "a", prompt: "A?", options: ["1", "2"], correct: 0, explanation: "" }],
};

const setup = (requireFullscreen?: boolean) =>
  render(
    <ExamEntryCard
      quiz={quiz}
      slug="demo"
      attemptsLeft={2}
      maxAttempts={2}
      hasActiveSession={false}
      minutes={30}
      {...(requireFullscreen === undefined ? {} : { requireFullscreen })}
    />,
  );

describe("ExamEntryCard", () => {
  it("says the exam opens in a full-screen tab when fullscreen is required", () => {
    setup();
    expect(screen.getByText(/Opens in a new full-screen tab\./)).toBeInTheDocument();
  });

  it("says it opens in a new tab when fullscreen is not required", () => {
    setup(false);
    expect(screen.getByText(/Opens in a new tab\./)).toBeInTheDocument();
    expect(screen.queryByText(/full-screen/)).not.toBeInTheDocument();
  });
});
