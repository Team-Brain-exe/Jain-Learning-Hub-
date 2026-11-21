import { useState } from "react";
import { Clock } from "lucide-react";

import { formatTime } from "@/lib/format-time";
import { cn } from "@/lib/utils";

const WARNING_SECONDS = 300;
const DANGER_SECONDS = 60;

/** Most urgent first, so a big jump announces the lowest threshold it passed. */
const THRESHOLDS: [number, string][] = [
  [60, "1 minute left"],
  [300, "5 minutes left"],
  [600, "10 minutes left"],
];

/** The threshold crossed going down from `prev` to `cur`, if any. */
function crossed(prev: number, cur: number): string | null {
  for (const [t, text] of THRESHOLDS) if (prev > t && t >= cur) return text;
  return null;
}

/** Countdown pill for a timed quiz. Tone escalates as time runs low; the digits are always shown. */
export function QuizTimer({ secondsLeft, className }: { secondsLeft: number; className?: string }) {
  // Announce only a downward crossing seen while mounted: a 4-minute exam must not say
  // "5 minutes left" at start. The text only changes at a crossing, so AT reads just those.
  const [prev, setPrev] = useState(secondsLeft);
  const [announcement, setAnnouncement] = useState("");
  if (prev !== secondsLeft) {
    setPrev(secondsLeft);
    const text = crossed(prev, secondsLeft);
    if (text) setAnnouncement(text);
  }

  const tone =
    secondsLeft < DANGER_SECONDS
      ? "bg-destructive/10 text-destructive"
      : secondsLeft < WARNING_SECONDS
        ? "bg-warning/15 text-warning"
        : "bg-muted";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums",
        tone,
        className,
      )}
    >
      <Clock className="h-4 w-4" aria-hidden="true" />
      <span>{formatTime(secondsLeft)}</span>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
