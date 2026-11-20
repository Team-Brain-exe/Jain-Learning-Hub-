import { useEffect, useRef } from "react";

interface Options {
  enabled: boolean;
  optionCount: number;
  onPick: (displayIndex: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onFlag: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable ||
    target.getAttribute("contenteditable") === "true"
  );
}

/** Keyboard shortcuts for the exam: 1-9 pick an option, arrows navigate, F flags. */
export function useExamShortcuts(opts: Options): void {
  const ref = useRef(opts);
  ref.current = opts;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const o = ref.current;
      if (!o.enabled) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (/^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (idx < o.optionCount) o.onPick(idx);
      } else if (e.key === "ArrowLeft") o.onPrev();
      else if (e.key === "ArrowRight") o.onNext();
      else if (e.key === "f" || e.key === "F") o.onFlag();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
