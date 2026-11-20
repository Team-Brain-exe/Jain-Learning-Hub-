/**
 * Proctored exam mode — types and pure helpers.
 * Session storage and the seam functions arrive in a later change.
 */
import { isCorrect, type Quiz } from "@/data/platform";

export type ViolationType =
  | "tab_hidden"
  | "window_blur"
  | "fullscreen_exit"
  | "copy_paste"
  | "context_menu"
  | "fullscreen_unsupported"
  | "second_tab";

export interface Violation {
  type: ViolationType;
  at: string;
  counted: boolean;
}

export interface ProctorConfig {
  durationMinutes: number;
  maxViolations: number;
  requireFullscreen: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}

export interface AttemptMeta {
  violations: Violation[];
  timeTakenSec: number;
  autoSubmitted: boolean;
  autoSubmitReason?: "timeout" | "violations";
  sectionScores?: Record<string, { right: number; total: number }>;
  skipped?: number;
}

/** One per `${slug}:${userId}`. */
export interface ExamSession {
  slug: string;
  userId: string;
  startedAt: string;
  deadlineMs: number;
  /** Question ids in display order. */
  order: string[];
  /** Display index to original index. */
  optionOrder: Record<string, number[]>;
  /** Keyed by question id; values are ORIGINAL option indices. */
  answers: Record<string, number | number[]>;
  flagged: string[];
  current: number;
  violations: Violation[];
  /** The tab that owns the session. */
  tabId: string;
}

export interface ExamScore {
  right: number;
  wrong: number;
  skipped: number;
  total: number;
  score: number;
  passed: boolean;
  sections: Record<string, { right: number; total: number }>;
}

/** Whole seconds left until the deadline, never negative. */
export const remainingSeconds = (deadlineMs: number, nowMs: number): number =>
  Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));

export const effectiveMinutes = (cfg: ProctorConfig, multiplier = 1): number =>
  cfg.durationMinutes * multiplier;

export const isAnswered = (a: number | number[] | undefined): boolean =>
  Array.isArray(a) ? a.length > 0 : a !== undefined;

export function scoreExam(quiz: Quiz, answers: Record<string, number | number[]>): ExamScore {
  let right = 0;
  let skipped = 0;
  const sections: Record<string, { right: number; total: number }> = {};
  for (const q of quiz.questions) {
    const key = q.section ?? "Questions";
    const sec = (sections[key] ??= { right: 0, total: 0 });
    sec.total += 1;
    const a = answers[q.id];
    if (!isAnswered(a)) skipped += 1;
    else if (isCorrect(q, a)) {
      right += 1;
      sec.right += 1;
    }
  }
  const total = quiz.questions.length;
  const score = total ? Math.round((right / total) * 100) : 0;
  return {
    right,
    wrong: total - right - skipped,
    skipped,
    total,
    score,
    passed: score >= quiz.passMark,
    sections,
  };
}

/** Deterministic Fisher–Yates shuffle (mulberry32 seeded from a string hash). */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  const rand = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
