import { useState } from "react";

import { btn } from "@/components/studio/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Quiz } from "@/data/platform";
import { isAnswered } from "@/data/proctoring";
import { groupBySection, orderedEntries } from "@/lib/exam-sections";
import { cn } from "@/lib/utils";

export interface QuestionNavigatorProps {
  quiz: Quiz;
  order: string[];
  answers: Record<string, number | number[]>;
  flagged: string[];
  current: number;
  onGo: (index: number) => void;
  variant?: "sidebar" | "sheet";
  /** Sheet variant only: the "Review & submit" button. */
  onReview?: () => void;
}

function Legend() {
  const dot = "inline-block h-3 w-3 rounded-sm";
  return (
    <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span className={cn(dot, "bg-success")} aria-hidden="true" /> Answered
      </li>
      <li className="flex items-center gap-1.5">
        <span className={cn(dot, "border border-border")} aria-hidden="true" /> Not answered
      </li>
      <li className="flex items-center gap-1.5">
        <span className={cn(dot, "bg-warning/15 ring-1 ring-warning")} aria-hidden="true" /> Flagged
      </li>
      <li className="flex items-center gap-1.5">
        <span className={cn(dot, "bg-primary")} aria-hidden="true" /> Current
      </li>
    </ul>
  );
}

function NavigatorBody({
  quiz,
  order,
  answers,
  flagged,
  current,
  onGo,
  cellHeight,
}: QuestionNavigatorProps & { cellHeight: string }) {
  const entries = orderedEntries(quiz, order);
  const total = entries.length;
  const answered = entries.filter((e) => isAnswered(answers[e.question.id])).length;
  return (
    <div>
      <h2 className="font-semibold">Questions</h2>
      <p className="text-sm text-muted-foreground">
        {answered} of {total} answered
      </p>
      <div className="mt-3 space-y-4">
        {groupBySection(quiz, order).map((group) => (
          <div key={group.section}>
            <h3
              data-testid={`section-${group.section}`}
              className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {group.section}
            </h3>
            <div className="grid grid-cols-6 gap-1.5">
              {group.entries.map(({ question, index }) => {
                const isCurrent = index === current;
                const isFlagged = flagged.includes(question.id);
                const isDone = isAnswered(answers[question.id]);
                const label = [
                  `Question ${index + 1}`,
                  isCurrent && "current",
                  isFlagged && "flagged",
                  isDone && "answered",
                ]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <button
                    key={question.id}
                    type="button"
                    aria-label={label}
                    aria-current={isCurrent ? "true" : undefined}
                    onClick={() => onGo(index)}
                    className={cn(
                      "relative rounded-md text-sm font-medium transition",
                      cellHeight,
                      isCurrent
                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                        : isFlagged
                          ? "bg-warning/15 text-warning ring-1 ring-warning"
                          : isDone
                            ? "bg-success text-primary-foreground"
                            : "border border-border hover:bg-accent",
                    )}
                  >
                    {index + 1}
                    {isFlagged && (
                      <span
                        aria-hidden="true"
                        className="absolute right-0.5 top-0 text-[10px] leading-none"
                      >
                        ⚑
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <Legend />
    </div>
  );
}

export function QuestionNavigator(props: QuestionNavigatorProps) {
  const [open, setOpen] = useState(false);
  if (props.variant !== "sheet") return <NavigatorBody {...props} cellHeight="h-9" />;

  const total = orderedEntries(props.quiz, props.order).length;
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-semibold"
        >
          ▦ {props.current + 1} / {total}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>Question navigator</SheetTitle>
          <SheetDescription>Jump to any question.</SheetDescription>
        </SheetHeader>
        <NavigatorBody
          {...props}
          cellHeight="h-10"
          onGo={(i) => {
            props.onGo(i);
            setOpen(false);
          }}
        />
        <button
          type="button"
          className={cn(btn, "mt-5 w-full")}
          onClick={() => {
            setOpen(false);
            props.onReview?.();
          }}
        >
          Review &amp; submit
        </button>
      </SheetContent>
    </Sheet>
  );
}
