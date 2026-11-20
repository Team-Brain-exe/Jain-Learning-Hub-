import { ShieldCheck } from "lucide-react";

import { btn, card } from "@/components/studio/ui";
import type { Quiz } from "@/data/platform";
import { cn } from "@/lib/utils";

interface ExamEntryCardProps {
  quiz: Quiz;
  slug: string;
  attemptsLeft: number;
  maxAttempts: number;
  hasActiveSession: boolean;
  /** Effective duration in minutes (already includes any time multiplier). */
  minutes: number;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

/** Quiz-page card for a proctored exam: summary plus a link that opens the exam in a new tab. */
export function ExamEntryCard({
  quiz,
  slug,
  attemptsLeft,
  maxAttempts,
  hasActiveSession,
  minutes,
}: ExamEntryCardProps) {
  const blocked = attemptsLeft <= 0 && !hasActiveSession;

  return (
    <section className={cn(card, "mt-6 space-y-5")} aria-labelledby="exam-entry-title">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="exam-entry-title" className="text-lg font-bold">
              Proctored exam
            </h2>
            <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
              Timed · {minutes} min
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Opens in a new full-screen tab. The timer starts when you press Start and keeps running
            if you close the tab.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Questions" value={quiz.questions.length} />
        <Stat label="Time" value={`${minutes} min`} />
        <Stat label="Pass mark" value={`${quiz.passMark}%`} />
        <Stat label="Attempts left" value={`${Math.max(0, attemptsLeft)} of ${maxAttempts}`} />
      </div>

      {blocked ? (
        <button type="button" className={cn(btn, "w-full sm:w-auto")} disabled>
          No attempts left
        </button>
      ) : (
        <a
          href={`/learn/${slug}/exam`}
          target="_blank"
          rel="noopener"
          className={cn(btn, "w-full sm:w-auto")}
        >
          {hasActiveSession ? "Resume exam" : "Open exam in new tab"}
        </a>
      )}
    </section>
  );
}
