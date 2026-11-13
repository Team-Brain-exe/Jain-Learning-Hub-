import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { updateProfile } from "@/data/platform";
import { signOut, useAuth } from "@/hooks/use-auth";
import { btn, btnOutline, card, Field, input, PageHeader, RequireRole } from "@/components/studio/ui";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — JAIN FET Learning Hub" }, { name: "robots", content: "noindex" }] }),
  component: () => <RequireRole roles={["learner", "creator", "reviewer", "admin"]}><Profile /></RequireRole>,
});

function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState(user!.name);
  const [dept, setDept] = useState(user!.department ?? "");
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader eyebrow="Account" title="Profile settings" />
      <div className="mx-auto max-w-xl space-y-6 px-4 py-8 sm:px-6">
        <form className={`${card} space-y-4`} onSubmit={(e) => { e.preventDefault(); if (name.trim().length < 2) return void toast.error("Enter your name."); updateProfile(user!.id, { name: name.trim(), department: dept.trim() }); toast.success("Profile updated"); }}>
          <Field label="Full name (shown on certificates)"><input className={input} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Programme / department"><input className={input} value={dept} onChange={(e) => setDept(e.target.value)} /></Field>
          <Field label="Email"><input className={input} value={user!.email} disabled /></Field>
          <p className="text-sm text-muted-foreground">Role: <span className="font-semibold capitalize">{user!.role}</span></p>
          <button className={btn}>Save changes</button>
        </form>
        <button className={btnOutline} onClick={() => { signOut(); toast.success("Signed out"); navigate({ to: "/" }); }}>Sign out</button>
      </div>
    </div>
  );
}
