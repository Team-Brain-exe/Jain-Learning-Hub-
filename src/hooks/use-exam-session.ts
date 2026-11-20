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

  /**
   * Single gate for every way an exam can end. Keyed by session identity (`startedAt`), so it
   * closes once per session, never per mount: a failed finish cannot block a later session.
   */
  const settledFor = useRef<string | null>(null);
  const settle = useCallback((startedAt: string, run: () => QuizAttempt | string | null) => {
    if (settledFor.current === startedAt) return;
    settledFor.current = startedAt;
    const r = run();
    if (r === null) {
      settledFor.current = null; // nothing to finish (e.g. not expired yet)
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
    (reason?: "timeout" | "violations") => {
      const cur = examSessions.get()[key];
      if (!cur) return;
      settle(cur.startedAt, () => {
        const { user: u, slug: s, quiz: q } = latest.current;
        return finishExam(u, s, q, reason);
      });
    },
    [key, settle],
  );

  // Mount / identity change: close out an expired session, otherwise resume it.
  useEffect(() => {
    const { user: u, slug: s, quiz: q } = latest.current;
    const cur = examSessions.get()[key];
    if (!cur) return;
    settle(cur.startedAt, () => finalizeExpired(u, s, q));
    if (settledFor.current === cur.startedAt) return;
    if (resumeExam(s, u.id, q)) setFsLost(true); // a reload always drops fullscreen
  }, [key, settle]);

  const live = !!session && !result;
  // Warn-only: fullscreen is unavailable or the browser refused it. Derived from the logged
  // violation so it survives reloads without a new storage field.
  const warnOnly = !!session?.violations.some((v) => v.type === "fullscreen_unsupported");
  const owner = live && session.tabId === tabId;
  const otherTabActive = live && otherTabLive(session, tabId, clock);
  const ownerRef = useRef(owner);
  useEffect(() => {
    ownerRef.current = owner;
  });

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

  // Only the owning tab submits on expiry, so two tabs never both submit. Others rely on
  // finalizeExpired and the store sync (or on becoming the owner, handled just below).
  const deadline = live ? session.deadlineMs : null;
  const { secondsLeft } = useCountdown(deadline, () => {
    if (ownerRef.current) finish("timeout");
  });
  useEffect(() => {
    if (owner && deadline !== null && Date.now() >= deadline) finish("timeout");
  }, [owner, deadline, secondsLeft, finish]);

  const onViolation = useCallback(
    (type: ViolationType) => {
      const before = examSessions.get()[key];
      if (!before || settledFor.current === before.startedAt) return;
      const counted = !UNCOUNTED.has(type);
      const at = new Date().toISOString();
      if (!recordViolation(key, { type, at, counted })) return; // past the deadline
      if (type === "fullscreen_exit" && requireFullscreen) setFsLost(true);
      if (!counted) return;
      const cur = examSessions.get()[key];
      const n = (cur ?? before).violations.filter((v) => v.counted).length;
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
    watchFullscreen: requireFullscreen && fs.supported && !warnOnly,
    onViolation,
  });

  // Entering fullscreen by any route clears the overlay.
  useEffect(() => {
    if (fs.isFullscreen) setFsLost(false);
  }, [fs.isFullscreen]);

  /** Fullscreen was refused: never block the student; log once (uncounted) and stop guarding. */
  const degradeToWarnOnly = useCallback(() => {
    const cur = examSessions.get()[key];
    if (cur && !cur.violations.some((v) => v.type === "fullscreen_unsupported")) {
      recordViolation(key, {
        type: "fullscreen_unsupported",
        at: new Date().toISOString(),
        counted: false,
      });
    }
    setFsLost(false);
  }, [key]);

  const start = useCallback(async (): Promise<void> => {
    // Must run before any await: browsers only grant fullscreen inside the click's gesture.
    const entering = requireFullscreen ? fs.enter() : null;
    setResult(null);
    setError(null);
    setWarning(null);
    setReviewing(false);
    setFsLost(false);
    const { user: u, slug: s, quiz: q } = latest.current;
    const started = startExam(u, s, q, tabId);
    if (typeof started === "string") {
      setError(started);
      if (entering) {
        void entering.then((ok) => {
          if (ok) void fs.exit();
        });
      }
      return;
    }
    // Logged once per session: a double click (or a resume) must not log it twice.
    const logged = started.violations.some((v) => v.type === "fullscreen_unsupported");
    if (!logged && requireFullscreen && !fs.supported) {
      recordViolation(key, {
        type: "fullscreen_unsupported",
        at: new Date().toISOString(),
        counted: false,
      });
    }
    setClock(Date.now());
    if (entering && !(await entering) && fs.supported) degradeToWarnOnly();
  }, [requireFullscreen, fs, key, tabId, degradeToWarnOnly]);

  const answer = useCallback(
    (qid: string, a: number | number[] | undefined) => {
      setSaveState("saving");
      setSaveState(saveAnswer(key, qid, a) ? "saved" : "failed");
    },
    [key],
  );

  const enterFullscreen = useCallback(async (): Promise<void> => {
    if (await fs.enter()) setFsLost(false);
    else if (fs.supported) degradeToWarnOnly();
  }, [fs, degradeToWarnOnly]);

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
    needsFullscreen: live && fsLost && requireFullscreen && fs.supported && !warnOnly,
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
