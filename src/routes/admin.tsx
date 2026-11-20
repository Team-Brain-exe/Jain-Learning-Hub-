import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { archiveSubmission, assignReviewer, decideCertificate, publishSubmission, resetDemoData, setUserRole, updatePolicy, usePlatform, type Policy, type Role } from "@/data/platform";
import { useAuth } from "@/hooks/use-auth";
import { ProctoredAttemptsTable } from "@/components/proctor/ProctoredAttemptsTable";
import { btn, btnGhost, btnOutline, card, Empty, fmtDateTime, input, PageHeader, RequireRole, StatusBadge } from "@/components/studio/ui";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — JAIN FET Learning Hub" }, { name: "robots", content: "noindex" }] }),
  component: () => <RequireRole roles={["admin"]}><Admin /></RequireRole>,
});

const tabs = ["Overview", "Submissions", "Users & roles", "Certificates", "Policy", "Audit log"] as const;

function Admin() {
  const { user } = useAuth();
  const s = usePlatform();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const reviewers = s.users.filter((u) => u.role === "reviewer");
  const pendingCerts = s.certificates.filter((c) => c.status === "requested");
  const [policy, setPolicy] = useState<Policy>(s.policy);
  const stat = (label: string, n: number) => <div className={card}><p className="text-3xl font-extrabold text-navy">{n}</p><p className="text-sm text-muted-foreground">{label}</p></div>;

  return (
    <div>
      <PageHeader eyebrow="Administration" title="Admin dashboard" subtitle="Assign reviewers, publish approved courses, authorise certificates and audit activity." />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
          {tabs.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}{t === "Certificates" && pendingCerts.length ? ` (${pendingCerts.length})` : ""}</button>)}
        </div>

        {tab === "Overview" && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {stat("Users", s.users.length)}{stat("Awaiting reviewer", s.submissions.filter((x) => x.status === "submitted").length)}{stat("Under review", s.submissions.filter((x) => x.status === "under_review").length)}{stat("Ready to publish", s.submissions.filter((x) => x.status === "approved").length)}
              {stat("Published (creator)", s.submissions.filter((x) => x.status === "published").length)}{stat("Certificates issued", s.certificates.filter((c) => c.status === "issued").length)}{stat("Pending certificates", pendingCerts.length)}{stat("Quiz attempts", s.attempts.length)}
            </div>
            <button className={btnOutline} onClick={() => { if (confirm("Reset ALL demo data in this browser?")) { resetDemoData(); toast.success("Demo data reset"); } }}>Reset demo data</button>
            <ProctoredAttemptsTable attempts={s.attempts} users={s.users} />
          </div>
        )}

        {tab === "Submissions" && (
          <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
            {s.submissions.filter((x) => x.status !== "draft").map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-56 flex-1"><p className="font-semibold">{x.title}</p><p className="text-xs text-muted-foreground">{x.ownerName} · reviewer: {x.reviewerName ?? "unassigned"}</p></div>
                <StatusBadge status={x.status} />
                {(x.status === "submitted" || x.status === "under_review") && (
                  <select aria-label="Assign reviewer" className={input + " mt-0 w-52"} value={x.reviewerId ?? ""} onChange={(e) => { const err = assignReviewer(x.id, e.target.value, user!); err ? toast.error(err) : toast.success("Reviewer assigned"); }}>
                    <option value="" disabled>Assign reviewer…</option>
                    {reviewers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                )}
                {(x.status === "approved" || x.status === "archived") && <button className={btn} onClick={() => { const e = publishSubmission(x.id, user!); e ? toast.error(e) : toast.success("Published to catalogue"); }}>Publish</button>}
                {x.status === "published" && <button className={btnOutline} onClick={() => { archiveSubmission(x.id, user!); toast.success("Unpublished"); }}>Unpublish</button>}
                <Link to="/faculty/review/$id" params={{ id: x.id }} className={btnGhost}>Inspect</Link>
              </li>
            ))}
            {!s.submissions.some((x) => x.status !== "draft") && <li className="p-6"><Empty title="No submissions yet" /></li>}
          </ul>
        )}

        {tab === "Users & roles" && (
          <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm"><thead className="bg-secondary text-left"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th></tr></thead>
              <tbody>{s.users.map((u) => (
                <tr key={u.id} className="border-t border-border"><td className="p-3 font-medium">{u.name}</td><td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3"><select aria-label={`Role for ${u.name}`} disabled={u.id === user!.id} className={input + " mt-0 w-36"} value={u.role} onChange={(e) => { setUserRole(u.id, e.target.value as Role, user!); toast.success("Role updated"); }}>{(["learner", "creator", "reviewer", "admin"] as Role[]).map((r) => <option key={r}>{r}</option>)}</select></td></tr>
              ))}</tbody></table>
          </div>
        )}

        {tab === "Certificates" && (
          <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
            {s.certificates.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-56 flex-1"><p className="font-semibold">{c.courseTitle}</p><p className="text-xs text-muted-foreground">{c.learnerName} · {c.id} · quiz {c.quizScore ?? "n/a"}{c.quizScore !== undefined ? "%" : ""}</p></div>
                <span className="text-xs font-semibold capitalize">{c.status}</span>
                {c.status === "requested" && <><button className={btn} onClick={() => { decideCertificate(c.id, true, user!); toast.success("Certificate issued"); }}>Authorise</button><button className={btnOutline} onClick={() => decideCertificate(c.id, false, user!)}>Decline</button></>}
              </li>
            ))}
            {!s.certificates.length && <li className="p-6"><Empty title="No certificate requests yet" /></li>}
          </ul>
        )}

        {tab === "Policy" && (
          <form className={`${card} mt-6 max-w-xl space-y-4`} onSubmit={(e) => { e.preventDefault(); updatePolicy(policy, user!); toast.success("Policy saved"); }}>
            <p className="text-sm text-muted-foreground">Rules applied when creators submit courses.</p>
            {([["minDescriptionChars", "Minimum description length"], ["minOutcomes", "Minimum learning outcomes"], ["minLessons", "Minimum lessons"], ["defaultPassMark", "Default quiz pass mark (%)"]] as const).map(([k, l]) => (
              <label key={k} className="block text-sm font-semibold">{l}<input type="number" min={0} className={input} value={policy[k]} onChange={(e) => setPolicy({ ...policy, [k]: Math.max(0, Number(e.target.value) || 0) })} /></label>
            ))}
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={policy.requireQuiz} onChange={(e) => setPolicy({ ...policy, requireQuiz: e.target.checked })} />Require an assessment before submission</label>
            <button className={btn}>Save policy</button>
          </form>
        )}

        {tab === "Audit log" && (
          <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm"><thead className="bg-secondary text-left"><tr><th className="p-3">When</th><th className="p-3">Actor</th><th className="p-3">Action</th><th className="p-3">Target</th></tr></thead>
              <tbody>{s.audit.map((a) => <tr key={a.id} className="border-t border-border"><td className="whitespace-nowrap p-3 text-muted-foreground">{fmtDateTime(a.at)}</td><td className="p-3">{a.actor}</td><td className="p-3 font-medium">{a.action}</td><td className="p-3 text-muted-foreground">{a.target}</td></tr>)}
                {!s.audit.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No events yet.</td></tr>}</tbody></table>
          </div>
        )}
      </div>
    </div>
  );
}
