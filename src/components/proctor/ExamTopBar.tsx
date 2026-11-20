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
  answeredPct?: number;
  onSubmit: () => void;
}

const SAVE_TEXT: Record<SaveState, { text: string; tone: string }> = {
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
  answeredPct = 0,
  onSubmit,
}: ExamTopBarProps) {
  const save = SAVE_TEXT[saveState];
  return (
    <header className="sticky top-0 z-30">
      <div className="flex items-center gap-3 border-b bg-card px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{title}</p>
          {section && <p className="truncate text-xs text-muted-foreground">{section}</p>}
        </div>
        <span aria-live="polite" className={cn("text-xs", save.tone)}>
          {save.text}
        </span>
        {counted > 0 && (
          <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
            ⚠ {counted} of {max} warnings
          </span>
        )}
        <QuizTimer secondsLeft={secondsLeft} />
        <button type="button" className={cn(btn, "h-9 px-4")} onClick={onSubmit}>
          Submit
        </button>
      </div>
      <Progress value={answeredPct} className="h-1 rounded-none" aria-label="Answered progress" />
    </header>
  );
}
