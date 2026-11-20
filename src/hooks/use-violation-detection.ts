import { useEffect, useRef } from "react";
import type { ViolationType } from "@/data/proctoring";

const DEBOUNCE_MS = 1000;

interface Options {
  active: boolean;
  watchFullscreen: boolean;
  onViolation: (type: ViolationType) => void;
}

export function useViolationDetection({ active, watchFullscreen, onViolation }: Options): void {
  const callbackRef = useRef(onViolation);
  useEffect(() => {
    callbackRef.current = onViolation;
  }, [onViolation]);

  const lastReportedRef = useRef(Number.NEGATIVE_INFINITY);

  useEffect(() => {
    if (!active) return;

    const report = (type: ViolationType) => {
      const now = Date.now();
      if (now - lastReportedRef.current < DEBOUNCE_MS) return;
      lastReportedRef.current = now;
      callbackRef.current(type);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") report("tab_hidden");
    };
    const onBlur = () => report("window_blur");
    const onFullscreen = () => {
      if (watchFullscreen && !document.fullscreenElement) report("fullscreen_exit");
    };
    const onClipboard = (e: Event) => {
      e.preventDefault();
      report("copy_paste");
    };
    const onContextMenu = (e: Event) => {
      e.preventDefault();
      report("context_menu");
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("copy", onClipboard);
    document.addEventListener("cut", onClipboard);
    document.addEventListener("paste", onClipboard);
    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("copy", onClipboard);
      document.removeEventListener("cut", onClipboard);
      document.removeEventListener("paste", onClipboard);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [active, watchFullscreen]);
}
