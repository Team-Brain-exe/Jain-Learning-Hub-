import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getQuiz, platform, type AppUser, type Quiz } from "@/data/platform";
import {
  claimTab,
  examSessions,
  finalizeExpired,
  finishExam,
  getActiveSession,
  heartbeat,
  NO_ATTEMPTS_LEFT,
  reconcileOrder,
  recordViolation,
  releaseTab,
  saveAnswer,
  sessionKey,
  setCurrent,
  startExam,
  toggleFlag,
  type ExamSession,
} from "@/data/proctoring";

const SLUG = "data-structures-and-algorithms";
const T0 = new Date("2026-01-01T00:00:00Z").getTime();

const user = (id: string): AppUser => {
  const u = platform.get().users.find((x) => x.id === id);
  if (!u) throw new Error(`missing user ${id}`);
  return u;
};
const quiz = (): Quiz => {
  const q = getQuiz(SLUG);
  if (!q) throw new Error("missing demo quiz");
  return q;
};

const begin = (...args: Parameters<typeof startExam>) => {
  const r = startExam(...args);
  if (typeof r === "string") throw new Error(r);
  return r;
};
const KEY = "jfet-exam-sessions-v1";
const stored = () => JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, ExamSession>;
const useAllAttempts = () =>
  platform.update((s) => ({
    ...s,
    attempts: [1, 2, 3].map((i) => ({
      id: `at-${i}`,
      userId: "u-creator",
      slug: SLUG,
      at: "x",
      score: 0,
      passed: false,
      answers: {},
    })),
  }));

