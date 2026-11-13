import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { categories } from "@/data/courses";
import { newLesson, newModule, newQuestion, type LessonDraft, type ModuleDraft, type Quiz, type Submission, updateSubmission } from "@/data/platform";
import { btnGhost, btnOutline, card, Field, input } from "./ui";

const move = <T,>(arr: T[], i: number, d: -1 | 1): T[] => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const c = [...arr];
  [c[i], c[j]] = [c[j]!, c[i]!];
  return c;
};

const Lines = ({ label, hint, value, onChange }: { label: string; hint?: string; value: string[]; onChange: (v: string[]) => void }) => (
  <Field label={label} hint={hint ?? "One per line."}>
    <textarea rows={4} className={input} value={value.join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))} />
  </Field>
);

export function DetailsTab({ sub }: { sub: Submission }) {
  const set = (p: Partial<Submission>) => updateSubmission(sub.id, p);
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="md:col-span-2"><Field label="Course title"><input className={input} value={sub.title} maxLength={90} onChange={(e) => set({ title: e.target.value })} /></Field></div>
      <div className="md:col-span-2"><Field label="Description" hint={`${sub.description.length} characters. Say who it's for, what's covered and how learners are assessed.`}><textarea rows={5} className={input} value={sub.description} onChange={(e) => set({ description: e.target.value })} /></Field></div>
      <Field label="Category"><select className={input} value={sub.category} onChange={(e) => set({ category: e.target.value })}>{categories.map((c) => <option key={c.name}>{c.name}</option>)}</select></Field>
      <Field label="Level"><select className={input} value={sub.level} onChange={(e) => set({ level: e.target.value as Submission["level"] })}>{["Beginner", "Intermediate", "Advanced"].map((l) => <option key={l}>{l}</option>)}</select></Field>
      <Field label="Duration (weeks)"><input type="number" min={1} max={52} className={input} value={sub.weeks} onChange={(e) => set({ weeks: Math.max(1, Number(e.target.value) || 1) })} /></Field>
      <Field label="Keywords" hint="Comma separated — helps search."><input className={input} value={sub.keywords.join(", ")} onChange={(e) => set({ keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })} /></Field>
      <Lines label="Learning outcomes" hint="One per line, starting with an action verb." value={sub.outcomes} onChange={(v) => set({ outcomes: v })} />
      <Lines label="Prerequisites" hint="One per line, or write “None”." value={sub.prerequisites} onChange={(v) => set({ prerequisites: v })} />
    </div>
  );
}

