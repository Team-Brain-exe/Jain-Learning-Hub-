import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getQuiz, platform, type AppUser, type Quiz } from "@/data/platform";
import * as proctoring from "@/data/proctoring";
import { examSessions, getActiveSession } from "@/data/proctoring";
import { useExamSession } from "@/hooks/use-exam-session";

vi.mock("@/data/proctoring", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/data/proctoring")>();
  return { ...mod, finishExam: vi.fn(mod.finishExam) };
});

const SLUG = "data-structures-and-algorithms";
const T0 = new Date("2026-01-01T00:00:00Z").getTime();
const root = document.documentElement as unknown as { requestFullscreen?: unknown };
const doc = document as unknown as { exitFullscreen?: unknown };

const user = (id = "u-creator"): AppUser => {
  const u = platform.get().users.find((x) => x.id === id);
  if (!u) throw new Error(`missing user ${id}`);
  return u;
};
const quiz = (): Quiz => {
  const q = getQuiz(SLUG);
  if (!q) throw new Error("missing demo quiz");
  return q;
};

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => (hidden ? "hidden" : "visible"),
  });
}
function hideTab() {
  setHidden(true);
  document.dispatchEvent(new Event("visibilitychange"));
  setHidden(false);
}
function setFullscreenElement(el: Element | null) {
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: el });
}

const render = (u = user(), q = quiz()) =>
  renderHook(() => useExamSession({ user: u, slug: SLUG, quiz: q }));

