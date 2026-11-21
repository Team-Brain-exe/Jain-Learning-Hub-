import type { Quiz, QuizQuestion } from "@/data/platform";

export const q = (id: string, extra: Partial<QuizQuestion> = {}): QuizQuestion => ({
  id,
  prompt: `Prompt ${id}`,
  options: ["Alpha", "Beta", "Gamma", "Delta"],
  correct: 0,
  explanation: "",
  ...extra,
});

export const quizOf = (questions: QuizQuestion[]): Quiz => ({
  passMark: 70,
  maxAttempts: 3,
  questions,
});