function LessonEditor({ l, onChange, onRemove, onMove, first, last }: { l: LessonDraft; onChange: (p: Partial<LessonDraft>) => void; onRemove: () => void; onMove: (d: -1 | 1) => void; first: boolean; last: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1"><Field label="Lesson title"><input className={input} value={l.title} onChange={(e) => onChange({ title: e.target.value })} /></Field></div>
        <div className="w-24"><Field label="Minutes"><input type="number" min={1} className={input} value={l.minutes} onChange={(e) => onChange({ minutes: Math.max(1, Number(e.target.value) || 1) })} /></Field></div>
        <div className="w-32"><Field label="Type"><select className={input} value={l.kind} onChange={(e) => onChange({ kind: e.target.value as LessonDraft["kind"] })}><option value="video">Video</option><option value="reading">Reading</option></select></Field></div>
        <div className="flex gap-1 pb-1">
          <button type="button" aria-label="Move lesson up" disabled={first} onClick={() => onMove(-1)} className={btnGhost}><ArrowUp className="h-4 w-4" /></button>
          <button type="button" aria-label="Move lesson down" disabled={last} onClick={() => onMove(1)} className={btnGhost}><ArrowDown className="h-4 w-4" /></button>
          <button type="button" aria-label="Delete lesson" onClick={onRemove} className={btnGhost}><Trash2 className="h-4 w-4 text-destructive" /></button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2"><Field label="Description"><textarea rows={2} className={input} value={l.description} onChange={(e) => onChange({ description: e.target.value })} /></Field></div>
        {l.kind === "video" && <>
          <Field label="Video URL" hint="Direct .mp4/.webm link or a YouTube/Vimeo link. (File upload arrives with the storage backend.)"><input className={input} placeholder="https://…" value={l.videoUrl} onChange={(e) => onChange({ videoUrl: e.target.value })} /></Field>
          <Field label="Captions URL (.vtt)" hint="Optional."><input className={input} placeholder="https://…/captions.vtt" value={l.captionsUrl} onChange={(e) => onChange({ captionsUrl: e.target.value })} /></Field>
        </>}
        <div className="md:col-span-2"><Field label="Transcript" hint="Optional timestamps like “01:20 text” make the transcript searchable by time."><textarea rows={3} className={input} value={l.transcript} onChange={(e) => onChange({ transcript: e.target.value })} /></Field></div>
      </div>
      <div className="mt-3">
        <p className="text-sm font-semibold">Resources (PDF, slides, links)</p>
        {l.resources.map((r, i) => (
          <div key={i} className="mt-2 flex gap-2">
            <input aria-label="Resource title" className={input + " mt-0 w-1/3"} placeholder="Title" value={r.title} onChange={(e) => onChange({ resources: l.resources.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
            <input aria-label="Resource URL" className={input + " mt-0 flex-1"} placeholder="https://…" value={r.url} onChange={(e) => onChange({ resources: l.resources.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
            <button type="button" aria-label="Remove resource" className={btnGhost} onClick={() => onChange({ resources: l.resources.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" className="mt-2 text-sm font-semibold text-primary" onClick={() => onChange({ resources: [...l.resources, { title: "", url: "" }] })}>+ Add resource</button>
      </div>
    </div>
  );
}

export function CurriculumTab({ sub }: { sub: Submission }) {
  const setMods = (modules: ModuleDraft[]) => updateSubmission(sub.id, { modules });
  const patchMod = (i: number, p: Partial<ModuleDraft>) => setMods(sub.modules.map((m, j) => (j === i ? { ...m, ...p } : m)));
  return (
    <div className="space-y-6">
      {sub.modules.map((m, mi) => (
        <section key={m.id} className={card}>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1"><Field label={`Module ${mi + 1} title`}><input className={input} value={m.title} onChange={(e) => patchMod(mi, { title: e.target.value })} /></Field></div>
            <div className="flex gap-1 pb-1">
              <button type="button" aria-label="Move module up" disabled={mi === 0} className={btnGhost} onClick={() => setMods(move(sub.modules, mi, -1))}><ArrowUp className="h-4 w-4" /></button>
              <button type="button" aria-label="Move module down" disabled={mi === sub.modules.length - 1} className={btnGhost} onClick={() => setMods(move(sub.modules, mi, 1))}><ArrowDown className="h-4 w-4" /></button>
              <button type="button" aria-label="Delete module" className={btnGhost} onClick={() => confirm(`Delete “${m.title}” and its lessons?`) && setMods(sub.modules.filter((_, j) => j !== mi))}><Trash2 className="h-4 w-4 text-destructive" /></button>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {m.lessons.map((l, li) => (
              <LessonEditor key={l.id} l={l} first={li === 0} last={li === m.lessons.length - 1}
                onChange={(p) => patchMod(mi, { lessons: m.lessons.map((x, j) => (j === li ? { ...x, ...p } : x)) })}
                onRemove={() => patchMod(mi, { lessons: m.lessons.filter((_, j) => j !== li) })}
                onMove={(d) => patchMod(mi, { lessons: move(m.lessons, li, d) })} />
            ))}
          </div>
          <button type="button" className={`${btnOutline} mt-4`} onClick={() => patchMod(mi, { lessons: [...m.lessons, newLesson(`Lesson ${m.lessons.length + 1}`)] })}><Plus className="h-4 w-4" />Add lesson</button>
        </section>
      ))}
      <button type="button" className={btnOutline} onClick={() => setMods([...sub.modules, newModule(`Module ${sub.modules.length + 1}`)])}><Plus className="h-4 w-4" />Add module</button>
    </div>
  );
}

export function QuizTab({ sub, defaultPass }: { sub: Submission; defaultPass: number }) {
  const quiz: Quiz = sub.quiz ?? { passMark: defaultPass, maxAttempts: 3, questions: [] };
  const setQuiz = (p: Partial<Quiz>) => updateSubmission(sub.id, { quiz: { ...quiz, ...p } });
  const patchQ = (i: number, p: Partial<Quiz["questions"][number]>) => setQuiz({ questions: quiz.questions.map((q, j) => (j === i ? { ...q, ...p } : q)) });
  return (
    <div className="space-y-6">
      <div className="grid max-w-md grid-cols-2 gap-4">
        <Field label="Pass mark (%)"><input type="number" min={1} max={100} className={input} value={quiz.passMark} onChange={(e) => setQuiz({ passMark: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })} /></Field>
        <Field label="Max attempts"><input type="number" min={1} max={10} className={input} value={quiz.maxAttempts} onChange={(e) => setQuiz({ maxAttempts: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })} /></Field>
      </div>
      {quiz.questions.map((q, qi) => (
        <section key={q.id} className={card}>
          <div className="flex items-start gap-3">
            <div className="flex-1"><Field label={`Question ${qi + 1}`}><textarea rows={2} className={input} value={q.prompt} onChange={(e) => patchQ(qi, { prompt: e.target.value })} /></Field></div>
            <button type="button" aria-label="Delete question" className={btnGhost} onClick={() => setQuiz({ questions: quiz.questions.filter((_, j) => j !== qi) })}><Trash2 className="h-4 w-4 text-destructive" /></button>
          </div>
          <div className="mt-3 space-y-2" role="radiogroup" aria-label="Options (select the correct one)">
            {q.options.map((o, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input type="radio" name={`c-${q.id}`} aria-label={`Option ${oi + 1} is correct`} checked={q.correct === oi} onChange={() => patchQ(qi, { correct: oi })} />
                <input className={input + " mt-0"} placeholder={`Option ${oi + 1}`} value={o} onChange={(e) => patchQ(qi, { options: q.options.map((x, j) => (j === oi ? e.target.value : x)) })} />
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Select the radio next to the correct answer.</p>
          <div className="mt-3"><Field label="Explanation"><input className={input} value={q.explanation} onChange={(e) => patchQ(qi, { explanation: e.target.value })} /></Field></div>
        </section>
      ))}
      <button type="button" className={btnOutline} onClick={() => setQuiz({ questions: [...quiz.questions, newQuestion()] })}><Plus className="h-4 w-4" />Add question</button>
    </div>
  );
}
