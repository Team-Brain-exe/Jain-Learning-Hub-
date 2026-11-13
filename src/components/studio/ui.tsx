import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { statusLabel, type Role, type Status } from "@/data/platform";

export const input = "mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";
export const btn = "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50";
export const btnOutline = "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary px-5 text-sm font-semibold text-primary transition hover:bg-accent disabled:opacity-50";
export const btnGhost = "inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium text-foreground/80 transition hover:bg-accent hover:text-primary disabled:opacity-40";
export const card = "rounded-xl border border-border bg-card p-5 shadow-card";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      {children}
      {hint && <span className="mt-1 block text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

const tone: Record<Status, string> = {
  draft: "bg-muted text-muted-foreground", submitted: "bg-secondary text-primary", under_review: "bg-warning/15 text-warning",
  changes_requested: "bg-warning/15 text-warning", approved: "bg-success/15 text-success", rejected: "bg-destructive/10 text-destructive",
  published: "bg-success/15 text-success", archived: "bg-muted text-muted-foreground",
};
export const StatusBadge = ({ status }: { status: Status }) => (
  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[status]}`}>{statusLabel[status]}</span>
);

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-8 sm:px-6">
        <div>
          {eyebrow && <p className="text-sm font-semibold text-primary">{eyebrow}</p>}
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>
    </section>
  );
}

/** UI guard only — a real backend must enforce the same rule. */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user)
    return <Blocked title="Sign in required" body="Please sign in to continue."><Link to="/login" className={btn}>Sign in</Link></Blocked>;
  if (!roles.includes(user.role))
    return <Blocked title="You don't have access to this page" body={`This area is for: ${roles.join(" / ")}. You are signed in as ${user.role}.`}><Link to="/login" className={btnOutline}>Switch demo account</Link></Blocked>;
  return <>{children}</>;
}
function Blocked({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <Lock className="mx-auto h-10 w-10 text-primary" />
      <h1 className="mt-4 text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <div className="mt-6 flex justify-center">{children}</div>
    </div>
  );
}

export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
export const fmtDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

export function Empty({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <p className="font-semibold">{title}</p>
      {body && <p className="mt-1 text-sm text-muted-foreground">{body}</p>}
      {children && <div className="mt-4 flex justify-center">{children}</div>}
    </div>
  );
}
