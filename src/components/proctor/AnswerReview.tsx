import { useState } from "react";

import { QuestionView } from "@/components/proctor/QuestionView";
import { card } from "@/components/studio/ui";
import { isCorrect, type Quiz } from "@/data/platform";
import { isAnswered } from "@/data/proctoring";
import { orderedEntries } from "@/lib/exam-sections";
import { cn } from "@/lib/utils";

export interface AnswerReviewProps {
  quiz: Quiz;
  order: string[];
  optionOrder: Record<string, number[]>;
  answers: Record<string, number | number[]>;
}

export function AnswerReview({ quiz, order, optionOrder, answers }: AnswerReviewProps) {
  const entries = orderedEntries(quiz, order);
  const [i, setI] = useState(0);
  if (entries.length === 0) return null;
  const idx = Math.min(i, entries.length - 1);
  const { question } = entries[idx]!;
  const answer = answers[question.id];
  const status = !isAnswered(answer)
    ? "skipped"
    : isCorrect(question, answer)
      ? "correct"
      : "wrong";
  const correctOriginal =
    question.type === "multi" ? (question.correctAll ?? []) : [question.correct];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Answer review</h2>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold",
            status === "correct" && "border-success text-success",
            status === "wrong" && "border-destructive text-destructive",
            status === "skipped" && "border-border text-muted-foreground",
          )}
        >
          {status === "correct" ? "✓ Correct" : status === "wrong" ? "✕ Wrong" : "Skipped"}
        </span>
      </div>
      <QuestionView
        question={question}
        index={idx}
        total={entries.length}
        optionOrder={optionOrder[question.id] ?? question.options.map((_, n) => n)}
        answer={answer}
        flagged={false}
        onAnswer={() => {}}
        onFlag={() => {}}
        onPrev={() => setI(Math.max(0, idx - 1))}
        onNext={() => setI(Math.min(entries.length - 1, idx + 1))}
        readOnly
        correctOriginal={correctOriginal}
      />
      {question.explanation && (
        <p className={cn(card, "p-3 text-sm")}>
          <span className="font-semibold">Explanation: </span>
          {question.explanation}
        </p>
      )}
    </section>
  );
}
