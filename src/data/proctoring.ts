/**
 * Proctored exam mode — types, pure helpers, the session store and its seam functions.
 * FRONTEND-ONLY DEMO LAYER: sessions live in localStorage. Each seam below maps 1:1 to a future
 * API endpoint; swap the bodies for fetch calls and the hook/components do not need to change.
 */
import {
  isCorrect,
  submitAttempt,
  type AppUser,
  type Quiz,
  type QuizAttempt,
} from "@/data/platform";
import { createStore } from "@/lib/create-store";

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
  /** Epoch ms of the owning tab's last heartbeat; 0 once released. */
  lastBeat: number;
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

/* ---------- session store (one per `${slug}:${userId}`) ---------- */

const SESSIONS_KEY = "jfet-exam-sessions-v1";
export const examSessions = createStore<Record<string, ExamSession>>(SESSIONS_KEY, () => ({}));

export const sessionKey = (slug: string, userId: string): string => `${slug}:${userId}`;

/** True when the in-memory sessions match what localStorage holds (i.e. the last write stuck). */
function persisted(): boolean {
  try {
    return localStorage.getItem(SESSIONS_KEY) === JSON.stringify(examSessions.get());
  } catch {
    return false;
  }
}

/** Applies `fn` to one session; returns false when there is no such session. */
function patch(key: string, fn: (s: ExamSession) => ExamSession): boolean {
  const cur = examSessions.get()[key];
  if (!cur) return false;
  examSessions.update((all) => ({ ...all, [key]: fn(cur) }));
  return true;
}

const identity = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

/** → GET /api/exams/:slug/session */
export const getActiveSession = (slug: string, userId: string): ExamSession | undefined =>
  examSessions.get()[sessionKey(slug, userId)];

/**
 * → POST /api/exams/:slug/session
 * Creates the session (or returns the existing one, so a double click never resets the clock).
 */
export function startExam(user: AppUser, slug: string, quiz: Quiz, tabId: string): ExamSession {
  const cfg = quiz.proctor;
  if (!cfg) throw new Error("startExam needs a quiz with proctor settings.");
  const key = sessionKey(slug, user.id);
  const existing = examSessions.get()[key];
  if (existing) return existing;

  const now = Date.now();
  const startedAt = new Date(now).toISOString();
  const seed = key + startedAt;
  const ids = quiz.questions.map((q) => q.id);
  const optionOrder: Record<string, number[]> = {};
  for (const q of quiz.questions) {
    const base = identity(q.options.length);
    // True/false keeps its natural order; shuffling two fixed labels only confuses.
    optionOrder[q.id] =
      cfg.shuffleOptions && q.type !== "truefalse" ? seededShuffle(base, `${seed}:${q.id}`) : base;
  }
  const session: ExamSession = {
    slug,
    userId: user.id,
    startedAt,
    deadlineMs: now + effectiveMinutes(cfg, user.timeMultiplier ?? 1) * 60_000,
    order: cfg.shuffleQuestions ? seededShuffle(ids, seed) : ids,
    optionOrder,
    answers: {},
    flagged: [],
    current: 0,
    violations: [],
    tabId,
    lastBeat: now,
  };
  examSessions.update((all) => ({ ...all, [key]: session }));
  return session;
}

/**
 * → PUT /api/exams/:slug/session/answers/:qid
 * `a` holds ORIGINAL option indices; undefined or [] clears the answer.
 * Returns false when the answer could not be persisted (no session, or storage blocked/full);
 * the in-memory session still holds it so the exam keeps running.
 */
export function saveAnswer(key: string, qid: string, a: number | number[] | undefined): boolean {
  const ok = patch(key, (s) => {
    const answers = { ...s.answers };
    if (a === undefined || !isAnswered(a)) delete answers[qid];
    else answers[qid] = a;
    return { ...s, answers };
  });
  return ok && persisted();
}

/** → POST /api/exams/:slug/session/flags/:qid */
export function toggleFlag(key: string, qid: string): void {
  patch(key, (s) => ({
    ...s,
    flagged: s.flagged.includes(qid) ? s.flagged.filter((x) => x !== qid) : [...s.flagged, qid],
  }));
}

/** → PATCH /api/exams/:slug/session { current } */
export function setCurrent(key: string, index: number): void {
  patch(key, (s) => ({
    ...s,
    current: Math.max(0, Math.min(Math.trunc(index), s.order.length - 1)),
  }));
}