describe("useExamSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    examSessions.reset();
    platform.reset();
    vi.mocked(proctoring.finishExam).mockClear();
    setHidden(false);
    setFullscreenElement(null);
    root.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    doc.exitFullscreen = vi.fn().mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete root.requestFullscreen;
    delete doc.exitFullscreen;
    Reflect.deleteProperty(document, "visibilityState");
    Reflect.deleteProperty(document, "fullscreenElement");
    vi.useRealTimers();
  });

  it("starts in intro and start() makes it active", async () => {
    const { result } = render();
    expect(result.current.phase).toBe("intro");
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.phase).toBe("active");
    expect(result.current.session?.deadlineMs).toBe(T0 + 2 * 60_000);
    expect(root.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(result.current.otherTabActive).toBe(false);
    expect(result.current.counted).toBe(0);
  });

  it("warns on counted violations and auto-submits on the 3rd", async () => {
    const { result } = render();
    await act(async () => {
      await result.current.start();
    });
    act(() => hideTab());
    expect(result.current.counted).toBe(1);
    expect(result.current.warning).toMatchObject({ n: 1, max: 3, type: "tab_hidden", last: false });
    act(() => result.current.dismissWarning());
    expect(result.current.warning).toBeNull();
    act(() => vi.advanceTimersByTime(2000));
    act(() => hideTab());
    expect(result.current.warning).toMatchObject({ n: 2, last: true });
    act(() => vi.advanceTimersByTime(2000));
    act(() => hideTab());
    expect(result.current.phase).toBe("finished");
    expect(result.current.warning).toBeNull();
    expect(result.current.result?.attempt.meta?.autoSubmitted).toBe(true);
    expect(result.current.result?.attempt.meta?.autoSubmitReason).toBe("violations");
    expect(result.current.result?.attempt.meta?.violations).toHaveLength(3);
    expect(document.exitFullscreen).toHaveBeenCalled();
    expect(getActiveSession(SLUG, "u-creator")).toBeUndefined();
  });

  it("auto-submits with timeout after the deadline", async () => {
    const { result } = render();
    await act(async () => {
      await result.current.start();
    });
    act(() => vi.advanceTimersByTime(2 * 60_000 + 500));
    expect(result.current.phase).toBe("finished");
    expect(result.current.result?.attempt.meta?.autoSubmitReason).toBe("timeout");
    expect(result.current.result?.score.total).toBe(quiz().questions.length);
  });

  it("calls finishExam once when timeout and the 3rd violation land in the same tick", async () => {
    const { result } = render();
    await act(async () => {
      await result.current.start();
    });
    act(() => hideTab());
    act(() => vi.advanceTimersByTime(2000));
    act(() => hideTab());
    act(() => {
      vi.setSystemTime(T0 + 2 * 60_000); // still writable; the next countdown tick expires it
      hideTab();
      vi.advanceTimersByTime(300);
    });
    expect(proctoring.finishExam).toHaveBeenCalledTimes(1);
    expect(platform.get().attempts.filter((a) => a.userId === "u-creator")).toHaveLength(1);
    expect(result.current.phase).toBe("finished");
  });

  it("records an uncounted fullscreen_unsupported violation when the API is missing", async () => {
    delete root.requestFullscreen;
    const { result } = render();
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.phase).toBe("active");
    expect(result.current.session?.violations).toEqual([
      expect.objectContaining({ type: "fullscreen_unsupported", counted: false }),
    ]);
    expect(result.current.counted).toBe(0);
    expect(result.current.needsFullscreen).toBe(false);
  });

  it("fullscreen exit counts and sets needsFullscreen; enterFullscreen clears it", async () => {
    const { result } = render();
    await act(async () => {
      await result.current.start();
      setFullscreenElement(document.documentElement);
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    expect(result.current.needsFullscreen).toBe(false);
    act(() => {
      setFullscreenElement(null);
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    expect(result.current.counted).toBe(1);
    expect(result.current.warning?.type).toBe("fullscreen_exit");
    expect(result.current.needsFullscreen).toBe(true);
    await act(async () => {
      await result.current.enterFullscreen();
    });
    expect(result.current.needsFullscreen).toBe(false);
  });

  it("answers, flags, navigation, review and manual submit", async () => {
    const q = quiz();
    const { result } = render(user(), q);
    await act(async () => {
      await result.current.start();
    });
    const first = result.current.session!.order[0]!;
    act(() => result.current.answer(first, 1));
    expect(result.current.session?.answers[first]).toBe(1);
    expect(result.current.saveState).toBe("saved");
    act(() => result.current.flag(first));
    expect(result.current.session?.flagged).toEqual([first]);
    act(() => result.current.go(2));
    expect(result.current.session?.current).toBe(2);
    act(() => result.current.openReview());
    expect(result.current.phase).toBe("reviewing");
    act(() => result.current.closeReview());
    expect(result.current.phase).toBe("active");
    act(() => result.current.submit());
    expect(result.current.phase).toBe("finished");
    expect(result.current.result?.attempt.meta?.autoSubmitted).toBe(false);
    expect(proctoring.finishExam).toHaveBeenCalledTimes(1);
  });

  it("saveState is failed when storage is blocked", async () => {
    const { result } = render();
    await act(async () => {
      await result.current.start();
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const first = result.current.session!.order[0]!;
    act(() => result.current.answer(first, 0));
    expect(result.current.saveState).toBe("failed");
    expect(result.current.phase).toBe("active");
  });

  it("a fresh hook resumes active with the same deadline", async () => {
    const first = render();
    await act(async () => {
      await first.result.current.start();
    });
    const deadline = first.result.current.session!.deadlineMs;
    first.unmount();
    act(() => vi.advanceTimersByTime(10_000));
    const second = render();
    expect(second.result.current.phase).toBe("active");
    expect(second.result.current.session?.deadlineMs).toBe(deadline);
    expect(second.result.current.otherTabActive).toBe(false);
  });

  it("an expired session is closed out on mount", async () => {
    const first = render();
    await act(async () => {
      await first.result.current.start();
    });
    first.unmount();
    vi.setSystemTime(T0 + 5 * 60_000);
    const second = render();
    expect(second.result.current.phase).toBe("finished");
    expect(second.result.current.result?.attempt.meta?.autoSubmitReason).toBe("timeout");
  });

  it("a second tab sees otherTabActive and takeOver flips it", async () => {
    const a = render();
    await act(async () => {
      await a.result.current.start();
    });
    const b = render();
    expect(b.result.current.phase).toBe("active");
    expect(b.result.current.otherTabActive).toBe(true);
    expect(a.result.current.otherTabActive).toBe(false);
    act(() => b.result.current.takeOver());
    expect(b.result.current.otherTabActive).toBe(false);
    expect(a.result.current.otherTabActive).toBe(true);
    expect(b.result.current.session?.violations).toEqual([
      expect.objectContaining({ type: "second_tab", counted: false }),
    ]);
    expect(b.result.current.counted).toBe(0);
  });

  it("heartbeats every 5 s while owning the session", async () => {
    const { result } = render();
    await act(async () => {
      await result.current.start();
    });
    act(() => vi.advanceTimersByTime(5000));
    expect(getActiveSession(SLUG, "u-creator")?.lastBeat).toBe(T0 + 5000);
  });

  it("StrictMode: expired session on mount yields exactly one attempt; resume stays owned", async () => {
    const first = render();
    await act(async () => {
      await first.result.current.start();
    });
    first.unmount();
    const strict = renderHook(() => useExamSession({ user: user(), slug: SLUG, quiz: quiz() }), {
      wrapper: StrictMode,
    });
    expect(strict.result.current.phase).toBe("active");
    expect(strict.result.current.otherTabActive).toBe(false);
    act(() => vi.advanceTimersByTime(2 * 60_000 + 500));
    expect(strict.result.current.phase).toBe("finished");
    strict.unmount();

    const again = render();
    await act(async () => {
      await again.result.current.start();
    });
    again.unmount();
    vi.setSystemTime(Date.now() + 10 * 60_000);
    const late = renderHook(() => useExamSession({ user: user(), slug: SLUG, quiz: quiz() }), {
      wrapper: StrictMode,
    });
    expect(late.result.current.phase).toBe("finished");
    expect(platform.get().attempts.filter((a) => a.userId === "u-creator")).toHaveLength(2);
  });

  it("(a) after a failed finish, a new session taken over still counts violations and expires", async () => {
    const b = render();
    await act(async () => {
      await b.result.current.start();
    });
    platform.update((st) => ({
      ...st,
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
    act(() => b.result.current.submit());
    expect(b.result.current.error).toMatch(/attempts/);
    expect(b.result.current.phase).toBe("intro");

    platform.reset();
    act(() => vi.advanceTimersByTime(1000));
    const a = render();
    await act(async () => {
      await a.result.current.start();
    });
    expect(b.result.current.otherTabActive).toBe(true);
    act(() => b.result.current.takeOver());
    act(() => hideTab());
    expect(b.result.current.counted).toBe(1);
    expect(b.result.current.warning?.n).toBe(1);
    act(() => vi.advanceTimersByTime(2 * 60_000));
    expect(b.result.current.phase).toBe("finished");
    expect(b.result.current.result?.attempt.meta?.autoSubmitReason).toBe("timeout");
    expect(platform.get().attempts.filter((x) => x.userId === "u-creator")).toHaveLength(1);
  });

  it("(b) two instances on one session at the deadline store exactly one attempt", async () => {
    const a = render();
    await act(async () => {
      await a.result.current.start();
    });
    const b = render();
    expect(b.result.current.otherTabActive).toBe(true);
    vi.mocked(proctoring.finishExam).mockClear();
    act(() => vi.advanceTimersByTime(2 * 60_000 + 500));
    expect(proctoring.finishExam).toHaveBeenCalledTimes(1);
    expect(a.result.current.phase).toBe("finished");
    expect(platform.get().attempts.filter((x) => x.userId === "u-creator")).toHaveLength(1);
  });

  it("(c) start() with no attempts left sets error and stays in intro", async () => {
    platform.update((st) => ({
      ...st,
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
    const { result } = render();
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.phase).toBe("intro");
    expect(result.current.error).toMatch(/attempts/);
    expect(getActiveSession(SLUG, "u-creator")).toBeUndefined();
  });

  it("(d) answers after the deadline are rejected", async () => {
    const { result } = render();
    await act(async () => {
      await result.current.start();
    });
    const first = result.current.session!.order[0]!;
    vi.setSystemTime(T0 + 2 * 60_000 + 1);
    act(() => result.current.answer(first, 1));
    expect(result.current.saveState).toBe("failed");
    expect(getActiveSession(SLUG, "u-creator")?.answers[first]).toBeUndefined();
  });

  it("(e) double start() without fullscreen support logs one fullscreen_unsupported", async () => {
    delete root.requestFullscreen;
    const { result } = render();
    await act(async () => {
      await Promise.all([result.current.start(), result.current.start()]);
    });
    await act(async () => {
      await result.current.start();
    });
    const entries = result.current.session?.violations.filter(
      (v) => v.type === "fullscreen_unsupported",
    );
    expect(entries).toHaveLength(1);
  });
});
