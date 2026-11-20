import type { ReactNode } from "react";
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
          on ? setQuiz({ proctor: { ...DEFAULT_PROCTOR } }) : updateOff(quiz, setQuiz)
        }
      />
      {p && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration (minutes)">
              <input
                type="number"
                min={5}
                max={180}
                className={input}
                value={p.durationMinutes}
                onChange={(e) => setP({ durationMinutes: clamp(e.target.value, 5, 180) })}
              />
            </Field>
            <Field label="Max warnings before auto-submit">
              <input
                type="number"
                min={1}
                max={10}
                className={input}
                value={p.maxViolations}
                onChange={(e) => setP({ maxViolations: clamp(e.target.value, 1, 10) })}
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

// Turning exam mode off drops the proctor config and normalises question types in one write.
function updateOff(quiz: Quiz, setQuiz: (p: Partial<Quiz>) => void) {
  const off = examModeOff(quiz);
  setQuiz({ proctor: undefined, questions: off.questions });
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
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <Field label="Question type">
        <Select
          value={q.type ?? "single"}
          onValueChange={(v) => onChange(setQuestionType(q, v as QuestionType))}
        >
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
          onChange={(e) => onChange({ ...q, section: e.target.value })}
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
        {q.options.map((o, oi): ReactNode => (
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
    </>
  );
}
