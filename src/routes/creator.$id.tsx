import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { canEdit, setAiReport, statusLabel, submitForReview, toCourse, usePlatform, validateForSubmit } from "@/data/platform";
import { runAiCheck } from "@/lib/ai-check";
import { useAuth } from "@/hooks/use-auth";
import { AiReportView } from "@/components/studio/AiReportView";
import { CurriculumTab, DetailsTab, QuizTab } from "@/components/studio/Builder";
import { btn, btnOutline, card, Empty, fmtDateTime, RequireRole, StatusBadge } from "@/components/studio/ui";

export const Route = createFileRoute("/creator/$id")({
  head: () => ({ meta: [{ title: "Course builder — JAIN FET Learning Hub" }, { name: "robots", content: "noindex" }] }),
  component: () => <RequireRole roles={["creator"]}><Builder /></RequireRole>,
});

const tabs = ["Details", "Curriculum", "Assessment", "Preview", "AI check & review"] as const;

function Builder() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const state = usePlatform();
  const sub = state.submissions.find((s) => s.id === id && s.ownerId === user!.id);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Details");
  const [errors, setErrors] = useState<string[]>([]);
  if (!sub) return <div className="mx-auto max-w-xl px-4 py-16"><Empty title="Course not found"><Link to="/creator" className={btn}>Back to Studio</Link></Empty></div>;

  const editable = canEdit(sub);
  const issues = validateForSubmit(sub, state.policy);
  const submit = () => {
    const errs = submitForReview(sub.id, user!);
    setErrors(errs);
    if (!errs.length) toast.success("Submitted for review", { description: "An administrator will assign a faculty reviewer." });
  };
  const course = toCourse(sub);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link to="/creator" className="inline-flex min-h-10 items-center text-sm font-semibold text-primary">← Creator Studio</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{sub.title || "Untitled course"}</h1>
        <StatusBadge status={sub.status} />
        <span className="text-xs text-muted-foreground">{editable ? `Autosaved ${fmtDateTime(sub.updatedAt)}` : "Read-only while in review"}</span>
      </div>

      {sub.status === "changes_requested" && (
        <div className="mt-4 rounded-lg border border-warning bg-warning/10 p-4 text-sm"><p className="font-semibold">Reviewer asked for changes</p><p className="mt-1">{[...sub.feedback].reverse().find((f) => f.kind === "changes")?.text}</p></div>
      )}
      {sub.status === "rejected" && <div className="mt-4 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm"><p className="font-semibold">Course rejected</p><p className="mt-1">{[...sub.feedback].reverse().find((f) => f.kind === "reject")?.text}</p></div>}

      <div role="tablist" className="mt-6 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>
        ))}
      </div>

      <fieldset disabled={!editable} className="mt-6 min-w-0">
        {tab === "Details" && <DetailsTab sub={sub} />}
        {tab === "Curriculum" && <CurriculumTab sub={sub} />}
        {tab === "Assessment" && <QuizTab sub={sub} defaultPass={state.policy.defaultPassMark} />}
      </fieldset>

      {tab === "Preview" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">This is how learners will see your course once it is approved and published.</p>
          <div className={card}>
            <h2 className="text-2xl font-bold">{course.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{course.category} · {course.level} · {course.weeks} weeks · by {course.instructor.name}</p>
            <p className="mt-4">{course.overview || "No description yet."}</p>
            <h3 className="mt-6 font-semibold">What you'll learn</h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">{course.outcomes.map((o) => <li key={o} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{o}</li>)}</ul>
            <h3 className="mt-6 font-semibold">Curriculum</h3>
            {course.modules.map((m, i) => <div key={i} className="mt-3 rounded-lg border border-border"><p className="bg-secondary px-4 py-2 text-sm font-semibold">{m.title}</p><ul className="divide-y divide-border text-sm">{m.lessons.map((l, j) => <li key={j} className="flex justify-between px-4 py-2"><span>{l.title}</span><span className="text-muted-foreground">{l.minutes} min</span></li>)}</ul></div>)}
          </div>
        </div>
      )}

      {tab === "AI check & review" && (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">AI-assisted check</h2>
              <button className={btnOutline} onClick={() => { setAiReport(sub.id, runAiCheck(sub)); toast.success("Check complete"); }}><Bot className="h-4 w-4" />{sub.aiReport ? "Re-run check" : "Run check"}</button>
            </div>
            <AiReportView sub={sub} />
          </div>
          <aside className="space-y-4">
            <div className={card}>
              <h3 className="font-bold">Submission checklist</h3>
              {issues.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{issues.map((i) => <li key={i}>{i}</li>)}</ul> : <p className="mt-3 flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" />Everything required is filled in.</p>}
              {errors.length > 0 && <p className="mt-3 text-xs font-semibold text-destructive">Fix the items above before submitting.</p>}
              <button className={`${btn} mt-4 w-full`} disabled={!editable} onClick={submit}><Send className="h-4 w-4" />{sub.status === "changes_requested" ? "Resubmit for review" : "Submit for review"}</button>
              {!editable && <p className="mt-2 text-xs text-muted-foreground">Status: {statusLabel[sub.status]}.</p>}
            </div>
            <div className={card}>
              <h3 className="font-bold">History</h3>
              <ol className="mt-3 space-y-3 text-sm">
                {[...sub.feedback].reverse().map((f) => <li key={f.id}><p className="text-xs text-muted-foreground">{fmtDateTime(f.at)} · {f.by}</p><p>{f.text}</p></li>)}
                {!sub.feedback.length && <li className="text-muted-foreground">No activity yet.</li>}
              </ol>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
