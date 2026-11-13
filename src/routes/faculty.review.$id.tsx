import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bot } from "lucide-react";
import { reviewDecision, setAiReport, usePlatform } from "@/data/platform";
import { runAiCheck } from "@/lib/ai-check";
import { useAuth } from "@/hooks/use-auth";
import { AiReportView } from "@/components/studio/AiReportView";
import { btn, btnOutline, card, Empty, fmtDateTime, input, RequireRole, StatusBadge } from "@/components/studio/ui";

export const Route = createFileRoute("/faculty/review/$id")({
  head: () => ({ meta: [{ title: "Review course — JAIN FET Learning Hub" }, { name: "robots", content: "noindex" }] }),
  component: () => <RequireRole roles={["reviewer", "admin"]}><Review /></RequireRole>,
});

function Review() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const sub = usePlatform().submissions.find((s) => s.id === id);
  const [text, setText] = useState("");
  if (!sub) return <div className="mx-auto max-w-xl px-4 py-16"><Empty title="Submission not found"><Link to="/faculty" className={btn}>Back to queue</Link></Empty></div>;

  const isOwn = sub.ownerId === user!.id;
  const assigned = user!.role === "admin" || sub.reviewerId === user!.id;
  const canDecide = sub.status === "under_review" && assigned && !isOwn;
  const decide = (d: "approve" | "reject" | "changes") => {
    const err = reviewDecision(sub.id, d, text, user!);
    if (err) return void toast.error(err);
    toast.success("Decision recorded");
    setText("");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link to="/faculty" className="text-sm font-semibold text-primary">← Review queue</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{sub.title}</h1><StatusBadge status={sub.status} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">By {sub.ownerName} ({sub.ownerType}) · {sub.category} · {sub.level} · {sub.weeks} weeks · v{sub.version}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <section className={card}>
            <h2 className="font-bold">Description</h2><p className="mt-2 text-sm">{sub.description}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><h3 className="text-sm font-semibold">Outcomes</h3><ul className="mt-1 list-disc pl-5 text-sm">{sub.outcomes.filter(Boolean).map((o) => <li key={o}>{o}</li>)}</ul></div>
              <div><h3 className="text-sm font-semibold">Prerequisites</h3><ul className="mt-1 list-disc pl-5 text-sm">{sub.prerequisites.filter(Boolean).map((o) => <li key={o}>{o}</li>)}</ul></div>
            </div>
          </section>
          <section>
            <h2 className="font-bold">Modules & lessons</h2>
            <div className="mt-3 space-y-4">
              {sub.modules.map((m) => (
                <div key={m.id} className="rounded-xl border border-border bg-card">
                  <p className="border-b border-border bg-secondary px-4 py-2 font-semibold">{m.title}</p>
                  <ul className="divide-y divide-border">
                    {m.lessons.map((l) => (
                      <li key={l.id} className="space-y-1 px-4 py-3 text-sm">
                        <p className="font-semibold">{l.title} <span className="font-normal text-muted-foreground">· {l.minutes} min · {l.kind}</span></p>
                        {l.description && <p>{l.description}</p>}
                        {l.videoUrl && <a href={l.videoUrl} target="_blank" rel="noreferrer noopener" className="block text-primary underline">Open video</a>}
                        {l.resources.map((r) => <a key={r.url} href={r.url} target="_blank" rel="noreferrer noopener" className="block text-primary underline">{r.title || r.url}</a>)}
                        {l.transcript && <details><summary className="cursor-pointer text-xs font-semibold text-muted-foreground">Transcript</summary><pre className="mt-1 whitespace-pre-wrap text-xs">{l.transcript}</pre></details>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
          {sub.quiz && (
            <section className={card}><h2 className="font-bold">Assessment ({sub.quiz.questions.length} questions · pass {sub.quiz.passMark}%)</h2>
              <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm">{sub.quiz.questions.map((q) => <li key={q.id}>{q.prompt}<ul className="mt-1 list-disc pl-5 text-muted-foreground">{q.options.filter(Boolean).map((o, i) => <li key={i} className={i === q.correct ? "font-semibold text-success" : ""}>{o}{i === q.correct && " ✓"}</li>)}</ul></li>)}</ol>
            </section>
          )}
          <section>
            <div className="flex items-center justify-between"><h2 className="font-bold">AI report</h2><button className={btnOutline} onClick={() => setAiReport(sub.id, runAiCheck(sub))}><Bot className="h-4 w-4" />{sub.aiReport ? "Re-run" : "Run check"}</button></div>
            <div className="mt-3"><AiReportView sub={sub} actor={user} canOverride={canDecide} /></div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className={card}>
            <h2 className="font-bold">Decision</h2>
            {isOwn && <p className="mt-2 text-sm text-destructive">You cannot review your own course.</p>}
            {!isOwn && !assigned && <p className="mt-2 text-sm text-muted-foreground">This course is not assigned to you.</p>}
            {!isOwn && assigned && sub.status !== "under_review" && <p className="mt-2 text-sm text-muted-foreground">Decisions are only possible while a course is under review.</p>}
            <label className="mt-3 block text-sm font-semibold">Feedback to creator<textarea rows={5} className={input} value={text} onChange={(e) => setText(e.target.value)} disabled={!canDecide} placeholder="Required for “Request changes” and “Reject”." /></label>
            <div className="mt-3 grid gap-2">
              <button className={btn} disabled={!canDecide} onClick={() => decide("approve")}>Approve</button>
              <button className={btnOutline} disabled={!canDecide} onClick={() => decide("changes")}>Request changes</button>
              <button className="inline-flex h-10 items-center justify-center rounded-md border border-destructive px-5 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={!canDecide} onClick={() => confirm("Reject this course?") && decide("reject")}>Reject</button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Approval does not publish — an administrator publishes approved courses.</p>
          </div>
          <div className={card}>
            <h3 className="font-bold">Activity</h3>
            <ol className="mt-3 space-y-3 text-sm">{[...sub.feedback].reverse().map((f) => <li key={f.id}><p className="text-xs text-muted-foreground">{fmtDateTime(f.at)} · {f.by}</p><p>{f.text}</p></li>)}</ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
