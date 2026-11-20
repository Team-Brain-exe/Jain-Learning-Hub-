import { useCallback, useEffect, useRef, useState } from "react";

import type { AppUser, Quiz, QuizAttempt } from "@/data/platform";
import {
  claimTab,
  examSessions,
  finalizeExpired,
  finishExam,
  heartbeat,
  recordViolation,
  releaseTab,
  resumeExam,
  saveAnswer,
  scoreExam,
  sessionKey,
  setCurrent,
  startExam,
  toggleFlag,
  type ExamScore,
  type ExamSession,
  type ViolationType,
} from "@/data/proctoring";
import { useCountdown } from "@/hooks/use-countdown";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { useViolationDetection } from "@/hooks/use-violation-detection";

export const HEARTBEAT_MS = 5000;
export const STALE_AFTER_MS = 15000;

export type ExamPhase = "intro" | "active" | "reviewing" | "finished";
export type SaveState = "saved" | "saving" | "failed";
export interface ExamWarning {
  n: number;
  max: number;
  type: ViolationType;
  at: string;
  last: boolean;
}
export interface ExamResult {
  attempt: QuizAttempt;
  score: ExamScore;
}

export interface ExamSessionApi {
  phase: ExamPhase;
  session?: ExamSession | undefined;
  secondsLeft: number;
  /** Violations with `counted: true`. */
  counted: number;
  warning: ExamWarning | null;
  needsFullscreen: boolean;
  otherTabActive: boolean;
  saveState: SaveState;
  result: ExamResult | null;
  /** Set when finishing was refused (e.g. attempts used up in another tab). */
  error: string | null;
  start(): Promise<void>;
  answer(qid: string, a: number | number[] | undefined): void;
  flag(qid: string): void;
  go(index: number): void;
  openReview(): void;
  closeReview(): void;
  submit(): void;
  dismissWarning(): void;
  enterFullscreen(): Promise<void>;
  takeOver(): void;
}

const UNCOUNTED: ReadonlySet<ViolationType> = new Set(["fullscreen_unsupported", "second_tab"]);

const newTabId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `tab-${Math.random().toString(36).slice(2)}`;

const otherTabLive = (s: ExamSession | undefined, tabId: string, now: number): boolean =>
  !!s && s.tabId !== tabId && now - s.lastBeat < STALE_AFTER_MS;

/**
 * The exam's state machine: intro → active ⇄ reviewing → finished. Owns the session store,
 * countdown, fullscreen, violation counting and the one-tab rule. Only for quizzes with `proctor`.
 */
