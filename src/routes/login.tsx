import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, GraduationCap, PenLine, ShieldCheck, UserCheck } from "lucide-react";
import { JgiLogo } from "@/components/layout/Brand";
import { signInByEmail, signInDemo, signOut, useAuth } from "@/hooks/use-auth";
import { homeFor, usePlatform } from "@/data/platform";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — JAIN FET Learning Hub" },
      { name: "description", content: "Sign in to JAIN FET Learning Hub." },
      { property: "og:title", content: "Sign In — JAIN FET Learning Hub" },
      { property: "og:description", content: "Sign in to JAIN FET Learning Hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

const icons = { learner: GraduationCap, creator: PenLine, reviewer: UserCheck, admin: ShieldCheck } as const;

function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const users = usePlatform().users;
  const field = "mt-1.5 h-11 w-full rounded-md border border-border bg-card px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  const go = (id: string) => {
    const u = users.find((x) => x.id === id)!;
    signInDemo(id);
    toast.success(`Signed in as ${u.name}`, { description: `Demo ${u.role} account.` });
    navigate({ to: homeFor(u.role) });
  };
  return (
    <div className="flex justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
        <div className="flex items-center gap-3"><JgiLogo className="h-12 w-12" /><div><p className="font-bold text-primary">JAIN FET Learning Hub</p><p className="text-xs text-muted-foreground">Faculty of Engineering and Technology</p></div></div>
        <h1 className="mt-8 text-2xl font-bold">{user ? `Signed in as ${user.name}` : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user ? "Switch account below or sign out." : "Sign in to continue learning."}</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const u = signInByEmail(email);
          if (!u) { toast.error("No demo account with that email.", { description: "Use one of the demo accounts below." }); return; }
          navigate({ to: homeFor(u.role) });
        }}>
          <label className="block text-sm font-semibold">Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="learner@demo.jain.edu" className={field} /></label>
          <label className="block text-sm font-semibold">Password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Not checked in demo mode" className={field} /></label>
          <button className="h-11 w-full rounded-md bg-primary font-semibold text-primary-foreground hover:bg-primary/90">Sign In</button>
        </form>
        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
        <button disabled className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border text-sm font-semibold text-muted-foreground"><Building2 className="h-4 w-4" />University account (SSO) — coming soon</button>
        <div className="mt-6 rounded-lg border border-border bg-secondary p-4">
          <p className="text-sm font-semibold text-navy">Demo accounts</p>
          <p className="mt-1 text-xs text-muted-foreground">Demo mode only: no password is checked and data stays in this browser. Pick a role to walk through the whole workflow.</p>
          <div className="mt-3 grid gap-2">
            {users.map((u) => {
              const I = icons[u.role];
              return (
                <button key={u.id} onClick={() => go(u.id)} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-left text-sm transition hover:border-primary">
                  <I className="h-4 w-4 text-primary" /><span className="flex-1"><span className="block font-semibold">{u.name}</span><span className="text-xs capitalize text-muted-foreground">{u.role}{u.creatorType ? ` · ${u.creatorType}` : ""}</span></span>
                  {user?.id === u.id && <span className="text-xs font-semibold text-success">Active</span>}
                </button>
              );
            })}
          </div>
          {user && <button onClick={() => { signOut(); toast.success("Signed out"); }} className="mt-3 text-sm font-semibold text-primary">Sign out</button>}
          {!user && <Link to="/my-learning" className="mt-1 inline-flex min-h-10 items-center text-xs text-muted-foreground underline">Continue as guest</Link>}
        </div>
      </div>
    </div>
  );
}
