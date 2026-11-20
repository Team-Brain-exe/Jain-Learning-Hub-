import { useEffect, useRef } from "react";

interface Options {
  enabled: boolean;
  optionCount: number;
  onPick: (displayIndex: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onFlag: () => void;
}

const NON_TEXT_INPUTS = new Set(["radio", "checkbox", "button", "submit", "reset"]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(target.type);
  return (
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable ||
    target.getAttribute("contenteditable") === "true"
  );
}

/**
 * Keyboard shortcuts for the exam: 1-9 pick an option, arrows navigate, F flags.
 * Key repeats, modifier combos and typing in text fields are ignored. Dialog suppression is the
 * caller's job: the exam shell must pass `enabled={!anyDialogOpen && phase === "active"}`.
 */
export function useExamShortcuts(opts: Options): void {
  const ref = useRef(opts);
  ref.current = opts;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const o = ref.current;
      if (!o.enabled) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.repeat && e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (/^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (idx < o.optionCount) o.onPick(idx);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        // Stop a focused radio from moving its selection natively, repeats included.
        e.preventDefault();
        if (e.repeat) return;
        if (e.key === "ArrowLeft") o.onPrev();
        else o.onNext();
      } else if (e.key === "f" || e.key === "F") o.onFlag();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
