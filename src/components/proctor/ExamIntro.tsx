import { useState } from "react";
import { Clock, EyeOff, Maximize, MousePointerClick, ShieldAlert } from "lucide-react";

import { SystemCheck } from "@/components/proctor/SystemCheck";
import { card, btn } from "@/components/studio/ui";
import { Checkbox } from "@/components/ui/checkbox";
import type { Quiz } from "@/data/platform";

interface ExamIntroProps {
  quiz: Quiz;
  courseTitle: string;
  attemptsLeft: number;
  maxAttempts: number;
  /** Effective duration in minutes (already includes any time multiplier). */
  minutes: number;
  /** Violations after which the attempt is submitted automatically. */
  maxViolations: number;
  onStart: () => void;
  /** Whether no other tab holds this exam session. Defaults to true. */
  singleTab?: boolean;
}

const rulesFor = (minutes: number, maxViolations: number) => [
  {
    icon: Clock,
    text: `You have ${minutes} minutes. The timer keeps running if you refresh or close the tab.`,
  },
  { icon: Maximize, text: "The exam must stay in fullscreen." },
  { icon: MousePointerClick, text: "Leaving this tab, copying or right-clicking is recorded." },
  {
    icon: ShieldAlert,
    text: `After ${maxViolations} violations your attempt is submitted automatically.`,
  },
  { icon: EyeOff, text: "No webcam, microphone or screen recording is used." },
];

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-semibold">{children}</div>
    </div>
  );
}

/** Rules, summary and system check shown before a proctored exam starts. */
export function ExamIntro({
  quiz,
  courseTitle,
  attemptsLeft,
  maxAttempts,
  minutes,
  maxViolations,
  onStart,
  singleTab = true,
}: ExamIntroProps) {
  const [agreed, setAgreed] = useState(false);

  const sections = new Map<string, number>();
  for (const q of quiz.questions) {
    const key = q.section ?? "Questions";
    sections.set(key, (sections.get(key) ?? 0) + 1);
  }
  const noAttempts = attemptsLeft <= 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className={card} aria-labelledby="exam-intro-title">
          <h1 id="exam-intro-title" className="text-2xl font-semibold">
            Before you begin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{courseTitle} · Proctored exam</p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Sections">
              <ul className="space-y-0.5">
                {[...sections].map(([name, count]) => (
                  <li key={name}>
                    {name} ({count})
                  </li>
                ))}
              </ul>
            </Tile>
            <Tile label="Total marks">{quiz.questions.length}</Tile>
            <Tile label="Time limit">{minutes} min</Tile>
            <Tile label="Attempts left">
              {attemptsLeft} of {maxAttempts}
            </Tile>
          </div>

          <h2 className="mt-6 text-base font-semibold">Rules</h2>
          <ul className="mt-2 space-y-2">
            {rulesFor(minutes, maxViolations).map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-lg bg-muted p-4 text-sm">
            <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />I have read
            and understand the rules.
          </label>

          {noAttempts && (
            <p className="mt-3 text-sm text-destructive">
              You have used all attempts for this assessment.
            </p>
          )}

          <button
            type="button"
            className={`${btn} mt-5 w-full sm:w-auto`}
            disabled={!agreed || noAttempts}
            onClick={onStart}
          >
            Start proctored exam
          </button>
        </section>

        <div className="space-y-6">
          <SystemCheck singleTab={singleTab} />
          <section className={card} aria-labelledby="shortcuts-title">
            <h2 id="shortcuts-title" className="text-base font-semibold">
              Keyboard shortcuts
            </h2>
            <dl className="mt-2 space-y-2 text-sm">
              {[
                ["1–4", "Choose option"],
                ["← →", "Previous / next"],
                ["F", "Flag for review"],
              ].map(([key, what]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <dt>
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {key}
                    </kbd>
                  </dt>
                  <dd className="text-muted-foreground">{what}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
