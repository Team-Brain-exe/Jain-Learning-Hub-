import { btn, btnOutline, card } from "@/components/studio/ui";
import type { Quiz } from "@/data/platform";
import { isAnswered } from "@/data/proctoring";
import { orderedEntries } from "@/lib/exam-sections";
import { cn } from "@/lib/utils";

export interface ReviewScreenProps {
  quiz: Quiz;
  order: string[];
  answers: Record<string, number | number[]>;
  flagged: string[];
  onGo: (index: number) => void;
  onBack: () => void;
  onSubmit: () => void;
}

function Tile({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className={cn(card, "text-center")}>
      <p className={cn("text-3xl font-bold tabular-nums", tone)}>{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function ReviewScreen({
  quiz,
  order,
  answers,
  flagged,
  onGo,
  onBack,
  onSubmit,
}: ReviewScreenProps) {
  const entries = orderedEntries(quiz, order).map((e) => ({
    ...e,
    done: isAnswered(answers[e.question.id]),
    flag: flagged.includes(e.question.id),
  }));
  const answered = entries.filter((e) => e.done).length;
  const flaggedCount = entries.filter((e) => e.flag).length;
  const attention = entries.filter((e) => !e.done || e.flag);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">Review your answers</h1>
      <div className="grid grid-cols-3 gap-3">
        <Tile label="Answered" value={answered} tone="text-success" />
        <Tile label="Not answered" value={entries.length - answered} />
        <Tile label="Flagged" value={flaggedCount} tone="text-warning" />
      </div>

      <section className={card}>
        <h2 className="font-semibold">Needs attention</h2>
        {attention.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Everything is answered and nothing is flagged.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {attention.map(({ question, index, done, flag }) => (
              <li key={question.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm">
                  Q{index + 1} · {question.prompt}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    flag ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground",
                  )}
                >
                  {flag ? "Flagged" : "Not answered"}
                  {flag && !done ? " · Not answered" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => onGo(index)}
                  className="shrink-0 text-sm font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Go →
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-center justify-between gap-3">
        <button type="button" className={btnOutline} onClick={onBack}>
          ← Back to exam
        </button>
        <button type="button" className={btn} onClick={onSubmit}>
          Submit exam
        </button>
      </div>
    </div>
  );
}
