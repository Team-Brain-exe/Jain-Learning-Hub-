import type { Quiz, QuizQuestion } from "@/data/platform";
import type { ProctorConfig } from "@/data/proctoring";

export type QuestionType = NonNullable<QuizQuestion["type"]>;

export const DEFAULT_PROCTOR: ProctorConfig = {
  durationMinutes: 30,
  maxViolations: 3,
  requireFullscreen: true,
  shuffleQuestions: false,
  shuffleOptions: false,
};

export const clamp = (v: string, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, Number(v) || lo));

const withoutMulti = (q: QuizQuestion): QuizQuestion => {
  const { correctAll: _drop, ...rest } = q;
  return rest;
};

/** Change a question's type, keeping `correct` valid for the new shape. */
export function setQuestionType(q: QuizQuestion, type: QuestionType): QuizQuestion {
  if (type === "multi") {
    return { ...q, type, correctAll: q.correctAll?.length ? q.correctAll : [q.correct] };
  }
  const base = withoutMulti(q);
  if (type === "truefalse")
    return { ...base, type, options: ["True", "False"], correct: q.correct === 1 ? 1 : 0 };
  const options =
    q.options.length >= 4
      ? q.options
      : [...q.options, ...Array<string>(4 - q.options.length).fill("")];
  return {
    ...base,
    type,
    options,
    correct: q.type === "multi" ? (q.correctAll?.[0] ?? 0) : q.correct,
  };
}

/** Toggle option `i` as correct on a multi question; `correct` mirrors the first selected (0 if none). */
export function toggleCorrect(q: QuizQuestion, i: number): QuizQuestion {
  const cur = q.correctAll ?? [];
  const next = (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]).sort((a, b) => a - b);
  return { ...q, correctAll: next, correct: next[0] ?? 0 };
}

/** Quiz with exam mode switched off: no proctor, every question becomes plain single choice. */
export function examModeOff(quiz: Quiz): Quiz {
  const { proctor: _p, ...rest } = quiz;
  return {
    ...rest,
    questions: quiz.questions.map((q) =>
      q.type === "multi" || q.type === "truefalse" ? setQuestionType(q, "single") : q,
    ),
  };
}
