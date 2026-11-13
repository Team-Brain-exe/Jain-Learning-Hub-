import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createDraft, deleteDraft, usePlatform, type Status } from "@/data/platform";
import { useAuth } from "@/hooks/use-auth";
import { btn, btnGhost, btnOutline, Empty, fmtDate, PageHeader, RequireRole, StatusBadge } from "@/components/studio/ui";

export const Route = createFileRoute("/creator/")({
  head: () => ({ meta: [{ title: "Creator Studio — JAIN FET Learning Hub" }, { name: "description", content: "Create, submit and track your courses." }] }),
  component: () => <RequireRole roles={["creator"]}><Studio /></RequireRole>,
});

const groups: { title: string; statuses: Status[] }[] = [
  { title: "Drafts", statuses: ["draft"] },
  { title: "Needs your attention", statuses: ["changes_requested", "rejected"] },
  { title: "In review", statuses: ["submitted", "under_review", "approved"] },
  { title: "Live", statuses: ["published", "archived"] },
];

function Studio() {
  const { user } = useAuth();
  const subs = usePlatform().submissions.filter((s) => s.ownerId === user!.id);
  const navigate = useNavigate();
  const create = () => { const id = createDraft(user!); navigate({ to: "/creator/$id", params: { id } }); };
  return (
    <div>
      <PageHeader eyebrow="Creator Studio" title={`Hello, ${user!.name.split(" ")[0]}`} subtitle="Build a course, run the automated check, submit it for faculty review and track the decision."
        actions={<button className={btn} onClick={create}><Plus className="h-4 w-4" />New course</button>} />
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
        {!subs.length && <Empty title="No courses yet" body="Start with a draft — it autosaves as you type."><button className={btn} onClick={create}>Create your first course</button></Empty>}
        {groups.map((g) => {
          const rows = subs.filter((s) => g.statuses.includes(s.status));
          if (!rows.length) return null;
          return (
            <section key={g.title}>
              <h2 className="text-lg font-bold">{g.title}</h2>
              <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
                {rows.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <div className="min-w-56 flex-1">
                      <p className="font-semibold">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.category} · {s.modules.length} modules · updated {fmtDate(s.updatedAt)}{s.version ? ` · v${s.version}` : ""}</p>
                    </div>
                    <StatusBadge status={s.status} />
                    <Link to="/creator/$id" params={{ id: s.id }} className={btnOutline}>{s.status === "draft" || s.status === "changes_requested" ? "Edit" : "Open"}</Link>
                    {s.status === "published" && s.slug && <Link to="/courses/$slug" params={{ slug: s.slug }} className={btnGhost}>View live</Link>}
                    {s.status === "draft" && <button className={btnGhost} onClick={() => { if (confirm("Delete this draft?")) { deleteDraft(s.id, user!); toast.success("Draft deleted"); } }}>Delete</button>}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
