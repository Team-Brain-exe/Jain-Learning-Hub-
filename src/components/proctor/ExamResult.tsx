import { useState } from "react";
import { Link } from "@tanstack/react-router";

import { AnswerReview } from "@/components/proctor/AnswerReview";
import { IntegritySummary } from "@/components/proctor/IntegritySummary";
import { btn, btnOutline, card } from "@/components/studio/ui";
import { Progress } from "@/components/ui/progress";
import type { Quiz, QuizAttempt } from "@/data/platform";
import type { ExamScore } from "@/data/proctoring";
import { cn } from "@/lib/utils";

export interface ExamResultProps {
  quiz: Quiz;
  slug: string;
  score: ExamScore;
  attempt: QuizAttempt;
  attemptNo: number;
  order: string[];
  optionOrder: Record<string, number[]>;
  answers: Record<string, number | number[]>;
  /** The shell calls window.close() here. */
  onClose: () => void;
}

const R = 52;
const CIRC = 2 * Math.PI * R;

function ScoreRing({ pct, passed }: { pct: number; passed: boolean }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg
        viewBox="0 0 120 120"
        role="img"
        aria-label={`Score ${pct}%`}
        className="h-full w-full -rotate-90"
      >
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - clamped / 100)}
          className={passed ? "stroke-success" : "stroke-destructive"}
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-2xl font-extrabold"
      >
        {pct}%
      </span>
    </div>
  );
}

/** The review panel opens on "Review answers"; its open state is internal. */
export function ExamResult({
  quiz,
  slug,
  score,
  attempt,
  attemptNo,
  order,
  optionOrder,
  answers,
  onClose,
}: ExamResultProps) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const { right, wrong, skipped, total, passed } = score;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <section
        className={cn(
          card,
          "flex flex-col items-center gap-6 border-2 p-6 sm:flex-row",
          passed ? "border-success" : "border-destructive",
        )}
      >
        <ScoreRing pct={score.score} passed={passed} />
        <div className="space-y-3 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold">{passed ? "Passed 🎉" : "Not passed yet"}</h1>
          <p className="text-sm text-muted-foreground">
            {`${right} of ${total} correct · pass mark ${quiz.passMark}% · attempt ${attemptNo} of ${quiz.maxAttempts}`}
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            {passed && (
              <Link to="/certificates" className={btn}>
                Go to certificates
              </Link>
            )}
            <button type="button" className={btnOutline} onClick={() => setReviewOpen((o) => !o)}>
              Review answers
            </button>
            <button type="button" className={btnOutline} onClick={onClose}>
              Close tab
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tab won't close?{" "}
            <Link to="/learn/$slug/quiz" params={{ slug }} className="underline underline-offset-2">
              Back to the course quiz page
            </Link>
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={cn(card, "space-y-3 p-5")}>
          <h2 className="text-base font-semibold">Breakdown</h2>
          <div className="flex h-2 overflow-hidden rounded-full bg-border" aria-hidden="true">
            <div className="bg-success" style={{ width: `${pct(right)}%` }} />
            <div className="bg-destructive" style={{ width: `${pct(wrong)}%` }} />
          </div>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt>Correct</dt>
              <dd className="font-semibold text-success">{right}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Wrong</dt>
              <dd className="font-semibold text-destructive">{wrong}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Skipped</dt>
              <dd className="font-semibold">{skipped}</dd>
            </div>
          </dl>
        </section>

        <section className={cn(card, "space-y-3 p-5")}>
          <h2 className="text-base font-semibold">By section</h2>
          <ul className="space-y-3">
            {Object.entries(score.sections).map(([name, s]) => (
              <li key={name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{name}</span>
                  <span className="text-muted-foreground">
                    {s.right} / {s.total}
                  </span>
                </div>
                <Progress value={s.total > 0 ? (s.right / s.total) * 100 : 0} aria-label={name} />
              </li>
            ))}
          </ul>
        </section>

        <IntegritySummary
          meta={attempt.meta ?? { violations: [], timeTakenSec: 0, autoSubmitted: false }}
        />
      </div>

      {reviewOpen && (
        <AnswerReview quiz={quiz} order={order} optionOrder={optionOrder} answers={answers} />
      )}
    </div>
  );
}
