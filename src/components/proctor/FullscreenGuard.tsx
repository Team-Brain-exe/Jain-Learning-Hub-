import { useEffect, useRef } from "react";
import { Maximize } from "lucide-react";

import { formatTime } from "@/lib/format-time";

interface FullscreenGuardProps {
  open: boolean;
  secondsLeft: number;
  warningText?: string;
  onEnter: () => void;
}

/** Blocks the exam content until the candidate returns to fullscreen. The timer keeps running. */
export function FullscreenGuard({ open, secondsLeft, warningText, onEnter }: FullscreenGuardProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) buttonRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fullscreen-guard-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-navy p-6 text-navy-foreground"
    >
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h2 id="fullscreen-guard-title" className="text-2xl font-semibold">
          Return to fullscreen to continue
        </h2>
        <p>
          Your questions are hidden. The timer is still running:{" "}
          <span className="font-semibold tabular-nums">{formatTime(secondsLeft)}</span>
        </p>
        {warningText && <p className="text-sm opacity-80">{warningText}</p>}
        <button
          ref={buttonRef}
          type="button"
          onClick={onEnter}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-card px-5 text-sm font-semibold text-navy transition hover:bg-card/90"
        >
          <Maximize className="h-4 w-4" aria-hidden="true" />
          Enter fullscreen
        </button>
      </div>
    </div>
  );
}
