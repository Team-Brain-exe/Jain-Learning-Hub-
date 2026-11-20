import { useEffect, useRef } from "react";

interface SecondTabBlockerProps {
  open: boolean;
  onTakeOver: () => void;
}

/** Blocks this tab while another tab owns the exam session. */
export function SecondTabBlocker({ open, onTakeOver }: SecondTabBlockerProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) buttonRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="second-tab-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-navy p-6 text-navy-foreground"
    >
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h2 id="second-tab-title" className="text-2xl font-semibold">
          This exam is open in another tab
        </h2>
        <p>
          Only one tab can run the exam. Use this tab to continue here; the other tab will stop.
        </p>
        <button
          ref={buttonRef}
          type="button"
          onClick={onTakeOver}
          className="inline-flex h-10 items-center justify-center rounded-md bg-card px-5 text-sm font-semibold text-navy transition hover:bg-card/90"
        >
          Use this tab
        </button>
      </div>
    </div>
  );
}
