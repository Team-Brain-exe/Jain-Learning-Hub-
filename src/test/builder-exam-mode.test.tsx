import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Submission } from "@/data/platform";

const updateSubmission = vi.fn();
vi.mock("@/data/platform", async (orig) => ({
  ...(await orig<typeof import("@/data/platform")>()),
  updateSubmission: (...a: unknown[]) => updateSubmission(...a),
}));

import { QuizTab } from "@/components/studio/Builder";
import { examModeOff, setQuestionType, toggleCorrect } from "@/lib/exam-mode";

const q = (over = {}) => ({
  id: "q1",
  prompt: "P",
  options: ["a", "b", "c", "d"],
  correct: 0,
  explanation: "",
  ...over,
});
const mk = (quiz: Record<string, unknown>) => ({ id: "s1", quiz }) as unknown as Submission;

// Harness that feeds updateSubmission patches back in as props.
function Harness({ initial }: { initial: Submission }) {
  const [sub, setSub] = useState(initial);
  updateSubmission.mockImplementation((_id: string, p: Partial<Submission>) =>
    setSub((s) => ({ ...s, ...p })),
  );
  return <QuizTab sub={sub} defaultPass={70} />;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lastQuiz = () => (updateSubmission.mock.calls.at(-1)![1] as { quiz: any }).quiz;

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
});
beforeEach(() => updateSubmission.mockReset());
afterEach(cleanup);

const proctor = { durationMinutes: 30, maxViolations: 3, requireFullscreen: true };

describe("QuizTab exam mode", () => {
  it("hides exam fields when exam mode is off", () => {
    render(<Harness initial={mk({ passMark: 70, maxAttempts: 3, questions: [q()] })} />);
    expect(screen.queryByLabelText(/Duration \(minutes\)/)).toBeNull();
    expect(screen.queryByText("Question type")).toBeNull();
  });

  it("turning exam mode on stores a proctor config and shows fields", () => {
    render(<Harness initial={mk({ passMark: 70, maxAttempts: 3, questions: [q()] })} />);
    fireEvent.click(screen.getByRole("switch", { name: "Exam mode (proctored, timed)" }));
    expect(lastQuiz().proctor).toEqual({
      durationMinutes: 30,
      maxViolations: 3,
      requireFullscreen: true,
      shuffleQuestions: false,
      shuffleOptions: false,
    });
    expect(screen.getByLabelText(/Duration \(minutes\)/)).toBeInTheDocument();
    const dur = screen.getByLabelText(/Duration \(minutes\)/);
    fireEvent.change(dur, { target: { value: "3" } });
    expect(dur).toHaveValue(3); // not clamped while typing
    fireEvent.change(dur, { target: { value: "30" } });
    fireEvent.blur(dur);
    expect(lastQuiz().proctor.durationMinutes).toBe(30);
    fireEvent.change(dur, { target: { value: "999" } });
    fireEvent.blur(dur);
    expect(lastQuiz().proctor.durationMinutes).toBe(180);
    const warn = screen.getByLabelText(/Max warnings/);
    fireEvent.change(warn, { target: { value: "0" } });
    fireEvent.keyDown(warn, { key: "Enter" });
    expect(lastQuiz().proctor.maxViolations).toBe(1);
    fireEvent.click(screen.getByRole("switch", { name: "Shuffle questions" }));
    expect(lastQuiz().proctor.shuffleQuestions).toBe(true);
  });

  it("multi: ticking options 1 and 3 stores correctAll [0,2] and correct 0; off converts to single", () => {
    render(<Harness initial={mk({ passMark: 70, maxAttempts: 3, proctor, questions: [q()] })} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Question type/ }));
    fireEvent.click(screen.getByRole("option", { name: "Multiple choice" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Option 3 is correct" }));
    expect(lastQuiz().questions[0]).toMatchObject({
      type: "multi",
      correctAll: [0, 2],
      correct: 0,
    });
    fireEvent.click(screen.getByRole("switch", { name: "Exam mode (proctored, timed)" }));
    const out = lastQuiz();
    expect(out.proctor).toBeUndefined();
    expect(out.questions[0]).toMatchObject({ type: "single", correct: 0 });
    expect("correctAll" in out.questions[0]).toBe(false);
  });

  it("true/false fixes options and hides option editors", () => {
    render(<Harness initial={mk({ passMark: 70, maxAttempts: 3, proctor, questions: [q()] })} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Question type/ }));
    fireEvent.click(screen.getByRole("option", { name: "True or false" }));
    expect(lastQuiz().questions[0].options).toEqual(["True", "False"]);
    expect(screen.queryByPlaceholderText("Option 1")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "False" }));
    expect(lastQuiz().questions[0].correct).toBe(1);
  });
});

describe("QuizTab type switching", () => {
  const pick = (name: string) => {
    fireEvent.click(screen.getByRole("combobox", { name: /Question type/ }));
    fireEvent.click(screen.getByRole("option", { name }));
  };
  it("single -> true/false -> single restores the original options", () => {
    render(<Harness initial={mk({ passMark: 70, maxAttempts: 3, proctor, questions: [q()] })} />);
    pick("True or false");
    pick("Single choice");
    expect(lastQuiz().questions[0].options).toEqual(["a", "b", "c", "d"]);
  });
  it("multi -> true/false -> multi restores options; true/false -> multi gives four", () => {
    render(<Harness initial={mk({ passMark: 70, maxAttempts: 3, proctor, questions: [q()] })} />);
    pick("Multiple choice");
    pick("True or false");
    pick("Multiple choice");
    expect(lastQuiz().questions[0].options).toEqual(["a", "b", "c", "d"]);
    cleanup();
    render(
      <Harness
        initial={mk({
          passMark: 70,
          maxAttempts: 3,
          proctor,
          questions: [q({ type: "truefalse", options: ["True", "False"] })],
        })}
      />,
    );
    pick("Multiple choice");
    expect(lastQuiz().questions[0].options).toEqual(["", "", "", ""]);
  });
  it("section input stores its value and clears to undefined", () => {
    render(<Harness initial={mk({ passMark: 70, maxAttempts: 3, proctor, questions: [q()] })} />);
    const sec = screen.getByLabelText("Section");
    fireEvent.change(sec, { target: { value: "A · Basics" } });
    expect(lastQuiz().questions[0].section).toBe("A · Basics");
    fireEvent.change(sec, { target: { value: "" } });
    expect(lastQuiz().questions[0].section).toBeUndefined();
  });
});

describe("exam-mode helpers", () => {
  it("toggleCorrect keeps correct = first selected, 0 when empty", () => {
    const m = setQuestionType(q({ correct: 1 }), "multi");
    expect(m.correctAll).toEqual([1]);
    const e = toggleCorrect(m, 1);
    expect(e.correctAll).toEqual([]);
    expect(e.correct).toBe(0);
  });
  it("examModeOff normalises truefalse to single", () => {
    const out = examModeOff({
      passMark: 1,
      maxAttempts: 1,
      proctor: { durationMinutes: 5, maxViolations: 1, requireFullscreen: false },
      questions: [q({ type: "truefalse", options: ["True", "False"], correct: 1 })],
    });
    expect(out.questions[0]).toMatchObject({ type: "single", correct: 1 });
  });
});
