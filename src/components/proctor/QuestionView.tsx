import { useId } from "react";
import { Flag } from "lucide-react";

import { btn, btnOutline, card } from "@/components/studio/ui";
import type { QuizQuestion } from "@/data/platform";
import { cn } from "@/lib/utils";

export interface QuestionViewProps {
  question: QuizQuestion;
  index: number;
  total: number;
  /** Display position to original option index. */
  optionOrder: number[];
  answer: number | number[] | undefined;
  flagged: boolean;
  /** Always receives ORIGINAL option indices; `undefined` clears the answer. */
  onAnswer: (a: number | number[] | undefined) => void;
  onFlag: () => void;
  onPrev: () => void;
  onNext: () => void;
  readOnly?: boolean;
  /** Hide the footer prev/next buttons (the shell renders its own bar). */
  hideNav?: boolean;
}

export function QuestionView({
  question,
  index,
  total,
  optionOrder,
  answer,
  flagged,
  onAnswer,
  onFlag,
  onPrev,
  onNext,
  readOnly = false,
  hideNav = false,
}: QuestionViewProps) {
  const promptId = useId();
  const name = useId();
  const multi = question.type === "multi";
  const selected = Array.isArray(answer) ? answer : answer === undefined ? [] : [answer];

  const pick = (original: number) => {
    if (readOnly) return;
    if (!multi) {
      onAnswer(original);
      return;
    }
    const next = selected.includes(original)
      ? selected.filter((n) => n !== original)
      : [...selected, original].sort((a, b) => a - b);
    onAnswer(next.length === 0 ? undefined : next);
  };

  return (
    <section className={cn(card, "space-y-5")}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Question {index + 1} of {total} · 1 mark
        </p>
        {!readOnly && (
          <button
            type="button"
            aria-pressed={flagged}
            onClick={onFlag}
            className={cn(
              btnOutline,
              "h-9 px-3",
              flagged && "border-warning bg-warning/15 text-warning",
            )}
          >
            <Flag className="h-4 w-4" aria-hidden="true" />
            {flagged ? "Flagged" : "Flag for review"}
          </button>
        )}
      </div>

      <div>
        <h2 id={promptId} className="select-none text-xl font-semibold leading-snug">
          {question.prompt}
        </h2>
        {multi && (
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-primary">
            Select all that apply
          </p>
        )}
      </div>

      <div role={multi ? "group" : "radiogroup"} aria-labelledby={promptId} className="space-y-2">
        {optionOrder.map((original, display) => {
          const checked = selected.includes(original);
          return (
            <label
              key={original}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm transition hover:bg-accent",
                checked && "border-2 border-primary bg-secondary",
                readOnly && "cursor-default",
              )}
            >
              <input
                type={multi ? "checkbox" : "radio"}
                name={name}
                checked={checked}
                disabled={readOnly}
                onChange={() => pick(original)}
                className="h-4 w-4 accent-primary"
              />
              <span className="flex-1 select-none">{question.options[original]}</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {display + 1}
              </kbd>
            </label>
          );
        })}
      </div>

      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {hideNav ? (
            <span />
          ) : (
            <button type="button" className={btnOutline} onClick={onPrev}>
              ← Previous
            </button>
          )}
          <button
            type="button"
            onClick={() => onAnswer(undefined)}
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Clear answer
          </button>
          {hideNav ? (
            <span />
          ) : (
            <button type="button" className={btn} onClick={onNext}>
              Save &amp; next →
            </button>
          )}
        </div>
      )}
    </section>
  );
}
