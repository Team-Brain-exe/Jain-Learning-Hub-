import { useRef, useState } from "react";
import type { Quiz, QuizQuestion } from "@/data/platform";
import type { ProctorConfig } from "@/data/proctoring";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  clamp,
  DEFAULT_PROCTOR,
  examModeOff,
  setQuestionType,
  toggleCorrect,
  type QuestionType,
} from "@/lib/exam-mode";
import { Field, input } from "./ui";

function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
      <div>
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

/** Number input that holds a free-typed draft and commits the clamped value on blur or Enter. */
function ClampedNumber({
  value,
  min,
  max,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null) onCommit(clamp(draft, min, max));
    setDraft(null);
  };
  return (
    <input
      type="number"
      min={min}
      max={max}
      className={input}
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
    />
  );
}

/** Quiz-level exam-mode switch and proctor settings. Renders nothing extra when exam mode is off. */
export function ExamModeSettings({
  quiz,
  setQuiz,
}: {
  quiz: Quiz;
  setQuiz: (p: Partial<Quiz>) => void;
}) {
  const p = quiz.proctor;
  const setP = (patch: Partial<ProctorConfig>) => p && setQuiz({ proctor: { ...p, ...patch } });
  return (
    <div className="max-w-md space-y-4 rounded-lg border border-border p-4">
      <SwitchRow
        id="exam-mode"
        label="Exam mode (proctored, timed)"
        hint="Opens in a new tab with a timer, fullscreen and tab-switch recording."
        checked={!!p}
        onChange={(on) =>
          on
            ? setQuiz({ proctor: { ...DEFAULT_PROCTOR } })
            : setQuiz({ proctor: undefined, questions: examModeOff(quiz).questions })
        }
      />
      {p && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration (minutes)">
              <ClampedNumber
                min={5}
                max={180}
                value={p.durationMinutes}
                onCommit={(v) => setP({ durationMinutes: v })}
              />
            </Field>
            <Field label="Max warnings before auto-submit">
              <ClampedNumber
                min={1}
                max={10}
                value={p.maxViolations}
                onCommit={(v) => setP({ maxViolations: v })}
              />
            </Field>
          </div>
          <SwitchRow
            id="exam-fs"
            label="Require fullscreen"
            checked={p.requireFullscreen}
            onChange={(v) => setP({ requireFullscreen: v })}
          />
          <SwitchRow
            id="exam-sq"
            label="Shuffle questions"
            checked={!!p.shuffleQuestions}
            onChange={(v) => setP({ shuffleQuestions: v })}
          />
          <SwitchRow
            id="exam-so"
            label="Shuffle options"
            checked={!!p.shuffleOptions}
            onChange={(v) => setP({ shuffleOptions: v })}
          />
        </>
      )}
    </div>
  );
}

const TYPES: { value: QuestionType; label: string }[] = [
  { value: "single", label: "Single choice" },
  { value: "multi", label: "Multiple choice" },
  { value: "truefalse", label: "True or false" },
];

/** Per-question type and section controls (exam mode only). */
export function ExamQuestionFields({
  q,
  onChange,
}: {
  q: QuizQuestion;
  onChange: (next: QuizQuestion) => void;
}) {
  // Options authored before switching to true/false, so switching back does not lose them.
  const stash = useRef<string[] | undefined>(undefined);
  const changeType = (type: QuestionType) => {
    if (type === "truefalse" && q.type !== "truefalse") stash.current = q.options;
    onChange(setQuestionType(q, type, stash.current));
  };
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <Field label="Question type">
        <Select value={q.type ?? "single"} onValueChange={(v) => changeType(v as QuestionType)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Section">
        <input
          className={input}
          placeholder="e.g. A · Basics"
          value={q.section ?? ""}
          onChange={(e) =>
            onChange({ ...q, section: e.target.value.trim() ? e.target.value : undefined })
          }
        />
      </Field>
    </div>
  );
}

/** Option editors for multi and true/false questions. */
export function ExamOptions({
  q,
  onChange,
}: {
  q: QuizQuestion;
  onChange: (next: QuizQuestion) => void;
}) {
  if (q.type === "truefalse") {
    return (
      <div className="mt-3 space-y-2" role="radiogroup" aria-label="Correct answer">
        {["True", "False"].map((label, i) => (
          <label key={label} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={`c-${q.id}`}
              aria-label={label}
              checked={q.correct === i}
              onChange={() => onChange({ ...q, correct: i })}
            />
            {label}
          </label>
        ))}
      </div>
    );
  }
  const all = q.correctAll ?? [];
  return (
    <>
      <div className="mt-3 space-y-2" role="group" aria-label="Options (tick every correct one)">
        {q.options.map((o, oi) => (
          <div key={oi} className="flex items-center gap-2">
            <Checkbox
              aria-label={`Option ${oi + 1} is correct`}
              checked={all.includes(oi)}
              onCheckedChange={() => onChange(toggleCorrect(q, oi))}
            />
            <input
              className={input + " mt-0"}
              placeholder={`Option ${oi + 1}`}
              value={o}
              onChange={(e) =>
                onChange({
                  ...q,
                  options: q.options.map((x, j) => (j === oi ? e.target.value : x)),
                })
              }
            />
          </div>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Tick every correct answer.</p>
      {all.length === 0 && (
        <p className="mt-1 text-xs text-destructive">Tick at least one correct answer.</p>
      )}
    </>
  );
}
