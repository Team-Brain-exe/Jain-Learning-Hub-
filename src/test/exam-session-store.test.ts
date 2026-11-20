import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getQuiz, platform, type AppUser, type Quiz } from "@/data/platform";
import {
  claimTab,
  examSessions,
  finalizeExpired,
  finishExam,
  getActiveSession,
  heartbeat,
  reconcileOrder,
  recordViolation,
  releaseTab,
  saveAnswer,
  sessionKey,
  setCurrent,
  startExam,
  toggleFlag,
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
    const a = startExam(user("u-creator"), SLUG, quiz(), "tab-a");
    expect(a.deadlineMs).toBe(T0 + 2 * 60_000);
    expect(a.startedAt).toBe(new Date(T0).toISOString());
    expect(a.lastBeat).toBe(T0);
    expect(a.tabId).toBe("tab-a");
    const b = startExam(user("u-learner"), SLUG, quiz(), "tab-b");
    expect(b.deadlineMs).toBe(T0 + 3 * 60_000);
  });

  it("starting again returns the existing session instead of resetting the clock", () => {
    const a = startExam(user("u-creator"), SLUG, quiz(), "tab-a");
    vi.setSystemTime(T0 + 30_000);
    const b = startExam(user("u-creator"), SLUG, quiz(), "tab-b");
    expect(b.deadlineMs).toBe(a.deadlineMs);
  });

  it("shuffled order is a permutation and stable for the same key and startedAt", () => {
    const q = quiz();
    const ids = q.questions.map((x) => x.id);
    const a = startExam(user("u-creator"), SLUG, q, "tab-a");
    expect([...a.order].sort()).toEqual([...ids].sort());
    for (const qq of q.questions) {
      const perm = a.optionOrder[qq.id];
      expect(perm).toBeDefined();
      expect([...(perm ?? [])].sort()).toEqual(qq.options.map((_, i) => i));
    }
    examSessions.reset();
    const b = startExam(user("u-creator"), SLUG, q, "tab-a");
    expect(b.order).toEqual(a.order);
    expect(b.optionOrder).toEqual(a.optionOrder);
  });

  it("uses identity order when shuffling is off", () => {
    const base = quiz();
    const q: Quiz = {
      ...base,
      proctor: { durationMinutes: 2, maxViolations: 3, requireFullscreen: false },
    };
    const s = startExam(user("u-creator"), SLUG, q, "tab-a");
    expect(s.order).toEqual(q.questions.map((x) => x.id));
    for (const qq of q.questions) {
      expect(s.optionOrder[qq.id]).toEqual(qq.options.map((_, i) => i));
    }
  });

  it("saveAnswer persists and getActiveSession returns it; undefined clears it", () => {
    const s = startExam(user("u-creator"), SLUG, quiz(), "tab-a");
    const key = sessionKey(SLUG, "u-creator");
    const qid = s.order[0]!;
    expect(saveAnswer(key, qid, 2)).toBe(true);
    expect(getActiveSession(SLUG, "u-creator")?.answers[qid]).toBe(2);
    expect(saveAnswer(key, qid, undefined)).toBe(true);
    expect(getActiveSession(SLUG, "u-creator")?.answers[qid]).toBeUndefined();
    expect(saveAnswer("nope:nobody", qid, 1)).toBe(false);
  });

  it("flags, current index, violations, heartbeat and claimTab update the session", () => {
    const s = startExam(user("u-creator"), SLUG, quiz(), "tab-a");
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
    const s = startExam(user("u-creator"), SLUG, quiz(), "tab-a");
    window.dispatchEvent(new StorageEvent("storage", { key: "jfet-exam-sessions-v1" }));
    expect(getActiveSession(SLUG, "u-creator")?.deadlineMs).toBe(s.deadlineMs);
  });

  it("finishExam stores an attempt with meta and deletes the session", () => {
    const q = quiz();
    const s = startExam(user("u-creator"), SLUG, q, "tab-a");
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
    const s = startExam(user("u-creator"), SLUG, q, "tab-a");
    expect(finalizeExpired(user("u-creator"), SLUG, q, s.deadlineMs - 1)).toBeNull();
    expect(getActiveSession(SLUG, "u-creator")).toBeDefined();
    const r = finalizeExpired(user("u-creator"), SLUG, q, s.deadlineMs + 1);
    expect(r?.meta?.autoSubmitReason).toBe("timeout");
    expect(getActiveSession(SLUG, "u-creator")).toBeUndefined();
    expect(finalizeExpired(user("u-creator"), SLUG, q, s.deadlineMs + 1)).toBeNull();
  });

  it("reconcileOrder drops unknown ids and appends new ones", () => {
    const q = quiz();
    const s = startExam(user("u-creator"), SLUG, q, "tab-a");
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
    const s = startExam(user("u-creator"), SLUG, quiz(), "tab-a");
    expect(s.deadlineMs).toBe(T0 + 2 * 60_000);
    expect(getActiveSession(SLUG, "u-creator")?.deadlineMs).toBe(s.deadlineMs);
    const key = sessionKey(SLUG, "u-creator");
    expect(saveAnswer(key, s.order[0]!, 1)).toBe(false);
    // the in-memory session still has the answer
    expect(getActiveSession(SLUG, "u-creator")?.answers[s.order[0]!]).toBe(1);
  });
});
