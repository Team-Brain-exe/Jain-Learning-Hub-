import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { JgiLogo } from "@/components/layout/Brand";

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

function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const field = "mt-1.5 h-11 w-full rounded-md border border-border bg-card px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  return (
    <div className="flex justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
        <div className="flex items-center gap-3"><JgiLogo className="h-12 w-12" /><div><p className="font-bold text-primary">JAIN FET Learning Hub</p><p className="text-xs text-muted-foreground">Faculty of Engineering and Technology</p></div></div>
        <h1 className="mt-8 text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to continue learning.</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); toast.info("Account sign-in is coming in a future update.", { description: "Try Demo Access below to explore." }); }}>
          <label className="block text-sm font-semibold">Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@jainuniversity.ac.in" className={field} /></label>
          <label className="block text-sm font-semibold">Password<input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} className={field} /></label>
          <div className="text-right"><button type="button" onClick={() => toast.info("Password reset will be available with university accounts.")} className="text-sm font-semibold text-primary">Forgot password?</button></div>
          <button className="h-11 w-full rounded-md bg-primary font-semibold text-primary-foreground hover:bg-primary/90">Sign In</button>
        </form>
        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
        <button disabled className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border text-sm font-semibold text-muted-foreground"><Building2 className="h-4 w-4" />University account (SSO) — coming soon</button>
        <div className="mt-6 rounded-lg border border-border bg-secondary p-4">
          <p className="text-sm font-semibold text-navy">Demo access</p>
          <p className="mt-1 text-xs text-muted-foreground">Explore as a learner without an account. Role-based demos (creator, faculty) arrive in later updates.</p>
          <Link to="/my-learning" className="mt-3 inline-flex h-9 items-center rounded-md bg-navy px-4 text-sm font-semibold text-navy-foreground">Continue as demo learner</Link>
        </div>
      </div>
    </div>
  );
}
