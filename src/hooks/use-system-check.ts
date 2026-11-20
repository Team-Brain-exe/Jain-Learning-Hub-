import { useEffect, useState } from "react";

export interface SystemCheckResult {
  /** False until the checks have run in the browser; flags are meaningless before then. */
  ready: boolean;
  fullscreen: boolean;
  screenOk: boolean;
  storageOk: boolean;
}

function probeStorage(): boolean {
  try {
    const key = "jfet-system-check";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Browser capability checks for the exam intro. Computed in an effect so it is SSR-safe. */
export function useSystemCheck(): SystemCheckResult {
  const [result, setResult] = useState<SystemCheckResult>({
    ready: false,
    fullscreen: false,
    screenOk: false,
    storageOk: false,
  });

  useEffect(() => {
    setResult({
      ready: true,
      fullscreen:
        !!document.documentElement.requestFullscreen && document.fullscreenEnabled !== false,
      screenOk: window.innerWidth >= 320,
      storageOk: probeStorage(),
    });
  }, []);

  return result;
}
