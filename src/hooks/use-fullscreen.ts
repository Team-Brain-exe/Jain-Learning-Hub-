import { useCallback, useEffect, useState } from "react";

function isSupported(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.documentElement.requestFullscreen && document.fullscreenEnabled !== false;
}

/** Fullscreen control for the exam shell. SSR-safe: nothing touches `document` during render. */
export function useFullscreen() {
  const [supported, setSupported] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setSupported(isSupported());
    const sync = () => setIsFullscreen(!!document.fullscreenElement);
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const enter = useCallback((): Promise<boolean> => {
    if (!isSupported()) return Promise.resolve(false);
    // Called synchronously so the browser still sees the user gesture.
    try {
      return document.documentElement.requestFullscreen().then(
        () => true,
        () => false,
      );
    } catch {
      return Promise.resolve(false);
    }
  }, []);

  const exit = useCallback(async (): Promise<void> => {
    if (typeof document === "undefined" || !document.exitFullscreen) return;
    try {
      await document.exitFullscreen();
    } catch {
      // Already left fullscreen; nothing to do.
    }
  }, []);

  return { supported, isFullscreen, enter, exit };
}
