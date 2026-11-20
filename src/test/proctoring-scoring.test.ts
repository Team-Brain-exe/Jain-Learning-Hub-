import { describe, expect, it } from "vitest";
import { isCorrect, type Quiz, type QuizQuestion } from "@/data/platform";
import {
  effectiveMinutes,
  isAnswered,
  remainingSeconds,
  scoreExam,
  seededShuffle,
} from "@/data/proctoring";

const multi: QuizQuestion = {
  id: "m",
  prompt: "p",
  options: ["a", "b", "c"],
  correct: 0,
  correctAll: [0, 2],
  type: "multi",
  section: "A",
  explanation: "e",
};
const single: QuizQuestion = {
  id: "s",
  prompt: "p",
  options: ["a", "b"],
  correct: 1,
  section: "A",
  explanation: "e",
};
const tf: QuizQuestion = {
  id: "t",
  prompt: "p",
  options: ["True", "False"],
  correct: 0,
  type: "truefalse",
  section: "A",
  explanation: "e",
};
const plain: QuizQuestion = {
  id: "n",
  prompt: "p",
  options: ["a", "b"],
  correct: 0,
  explanation: "e",
};
const quiz: Quiz = { passMark: 50, maxAttempts: 1, questions: [single, multi, tf, plain] };

describe("remainingSeconds", () => {
  it("rounds up and never goes negative", () => {
    expect(remainingSeconds(10_500, 0)).toBe(11);
    expect(remainingSeconds(5000, 5000)).toBe(0);
    expect(remainingSeconds(1000, 9000)).toBe(0);
  });
});

describe("effectiveMinutes", () => {
  it("applies the multiplier", () => {
    const cfg = { durationMinutes: 20, maxViolations: 3, requireFullscreen: true };
    expect(effectiveMinutes(cfg, 1.5)).toBe(30);
    expect(effectiveMinutes(cfg)).toBe(20);
  });
});

describe("isCorrect / isAnswered", () => {
  it("matches multi answers as an exact set", () => {
    expect(isCorrect(multi, [2, 0])).toBe(true);
    expect(isCorrect(multi, [0])).toBe(false);
    expect(isCorrect(multi, [0, 1, 2])).toBe(false);
    expect(isCorrect(multi, [])).toBe(false);
    expect(isCorrect(multi, undefined)).toBe(false);
  });
  it("treats empty arrays and undefined as unanswered", () => {
    expect(isAnswered([])).toBe(false);
    expect(isAnswered(undefined)).toBe(false);
    expect(isAnswered(0)).toBe(true);
    expect(isAnswered([1])).toBe(true);
  });
});

describe("scoreExam", () => {
  it("counts right, wrong and skipped and groups by section", () => {
    const r = scoreExam(quiz, { s: 1, m: [], t: 1 });
    expect(r).toMatchObject({ right: 1, wrong: 1, skipped: 2, total: 4, score: 25, passed: false });
    expect(Object.keys(r.sections).sort()).toEqual(["A", "Questions"]);
    expect(r.sections["A"]).toEqual({ right: 1, total: 3 });
    expect(r.sections["Questions"]).toEqual({ right: 0, total: 1 });
  });
});

describe("seededShuffle", () => {
  it("is deterministic and a permutation", () => {
    const a = seededShuffle([1, 2, 3, 4, 5], "s1");
    expect(seededShuffle([1, 2, 3, 4, 5], "s1")).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
