import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useViolationDetection } from "@/hooks/use-violation-detection";

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => (hidden ? "hidden" : "visible"),
  });
}

function setFullscreenElement(el: Element | null) {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => el,
  });
}

describe("useViolationDetection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    setHidden(false);
    setFullscreenElement(null);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces hidden + blur 50ms apart into one call", () => {
    const onViolation = vi.fn();
    renderHook(() => useViolationDetection({ active: true, watchFullscreen: false, onViolation }));
    setHidden(true);
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(50);
    window.dispatchEvent(new Event("blur"));
    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation).toHaveBeenCalledWith("tab_hidden");
  });

  it("reports a second switch 2s later", () => {
    const onViolation = vi.fn();
    renderHook(() => useViolationDetection({ active: true, watchFullscreen: false, onViolation }));
    window.dispatchEvent(new Event("blur"));
    vi.advanceTimersByTime(2000);
    window.dispatchEvent(new Event("blur"));
    expect(onViolation).toHaveBeenCalledTimes(2);
  });

  it("does nothing when inactive", () => {
    const onViolation = vi.fn();
    renderHook(() => useViolationDetection({ active: false, watchFullscreen: true, onViolation }));
    window.dispatchEvent(new Event("blur"));
    document.dispatchEvent(new Event("contextmenu", { cancelable: true }));
    expect(onViolation).not.toHaveBeenCalled();
  });

  it("stops after unmount", () => {
    const onViolation = vi.fn();
    const { unmount } = renderHook(() =>
      useViolationDetection({ active: true, watchFullscreen: false, onViolation }),
    );
    unmount();
    window.dispatchEvent(new Event("blur"));
    expect(onViolation).not.toHaveBeenCalled();
  });

  it("reports copy as copy_paste and prevents default", () => {
    const onViolation = vi.fn();
    renderHook(() => useViolationDetection({ active: true, watchFullscreen: false, onViolation }));
    const e = new Event("copy", { cancelable: true });
    document.dispatchEvent(e);
    expect(onViolation).toHaveBeenCalledWith("copy_paste");
    expect(e.defaultPrevented).toBe(true);
  });

  it("prevents default on contextmenu even when debounced", () => {
    const onViolation = vi.fn();
    renderHook(() => useViolationDetection({ active: true, watchFullscreen: false, onViolation }));
    document.dispatchEvent(new Event("copy", { cancelable: true }));
    const e = new Event("contextmenu", { cancelable: true });
    document.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    expect(onViolation).toHaveBeenCalledTimes(1);
  });

  it("ignores fullscreen exit when watchFullscreen is false", () => {
    const onViolation = vi.fn();
    renderHook(() => useViolationDetection({ active: true, watchFullscreen: false, onViolation }));
    document.dispatchEvent(new Event("fullscreenchange"));
    expect(onViolation).not.toHaveBeenCalled();
  });

  it("reports fullscreen exit when watched", () => {
    const onViolation = vi.fn();
    renderHook(() => useViolationDetection({ active: true, watchFullscreen: true, onViolation }));
    document.dispatchEvent(new Event("fullscreenchange"));
    expect(onViolation).toHaveBeenCalledWith("fullscreen_exit");
  });
});
