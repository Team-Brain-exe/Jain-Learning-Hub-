import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { AnswerReview } from "@/components/proctor/AnswerReview";
import { ExamResult } from "@/components/proctor/ExamResult";
import type { ExamScore } from "@/data/proctoring";
import type { QuizAttempt } from "@/data/platform";
import { q, quizOf } from "./exam-fixtures";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

const quiz = quizOf([
  q("a", { section: "Basics", explanation: "Because A." }),
  q("b", { section: "Basics" }),
  q("c", { section: "Advanced" }),
]);
const order = ["a", "b", "c"];
const optionOrder = { a: [0, 1, 2, 3], b: [0, 1, 2, 3], c: [0, 1, 2, 3] };
const answers = { a: 0, b: 2 };

const score = (extra: Partial<ExamScore> = {}): ExamScore => ({
  right: 1,
  wrong: 1,
  skipped: 1,
  total: 3,
  score: 33,
  passed: false,
  sections: { Basics: { right: 1, total: 2 }, Advanced: { right: 0, total: 1 } },
  ...extra,
});
const attempt = (passed: boolean): QuizAttempt => ({
  id: "x",
  userId: "u",
  slug: "s",
  at: new Date().toISOString(),
  score: 33,
  passed,
  answers,
  meta: { violations: [], timeTakenSec: 60, autoSubmitted: false },
});

const renderResult = (passed: boolean, onClose = vi.fn()) =>
  render(
    <ExamResult
      quiz={quiz}
      slug="s"
      score={score({ passed })}
      attempt={attempt(passed)}
      attemptNo={2}
      order={order}
      optionOrder={optionOrder}
      answers={answers}
      onClose={onClose}
    />,
  );

describe("ExamResult", () => {
  it("shows the certificate link only when passed", () => {
    renderResult(true);
    expect(screen.getByText(/Passed/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Go to certificates/ })).toBeTruthy();
  });

  it("hides the certificate link when not passed and shows summary + fallback", () => {
    const onClose = vi.fn();
    renderResult(false, onClose);
    expect(screen.getByText("Not passed yet")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Go to certificates/ })).toBeNull();
    expect(screen.getByText("1 of 3 correct · pass mark 70% · attempt 2 of 3")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Score 33%" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Back to the course quiz page/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close tab" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("opens the answer review on demand", () => {
    renderResult(false);
    expect(screen.queryByText("Answer review")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Review answers" }));
    expect(screen.getByText("Answer review")).toBeTruthy();
  });
});

describe("AnswerReview", () => {
  it("shows chip, explanation and steps through questions", () => {
    render(<AnswerReview quiz={quiz} order={order} optionOrder={optionOrder} answers={answers} />);
    expect(screen.getByText("✓ Correct")).toBeTruthy();
    expect(screen.getByText("Because A.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByText("✕ Wrong")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByText("Skipped")).toBeTruthy();
  });

  it("disables prev/next at the ends and says Next", () => {
    render(<AnswerReview quiz={quiz} order={order} optionOrder={optionOrder} answers={answers} />);
    expect(screen.getByRole("button", { name: /Previous|Prev/ })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByRole("button", { name: /Next/ })).toHaveProperty("disabled", true);
  });

  it("highlights the correct option and marks a wrong pick", () => {
    render(<AnswerReview quiz={quiz} order={order} optionOrder={optionOrder} answers={answers} />);
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByText("Alpha").closest("label")?.className).toContain("border-success");
    expect(screen.getByLabelText("Your answer")).toBeTruthy();
    expect(screen.getByText("Gamma").closest("label")?.className).toContain("text-destructive");
  });
});