export function useExamSession({
  user,
  slug,
  quiz,
}: {
  user: AppUser;
  slug: string;
  quiz: Quiz;
}): ExamSessionApi {
  const [tabId] = useState(newTabId);
  const key = sessionKey(slug, user.id);
  const session = examSessions.use()[key];
  const cfg = quiz.proctor;
  const requireFullscreen = !!cfg?.requireFullscreen;
  const maxViolations = cfg?.maxViolations ?? Number.POSITIVE_INFINITY;

  const fs = useFullscreen();
  const [result, setResult] = useState<ExamResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [warning, setWarning] = useState<ExamWarning | null>(null);
  const [fsLost, setFsLost] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [clock, setClock] = useState(() => Date.now());

  // Latest props for callbacks fired from timers/listeners.
  const latest = useRef({ user, slug, quiz, exit: fs.exit });
  useEffect(() => {
    latest.current = { user, slug, quiz, exit: fs.exit };
  });

  /** Single gate for every way an exam can end: runs `run` at most once per session. */
  const finishedRef = useRef(false);
  const settle = useCallback((run: () => QuizAttempt | string | null) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const r = run();
    if (r === null) {
      finishedRef.current = false; // nothing to finish (e.g. not expired yet)
      return;
    }
    setWarning(null);
    setReviewing(false);
    if (typeof r === "string") {
      setError(r);
    } else {
      setResult({ attempt: r, score: scoreExam(latest.current.quiz, r.answers) });
    }
    void latest.current.exit();
  }, []);

  const finish = useCallback(
    (reason?: "timeout" | "violations") =>
      settle(() => {
        const { user: u, slug: s, quiz: q } = latest.current;
        return finishExam(u, s, q, reason);
      }),
    [settle],
  );

  // Mount / identity change: close out an expired session, otherwise resume it.
  useEffect(() => {
    const { user: u, slug: s, quiz: q } = latest.current;
    settle(() => finalizeExpired(u, s, q));
    if (finishedRef.current) return;
    if (resumeExam(s, u.id, q)) setFsLost(true); // a reload always drops fullscreen
  }, [key, settle]);

  const live = !!session && !result;
  const owner = live && session.tabId === tabId;
  const otherTabActive = live && otherTabLive(session, tabId, clock);

  // Heartbeat while owning; tick the clock regardless so a dead owner goes stale.
  useEffect(() => {
    if (!live) return;
    if (owner) heartbeat(key, tabId);
    const id = setInterval(() => {
      if (owner) heartbeat(key, tabId);
      setClock(Date.now());
    }, HEARTBEAT_MS);
    const onPageHide = () => releaseTab(key, tabId);
    if (owner) window.addEventListener("pagehide", onPageHide);
    return () => {
      clearInterval(id);
      if (owner) {
        window.removeEventListener("pagehide", onPageHide);
        releaseTab(key, tabId); // no-op if another tab already took over
      }
    };
  }, [live, owner, key, tabId]);

  // Silently adopt a session whose owner is gone (reload, closed tab, crashed tab).
  const ownerGone = live && !owner && !otherTabActive;
  useEffect(() => {
    if (ownerGone) claimTab(key, tabId);
  }, [ownerGone, key, tabId]);

  const { secondsLeft } = useCountdown(live ? session.deadlineMs : null, () => finish("timeout"));

  const onViolation = useCallback(
    (type: ViolationType) => {
      if (finishedRef.current) return;
      const cur = examSessions.get()[key];
      if (!cur) return;
      const counted = !UNCOUNTED.has(type);
      const at = new Date().toISOString();
      recordViolation(key, { type, at, counted });
      if (type === "fullscreen_exit" && requireFullscreen) setFsLost(true);
      if (!counted) return;
      const n = cur.violations.filter((v) => v.counted).length + 1;
      if (n >= maxViolations) {
        finish("violations");
        return;
      }
      setWarning({ n, max: maxViolations, type, at, last: n === maxViolations - 1 });
    },
    [key, requireFullscreen, maxViolations, finish],
  );

  useViolationDetection({
    active: owner && !otherTabActive,
    watchFullscreen: requireFullscreen && fs.supported,
    onViolation,
  });

  // Entering fullscreen by any route clears the overlay.
  useEffect(() => {
    if (fs.isFullscreen) setFsLost(false);
  }, [fs.isFullscreen]);

  const start = useCallback(async (): Promise<void> => {
    // Must run before any await: browsers only grant fullscreen inside the click's gesture.
    const entering = requireFullscreen ? fs.enter() : null;
    finishedRef.current = false;
    setResult(null);
    setError(null);
    setWarning(null);
    setReviewing(false);
    setFsLost(false);
    const { user: u, slug: s, quiz: q } = latest.current;
    startExam(u, s, q, tabId);
    if (requireFullscreen && !fs.supported) {
      recordViolation(key, {
        type: "fullscreen_unsupported",
        at: new Date().toISOString(),
        counted: false,
      });
    }
    setClock(Date.now());
    if (entering && !(await entering) && fs.supported) setFsLost(true);
  }, [requireFullscreen, fs, key, tabId]);

  const answer = useCallback(
    (qid: string, a: number | number[] | undefined) => {
      setSaveState("saving");
      setSaveState(saveAnswer(key, qid, a) ? "saved" : "failed");
    },
    [key],
  );

  const enterFullscreen = useCallback(async (): Promise<void> => {
    if (await fs.enter()) setFsLost(false);
  }, [fs]);

  const takeOver = useCallback(() => {
    if (!examSessions.get()[key]) return;
    claimTab(key, tabId);
    recordViolation(key, { type: "second_tab", at: new Date().toISOString(), counted: false });
    setClock(Date.now());
  }, [key, tabId]);

  const phase: ExamPhase = result
    ? "finished"
    : session
      ? reviewing
        ? "reviewing"
        : "active"
      : "intro";

  return {
    phase,
    session,
    secondsLeft,
    counted: session ? session.violations.filter((v) => v.counted).length : 0,
    warning,
    needsFullscreen: live && fsLost && requireFullscreen && fs.supported,
    otherTabActive,
    saveState,
    result,
    error,
    start,
    answer,
    flag: useCallback((qid: string) => toggleFlag(key, qid), [key]),
    go: useCallback((index: number) => setCurrent(key, index), [key]),
    openReview: useCallback(() => setReviewing(true), []),
    closeReview: useCallback(() => setReviewing(false), []),
    submit: useCallback(() => finish(), [finish]),
    dismissWarning: useCallback(() => setWarning(null), []),
    enterFullscreen,
    takeOver,
  };
}