/** → POST /api/exams/:slug/session/violations */
export function recordViolation(key: string, v: Violation): void {
  patch(key, (s) => ({ ...s, violations: [...s.violations, v] }));
}

/** → POST /api/exams/:slug/session/heartbeat — only the owning tab beats; returns ownership. */
export function heartbeat(key: string, tabId: string): boolean {
  const s = examSessions.get()[key];
  if (!s || s.tabId !== tabId) return false;
  patch(key, (x) => ({ ...x, lastBeat: Date.now() }));
  return true;
}

/** → POST /api/exams/:slug/session/claim — this tab becomes the owner. */
export function claimTab(key: string, tabId: string): void {
  patch(key, (s) => ({ ...s, tabId, lastBeat: Date.now() }));
}

/** → POST /api/exams/:slug/session/release — owner leaving (unmount/pagehide); no-op otherwise. */
export function releaseTab(key: string, tabId: string): void {
  const s = examSessions.get()[key];
  if (!s || s.tabId !== tabId) return;
  patch(key, (x) => ({ ...x, lastBeat: 0 }));
}

/**
 * → POST /api/exams/:slug/session/finish
 * Scores, records the attempt and deletes the session. Returns an error string when there is no
 * session (already finished) or the attempt was refused; the session is deleted either way, since
 * a refused attempt can never be submitted later.
 */
export function finishExam(
  user: AppUser,
  slug: string,
  quiz: Quiz,
  reason?: "timeout" | "violations",
): QuizAttempt | string {
  const key = sessionKey(slug, user.id);
  const s = examSessions.get()[key];
  if (!s) return "This exam has already been submitted.";
  const score = scoreExam(quiz, s.answers);
  const endMs = Math.min(Date.now(), s.deadlineMs);
  const meta: AttemptMeta = {
    violations: s.violations,
    timeTakenSec: Math.max(0, Math.round((endMs - Date.parse(s.startedAt)) / 1000)),
    autoSubmitted: reason !== undefined,
    ...(reason ? { autoSubmitReason: reason } : {}),
    sectionScores: score.sections,
    skipped: score.skipped,
  };
  examSessions.update((all) => {
    const next = { ...all };
    delete next[key];
    return next;
  });
  return submitAttempt(user, slug, s.answers, meta);
}

/**
 * → POST /api/exams/:slug/session/finalize
 * Closes out a session whose deadline passed while the student was away.
 */
export function finalizeExpired(
  user: AppUser,
  slug: string,
  quiz: Quiz,
  now = Date.now(),
): QuizAttempt | null {
  const s = getActiveSession(slug, user.id);
  if (!s || now <= s.deadlineMs) return null;
  const r = finishExam(user, slug, quiz, "timeout");
  return typeof r === "string" ? null : r;
}

/**
 * Fits a session to the quiz as it is now (it may have been edited mid-session): drops unknown
 * question ids (with their answers/flags), appends new ones, repairs invalid option orders.
 */
export function reconcileOrder(session: ExamSession, quiz: Quiz): ExamSession {
  const byId = new Map(quiz.questions.map((q) => [q.id, q]));
  const kept = session.order.filter((id) => byId.has(id));
  const order = [...kept, ...quiz.questions.map((q) => q.id).filter((id) => !kept.includes(id))];
  const optionOrder: Record<string, number[]> = {};
  const answers: Record<string, number | number[]> = {};
  for (const id of order) {
    const q = byId.get(id)!;
    const n = q.options.length;
    const prev = session.optionOrder[id];
    const valid =
      prev !== undefined &&
      prev.length === n &&
      [...prev].sort((a, b) => a - b).every((v, i) => v === i);
    optionOrder[id] = valid ? prev : identity(n);
    const a = session.answers[id];
    if (a !== undefined) answers[id] = a;
  }
  return {
    ...session,
    order,
    optionOrder,
    answers,
    flagged: session.flagged.filter((id) => byId.has(id)),
    current: Math.max(0, Math.min(session.current, order.length - 1)),
  };
}

/**
 * → GET /api/exams/:slug/session (resume)
 * Returns the session fitted to the current quiz, persisting the fix when anything changed.
 */
export function resumeExam(slug: string, userId: string, quiz: Quiz): ExamSession | undefined {
  const key = sessionKey(slug, userId);
  const s = examSessions.get()[key];
  if (!s) return undefined;
  const r = reconcileOrder(s, quiz);
  if (JSON.stringify(r) !== JSON.stringify(s)) {
    examSessions.update((all) => ({ ...all, [key]: r }));
  }
  return r;
}
