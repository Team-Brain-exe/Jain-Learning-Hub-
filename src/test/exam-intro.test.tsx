import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExamIntro } from "@/components/proctor/ExamIntro";
import type { Quiz } from "@/data/platform";

const quiz: Quiz = {
  passMark: 60,
  maxAttempts: 2,
  questions: [
    { id: "a", prompt: "A?", options: ["1", "2"], correct: 0, explanation: "", section: "Basics" },
    { id: "b", prompt: "B?", options: ["1", "2"], correct: 0, explanation: "", section: "Basics" },
    { id: "c", prompt: "C?", options: ["1", "2"], correct: 0, explanation: "", section: "Ethics" },
  ],
};

const setup = (attemptsLeft = 2) => {
  const onStart = vi.fn();
  render(
    <ExamIntro
      quiz={quiz}
      courseTitle="Jain Studies"
      attemptsLeft={attemptsLeft}
      maxAttempts={2}
      minutes={30}
      onStart={onStart}
    />,
  );
  return onStart;
};

const rules = () => screen.getByRole("checkbox", { name: /I have read and understand/ });

describe("ExamIntro", () => {
  it("shows the summary tiles", () => {
    setup();
    expect(screen.getByText(/Basics/)).toBeInTheDocument();
    expect(screen.getByText("30 min")).toBeInTheDocument();
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
  });

  it("disables Start until the rules are acknowledged, then calls onStart", () => {
    const onStart = setup();
    const start = screen.getByRole("button", { name: "Start proctored exam" });
    expect(start).toBeDisabled();
    fireEvent.click(rules());
    expect(start).toBeEnabled();
    fireEvent.click(start);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("keeps Start disabled with no attempts left", () => {
    setup(0);
    fireEvent.click(rules());
    expect(screen.getByRole("button", { name: "Start proctored exam" })).toBeDisabled();
  });
});
