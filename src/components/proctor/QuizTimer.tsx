import { Clock } from "lucide-react";

import { formatTime } from "@/lib/format-time";
import { cn } from "@/lib/utils";

const WARNING_SECONDS = 300;
const DANGER_SECONDS = 60;

/** Text only changes when a threshold is crossed, so assistive tech announces just those moments. */
function announcement(secondsLeft: number): string {
  if (secondsLeft <= 60) return "1 minute left";
  if (secondsLeft <= 300) return "5 minutes left";
  if (secondsLeft <= 600) return "10 minutes left";
  return "";
}

/** Countdown pill for a timed quiz. Tone escalates as time runs low; the digits are always shown. */
export function QuizTimer({ secondsLeft, className }: { secondsLeft: number; className?: string }) {
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
        {announcement(secondsLeft)}
      </span>
    </div>
  );
}
