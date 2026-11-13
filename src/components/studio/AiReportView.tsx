import { useState } from "react";
import { Bot, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { overrideFinding, type AppUser, type Submission } from "@/data/platform";
import { fmtDateTime, input, btnOutline } from "./ui";

const sev = { high: "bg-destructive/10 text-destructive", medium: "bg-warning/15 text-warning", low: "bg-muted text-muted-foreground" } as const;

/** Shows the AI report. `canOverride` lets a reviewer dismiss a finding with a recorded reason. */
export function AiReportView({ sub, actor, canOverride = false }: { sub: Submission; actor?: AppUser | null; canOverride?: boolean }) {
  const r = sub.aiReport;
  const [open, setOpen] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  if (!r) return <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No AI check has been run yet.</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-secondary p-4">
        <Bot className="h-6 w-6 text-primary" />
        <div className="flex-1">
          <p className="font-semibold">Automated check score: {r.score}/100</p>
          <p className="text-xs text-muted-foreground">{r.summary}</p>
          <p className="mt-1 text-xs text-muted-foreground">Provider {r.provider} · {r.version} · {fmtDateTime(r.generatedAt)}</p>
        </div>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldAlert className="h-4 w-4" />AI findings are advisory. Only a faculty reviewer can approve a course.</p>
      <ul className="space-y-3">
        {r.findings.map((f) => {
          const ov = sub.overrides[f.id];
          return (
            <li key={f.id} className={`rounded-lg border border-border bg-card p-4 ${ov ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${sev[f.severity]}`}>{f.severity}</span>
                <span className="text-xs font-semibold text-muted-foreground">{f.area}</span>
                {ov && <span className="text-xs font-semibold text-success">Overridden by reviewer</span>}
              </div>
              <p className="mt-2 text-sm font-medium">{f.message}</p>
              <p className="mt-1 text-sm text-muted-foreground">Suggested fix: {f.suggestion}</p>
              {ov && <p className="mt-2 text-xs italic">Reason: {ov}</p>}
              {canOverride && !ov && (open === f.id ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input className={input + " mt-0 flex-1"} placeholder="Reason for overriding (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
                  <button className={btnOutline} onClick={() => { const err = actor && overrideFinding(sub.id, f.id, reason, actor); if (err) toast.error(err); else { setOpen(null); setReason(""); } }}>Save override</button>
                </div>
              ) : <button className="mt-2 text-xs font-semibold text-primary" onClick={() => { setOpen(f.id); setReason(""); }}>Override this finding</button>)}
            </li>
          );
        })}
        {!r.findings.length && <li className="rounded-lg border border-border bg-card p-4 text-sm">No findings. 🎉</li>}
      </ul>
    </div>
  );
}