describe("exam session store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    examSessions.reset();
    platform.reset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("deadline is now + 2 min, and + 3 min with a 1.5x multiplier", () => {
    const a = begin(user("u-creator"), SLUG, quiz(), "tab-a");
    expect(a.deadlineMs).toBe(T0 + 2 * 60_000);
    expect(a.startedAt).toBe(new Date(T0).toISOString());
    expect(a.lastBeat).toBe(T0);
    expect(a.tabId).toBe("tab-a");
    const b = begin(user("u-learner"), SLUG, quiz(), "tab-b");
    expect(b.deadlineMs).toBe(T0 + 3 * 60_000);
  });

  it("starting again returns the existing session instead of resetting the clock", () => {
    const a = begin(user("u-creator"), SLUG, quiz(), "tab-a");
    vi.setSystemTime(T0 + 30_000);
    const b = begin(user("u-creator"), SLUG, quiz(), "tab-b");
    expect(b.deadlineMs).toBe(a.deadlineMs);
  });

  it("shuffled order is a permutation and stable for the same key and startedAt", () => {
    const q = quiz();
    const ids = q.questions.map((x) => x.id);
    const a = begin(user("u-creator"), SLUG, q, "tab-a");
    expect([...a.order].sort()).toEqual([...ids].sort());
    for (const qq of q.questions) {
      const perm = a.optionOrder[qq.id];
      expect(perm).toBeDefined();
      expect([...(perm ?? [])].sort()).toEqual(qq.options.map((_, i) => i));
    }
    examSessions.reset();
    const b = begin(user("u-creator"), SLUG, q, "tab-a");
    expect(b.order).toEqual(a.order);
    expect(b.optionOrder).toEqual(a.optionOrder);
  });

  it("shuffles within sections only, keeping sections contiguous in quiz order", () => {
    const sec = (id: string, section?: string) => ({
      id,
      prompt: id,
      options: ["a", "b"],
      correct: 0,
      explanation: "",
      ...(section ? { section } : {}),
    });
    const q: Quiz = {
      passMark: 70,
      maxAttempts: 3,
      proctor: {
        durationMinutes: 2,
        maxViolations: 3,
        requireFullscreen: false,
        shuffleQuestions: true,
      },
      questions: [
        sec("a1", "A"),
        sec("b1", "B"),
        sec("a2", "A"),
        sec("u1"),
        sec("b2", "B"),
        sec("a3", "A"),
        sec("u2"),
        sec("b3", "B"),
        sec("a4", "A"),
      ],
    };
    const groupOf = (id: string) => q.questions.find((x) => x.id === id)?.section ?? "Questions";
    const orders: string[][] = [];
    for (let i = 0; i < 8; i++) {
      examSessions.reset();
      vi.setSystemTime(T0 + i * 1000);
      const s = begin(user("u-creator"), SLUG, q, "tab-a");
      expect([...s.order].sort()).toEqual(q.questions.map((x) => x.id).sort());
      expect(s.order.map(groupOf)).toEqual([
        ...["A", "A", "A", "A"],
        ...["B", "B", "B"],
        ...["Questions", "Questions"],
      ]);
      orders.push(s.order);
      // Same seed (key + startedAt) gives the same order.
      examSessions.reset();
      expect(begin(user("u-creator"), SLUG, q, "tab-a").order).toEqual(s.order);
    }
    // Within-section order does get shuffled for some seed.
    const grouped = ["a1", "a2", "a3", "a4", "b1", "b2", "b3", "u1", "u2"];
    expect(orders.some((o) => o.join() !== grouped.join())).toBe(true);
  });

  it("uses identity order when shuffling is off", () => {
    const base = quiz();
    const q: Quiz = {
      ...base,
      proctor: { durationMinutes: 2, maxViolations: 3, requireFullscreen: false },
    };
    const s = begin(user("u-creator"), SLUG, q, "tab-a");
    expect(s.order).toEqual(q.questions.map((x) => x.id));
    for (const qq of q.questions) {
      expect(s.optionOrder[qq.id]).toEqual(qq.options.map((_, i) => i));
    }
  });

  it("saveAnswer persists and getActiveSession returns it; undefined clears it", () => {
    const s = begin(user("u-creator"), SLUG, quiz(), "tab-a");
    const key = sessionKey(SLUG, "u-creator");
    const qid = s.order[0]!;
    expect(saveAnswer(key, qid, 2)).toBe(true);
    expect(getActiveSession(SLUG, "u-creator")?.answers[qid]).toBe(2);
    expect(saveAnswer(key, qid, undefined)).toBe(true);
    expect(getActiveSession(SLUG, "u-creator")?.answers[qid]).toBeUndefined();
    expect(saveAnswer("nope:nobody", qid, 1)).toBe(false);
  });

  it("flags, current index, violations, heartbeat and claimTab update the session", () => {
    const s = begin(user("u-creator"), SLUG, quiz(), "tab-a");
    const key = sessionKey(SLUG, "u-creator");
    const qid = s.order[1]!;
    toggleFlag(key, qid);
    expect(getActiveSession(SLUG, "u-creator")?.flagged).toEqual([qid]);
    toggleFlag(key, qid);
    expect(getActiveSession(SLUG, "u-creator")?.flagged).toEqual([]);
    setCurrent(key, 2);
    expect(getActiveSession(SLUG, "u-creator")?.current).toBe(2);
    recordViolation(key, { type: "window_blur", at: "x", counted: true });
    expect(getActiveSession(SLUG, "u-creator")?.violations).toHaveLength(1);

    vi.setSystemTime(T0 + 5000);
    expect(heartbeat(key, "tab-a")).toBe(true);
    expect(getActiveSession(SLUG, "u-creator")?.lastBeat).toBe(T0 + 5000);
    expect(heartbeat(key, "tab-b")).toBe(false);
    expect(getActiveSession(SLUG, "u-creator")?.lastBeat).toBe(T0 + 5000);

    vi.setSystemTime(T0 + 6000);
    claimTab(key, "tab-b");
    expect(getActiveSession(SLUG, "u-creator")?.tabId).toBe("tab-b");
    expect(getActiveSession(SLUG, "u-creator")?.lastBeat).toBe(T0 + 6000);

    releaseTab(key, "tab-a"); // not the owner: no-op
    expect(getActiveSession(SLUG, "u-creator")?.lastBeat).toBe(T0 + 6000);
    releaseTab(key, "tab-b");
    expect(getActiveSession(SLUG, "u-creator")?.lastBeat).toBe(0);
  });

  it("survives a cache clear (like a reload) with the same deadline", () => {
    const s = begin(user("u-creator"), SLUG, quiz(), "tab-a");
    window.dispatchEvent(new StorageEvent("storage", { key: "jfet-exam-sessions-v1" }));
    expect(getActiveSession(SLUG, "u-creator")?.deadlineMs).toBe(s.deadlineMs);
  });

  it("finishExam stores an attempt with meta and deletes the session", () => {
    const q = quiz();
    const s = begin(user("u-creator"), SLUG, q, "tab-a");
    const key = sessionKey(SLUG, "u-creator");
    const first = q.questions[0]!;
    saveAnswer(key, first.id, first.correct);
    recordViolation(key, { type: "tab_hidden", at: "x", counted: true });
    vi.setSystemTime(T0 + 45_000);
    const r = finishExam(user("u-creator"), SLUG, q, "timeout");
    if (typeof r === "string") throw new Error(r);
    expect(r.meta?.autoSubmitted).toBe(true);
    expect(r.meta?.autoSubmitReason).toBe("timeout");
    expect(r.meta?.timeTakenSec).toBe(45);
    expect(r.meta?.violations).toHaveLength(1);
    expect(r.meta?.skipped).toBe(q.questions.length - 1);
    expect(r.meta?.sectionScores).toBeDefined();
    expect(getActiveSession(SLUG, "u-creator")).toBeUndefined();
    expect(platform.get().attempts.filter((a) => a.userId === "u-creator")).toHaveLength(1);
    expect(s.slug).toBe(SLUG);
    // second call: session is gone
    expect(typeof finishExam(user("u-creator"), SLUG, q, "timeout")).toBe("string");
  });

  it("manual finishExam omits autoSubmitReason", () => {
    const q = quiz();
    startExam(user("u-creator"), SLUG, q, "tab-a");
    const r = finishExam(user("u-creator"), SLUG, q);
    if (typeof r === "string") throw new Error(r);
    expect(r.meta?.autoSubmitted).toBe(false);
    expect(r.meta && "autoSubmitReason" in r.meta).toBe(false);
  });

  it("finalizeExpired submits only after the deadline", () => {
    const q = quiz();
    const s = begin(user("u-creator"), SLUG, q, "tab-a");
    expect(finalizeExpired(user("u-creator"), SLUG, q, s.deadlineMs - 1)).toBeNull();
    expect(getActiveSession(SLUG, "u-creator")).toBeDefined();
    const r = finalizeExpired(user("u-creator"), SLUG, q, s.deadlineMs + 1);
    expect(r?.meta?.autoSubmitReason).toBe("timeout");
    expect(getActiveSession(SLUG, "u-creator")).toBeUndefined();
    expect(finalizeExpired(user("u-creator"), SLUG, q, s.deadlineMs + 1)).toBeNull();
  });

  it("reconcileOrder drops unknown ids and appends new ones", () => {
    const q = quiz();
    const s = begin(user("u-creator"), SLUG, q, "tab-a");
    const [a, b] = s.order;
    const stale = {
      ...s,
      order: [a!, "gone", b!],
      optionOrder: { [a!]: [0, 1, 2, 3], gone: [1, 0] },
      answers: { gone: 1, [a!]: 0 },
      flagged: ["gone", a!],
      current: 9,
    };
    const edited: Quiz = {
      ...q,
      questions: [
        q.questions.find((x) => x.id === a)!,
        q.questions.find((x) => x.id === b)!,
        { id: "new", prompt: "?", options: ["x", "y"], correct: 0, explanation: "" },
      ],
    };
    const r = reconcileOrder(stale, edited);
    expect(r.order).toEqual([a, b, "new"]);
    expect(r.optionOrder["gone"]).toBeUndefined();
    expect(r.optionOrder["new"]).toEqual([0, 1]);
    expect(r.answers).toEqual({ [a!]: 0 });
    expect(r.flagged).toEqual([a]);
    expect(r.current).toBe(2);
  });

  it("keeps running from memory when storage is blocked; saveAnswer reports false", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const s = begin(user("u-creator"), SLUG, quiz(), "tab-a");
    expect(s.deadlineMs).toBe(T0 + 2 * 60_000);
    expect(getActiveSession(SLUG, "u-creator")?.deadlineMs).toBe(s.deadlineMs);
    const key = sessionKey(SLUG, "u-creator");
    expect(saveAnswer(key, s.order[0]!, 1)).toBe(false);
    // the in-memory session still has the answer
    expect(getActiveSession(SLUG, "u-creator")?.answers[s.order[0]!]).toBe(1);
  });

  it("refuses a NEW session when no attempts are left, but still resumes one", () => {
    useAllAttempts();
    expect(startExam(user("u-creator"), SLUG, quiz(), "tab-a")).toBe(NO_ATTEMPTS_LEFT);
    expect(getActiveSession(SLUG, "u-creator")).toBeUndefined();

    platform.reset();
    const s = begin(user("u-creator"), SLUG, quiz(), "tab-a");
    useAllAttempts();
    expect(startExam(user("u-creator"), SLUG, quiz(), "tab-b")).toEqual(s);
  });

  it("rejects answer, flag and violation writes after the deadline", () => {
    const s = begin(user("u-creator"), SLUG, quiz(), "tab-a");
    const key = sessionKey(SLUG, "u-creator");
    const qid = s.order[0]!;
    vi.setSystemTime(s.deadlineMs);
    expect(saveAnswer(key, qid, 1)).toBe(true); // at the deadline is still allowed
    vi.setSystemTime(s.deadlineMs + 1);
    expect(saveAnswer(key, qid, 2)).toBe(false);
    expect(toggleFlag(key, qid)).toBe(false);
    expect(recordViolation(key, { type: "window_blur", at: "x", counted: true })).toBe(false);
    const after = getActiveSession(SLUG, "u-creator")!;
    expect(after.answers[qid]).toBe(1);
    expect(after.flagged).toEqual([]);
    expect(after.violations).toEqual([]);
  });

  it("re-reads storage before writing: a stale tab neither steals ownership nor wipes answers", () => {
    const s = begin(user("u-creator"), SLUG, quiz(), "tab-a");
    const key = sessionKey(SLUG, "u-creator");
    const [q1, q2] = s.order;
    // Another tab took over and answered q1; its `storage` event has not reached us yet.
    const other = { ...stored()[key]!, tabId: "tab-b", lastBeat: T0 + 1000, answers: { [q1!]: 3 } };
    localStorage.setItem(KEY, JSON.stringify({ [key]: other }));
    vi.setSystemTime(T0 + 5000);

    expect(heartbeat(key, "tab-a")).toBe(false);
    expect(stored()[key]?.tabId).toBe("tab-b");
    expect(stored()[key]?.lastBeat).toBe(T0 + 1000);

    expect(saveAnswer(key, q2!, 0)).toBe(true);
    expect(stored()[key]?.tabId).toBe("tab-b");
    expect(stored()[key]?.answers).toEqual({ [q1!]: 3, [q2!]: 0 });
  });
});
