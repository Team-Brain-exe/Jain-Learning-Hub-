import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCountdown } from "@/hooks/use-countdown";

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onExpire exactly once when reaching 0", () => {
    const onExpire = vi.fn();
    const deadline = Date.now() + 3000;
    const { result } = renderHook(() => useCountdown(deadline, onExpire));
    expect(result.current.secondsLeft).toBe(3);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.expired).toBe(true);
    expect(onExpire).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("expires on mount for a deadline in the past", () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useCountdown(Date.now() - 1000, onExpire));
    expect(result.current.secondsLeft).toBe(0);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("does not call onExpire after unmount", () => {
    const onExpire = vi.fn();
    const { unmount } = renderHook(() => useCountdown(Date.now() + 3000, onExpire));
    unmount();
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("handles a null deadline", () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useCountdown(null, onExpire));
    expect(result.current).toEqual({ secondsLeft: 0, expired: false });
    expect(vi.getTimerCount()).toBe(0);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("recomputes from the clock after a system time jump", () => {
    const deadline = Date.now() + 300_000;
    const { result } = renderHook(() => useCountdown(deadline, vi.fn()));
    expect(result.current.secondsLeft).toBe(300);
    act(() => {
      vi.setSystemTime(Date.now() + 90_000);
      vi.advanceTimersByTime(250);
    });
    expect(result.current.secondsLeft).toBe(210);
  });

  it("shows the full time on the first render after a deadline is set or changed", () => {
    const seen: number[] = [];
    const { rerender } = renderHook(
      ({ deadline }: { deadline: number | null }) => {
        const r = useCountdown(deadline, vi.fn());
        seen.push(r.secondsLeft);
        return r;
      },
      { initialProps: { deadline: null as number | null } },
    );
    seen.length = 0;
    rerender({ deadline: Date.now() + 600_000 });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((s) => s === 600)).toBe(true);
    seen.length = 0;
    rerender({ deadline: Date.now() + 120_000 });
    expect(seen.every((s) => s === 120)).toBe(true);
  });

  it("does not restart when the onExpire identity changes", () => {
    const first = vi.fn();
    const second = vi.fn();
    const deadline = Date.now() + 3000;
    const { rerender } = renderHook(({ cb }) => useCountdown(deadline, cb), {
      initialProps: { cb: first },
    });
    rerender({ cb: second });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
