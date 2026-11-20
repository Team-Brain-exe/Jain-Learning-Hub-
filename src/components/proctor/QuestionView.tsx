import { useId } from "react";
import { Flag, XCircle } from "lucide-react";

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
  /** Review mode: ORIGINAL indices of the correct options, highlighted; wrong picks are marked. */
  correctOriginal?: number[];
  /** Disable the Previous / Next buttons (default true = enabled). */
  canPrev?: boolean;
  canNext?: boolean;
  /** Label of the next button (default "Save & next →"). */
  nextLabel?: string;
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
  correctOriginal,
  canPrev = true,
  canNext = true,
  nextLabel = "Save & next →",
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
    <section className={cn(card, "space-y-5 p-4 sm:p-5")}>
      <div className="flex items-center justify-between gap-2">
        <p className="whitespace-nowrap text-sm text-muted-foreground">
          <span className="sm:hidden">
            Q{index + 1} of {total}
          </span>
          <span className="hidden sm:inline">
            Question {index + 1} of {total} · 1 mark
          </span>
        </p>
        {!readOnly && (
          <button
            type="button"
            aria-pressed={flagged}
            aria-label={flagged ? "Flagged" : "Flag for review"}
            onClick={onFlag}
            className={cn(
              btnOutline,
              "h-9 shrink-0 whitespace-nowrap px-3",
              flagged && "border-warning bg-warning/15 text-warning",
            )}
          >
            <Flag className="h-4 w-4" aria-hidden="true" />
            <span aria-hidden="true">
              {flagged ? (
                "Flagged"
              ) : (
                <>
                  <span className="sm:hidden">Flag</span>
                  <span className="hidden sm:inline">Flag for review</span>
                </>
              )}
            </span>
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
          const isCorrectOpt = correctOriginal?.includes(original) ?? false;
          const wrongPick = correctOriginal !== undefined && checked && !isCorrectOpt;
          return (
            <label
              key={original}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm transition hover:bg-accent",
                checked && "border-2 border-primary bg-secondary",
                readOnly && "cursor-default",
                isCorrectOpt && "border-success bg-success/10",
                wrongPick && "text-destructive",
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
              <span className="flex-1">{question.options[original]}</span>
              {wrongPick && <XCircle className="h-4 w-4 shrink-0" aria-label="Your answer" />}
              <kbd
                aria-hidden="true"
                className="hidden rounded sm:inline-block border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
              >
                {display + 1}
              </kbd>
            </label>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {hideNav ? (
          <span />
        ) : (
          <button
            type="button"
            className={cn(btnOutline, "whitespace-nowrap px-3 sm:px-5")}
            onClick={onPrev}
            disabled={!canPrev}
          >
            ←<span className="sm:hidden">Prev</span>
            <span className="hidden sm:inline">Previous</span>
          </button>
        )}
        {!readOnly && (
          <button
            type="button"
            onClick={() => onAnswer(undefined)}
            className="whitespace-nowrap text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Clear answer
          </button>
        )}
        {hideNav ? (
          <span />
        ) : (
          <button
            type="button"
            className={cn(btn, "whitespace-nowrap px-3 sm:px-5")}
            onClick={onNext}
            disabled={!canNext}
          >
            {nextLabel}
          </button>
        )}
      </div>
    </section>
  );
}
