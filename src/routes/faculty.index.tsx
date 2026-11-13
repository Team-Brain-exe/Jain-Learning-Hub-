import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { usePlatform, statusLabel, type Status } from "@/data/platform";
import { useAuth } from "@/hooks/use-auth";
import { btnOutline, Empty, fmtDate, PageHeader, RequireRole, StatusBadge } from "@/components/studio/ui";

export const Route = createFileRoute("/faculty/")({
  head: () => ({ meta: [{ title: "Review queue — JAIN FET Learning Hub" }, { name: "robots", content: "noindex" }] }),
  component: () => <RequireRole roles={["reviewer", "admin"]}><Queue /></RequireRole>,
});

const filters: ("all" | Status)[] = ["all", "under_review", "changes_requested", "approved", "rejected"];

function Queue() {
  const { user } = useAuth();
  const [f, setF] = useState<(typeof filters)[number]>("under_review");
  const all = usePlatform().submissions.filter((s) => s.status !== "draft");
  const mine = user!.role === "admin" ? all : all.filter((s) => s.reviewerId === user!.id);
  const rows = (f === "all" ? mine : mine.filter((s) => s.status === f)).sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
  return (
    <div>
      <PageHeader eyebrow="Faculty review" title="Review queue" subtitle={user!.role === "admin" ? "All submissions. Assign reviewers from the Admin dashboard." : "Courses assigned to you."} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap gap-2" role="tablist">
          {filters.map((x) => <button key={x} role="tab" aria-selected={f === x} onClick={() => setF(x)} className={`rounded-full border px-3 py-1 text-sm font-semibold ${f === x ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{x === "all" ? "All" : statusLabel[x]} ({(x === "all" ? mine : mine.filter((s) => s.status === x)).length})</button>)}
        </div>
        <div className="mt-6">
          {!rows.length ? <Empty title="Nothing here" body="No submissions match this filter." /> : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {rows.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-56 flex-1"><p className="font-semibold">{s.title}</p><p className="text-xs text-muted-foreground">{s.ownerName} ({s.ownerType}) · submitted {fmtDate(s.submittedAt)} · v{s.version}</p></div>
                  <span className="text-xs text-muted-foreground">AI score: {s.aiReport ? s.aiReport.score : "—"}</span>
                  <span className="text-xs text-muted-foreground">Reviewer: {s.reviewerName ?? "Unassigned"}</span>
                  <StatusBadge status={s.status} />
                  <Link to="/faculty/review/$id" params={{ id: s.id }} className={btnOutline}>Review</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
