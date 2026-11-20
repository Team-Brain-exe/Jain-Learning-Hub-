import { AlertTriangle, Check } from "lucide-react";

import { QuizTimer } from "@/components/proctor/QuizTimer";
import { btn } from "@/components/studio/ui";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type SaveState = "saving" | "saved" | "error";

export interface ExamTopBarProps {
  title: string;
  section?: string | undefined;
  saveState: SaveState;
  counted: number;
  max: number;
  secondsLeft: number;
  /** Answered percentage, 0-100, shown in the thin bar under the header. */
  answeredPct: number;
  onSubmit: () => void;
}

const SAVE: Record<SaveState, { text: string; tone: string }> = {
  saving: { text: "Saving…", tone: "text-muted-foreground" },
  saved: { text: "Saved ✓", tone: "text-success" },
  error: { text: "Not saved: don't close this tab", tone: "text-warning" },
};

export function ExamTopBar({
  title,
  section,
  saveState,
  counted,
  max,
  secondsLeft,
  answeredPct,
  onSubmit,
}: ExamTopBarProps) {
  const save = SAVE[saveState];
  return (
    <header className="sticky top-0 z-30">
      <div className="flex items-center gap-2 border-b bg-card px-4 py-2.5 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{title}</p>
          {section && (
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{section}</p>
          )}
        </div>
        <span aria-live="polite" className={cn("shrink-0 whitespace-nowrap text-xs", save.tone)}>
          <span className="hidden sm:inline">{save.text}</span>
          <span className="sm:hidden">
            {saveState === "saved" && <Check className="h-4 w-4" aria-hidden="true" />}
            {saveState === "error" && <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
            {saveState === "saving" && <span aria-hidden="true">…</span>}
            <span className="sr-only">{save.text}</span>
          </span>
        </span>
        {counted > 0 && (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
            <span aria-hidden="true" className="sm:hidden">
              ⚠ {counted}/{max}
            </span>
            <span className="sr-only sm:not-sr-only">
              ⚠ {counted} of {max} warnings
            </span>
          </span>
        )}
        <QuizTimer secondsLeft={secondsLeft} className="shrink-0 whitespace-nowrap" />
        <button
          type="button"
          className={cn(btn, "h-9 shrink-0 whitespace-nowrap px-4")}
          onClick={onSubmit}
        >
          Submit
        </button>
      </div>
      <Progress value={answeredPct} className="h-1 rounded-none" aria-label="Answered progress" />
    </header>
  );
}
