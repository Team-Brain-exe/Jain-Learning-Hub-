import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, FileUp, PenLine, UserCheck } from "lucide-react";

export const Route = createFileRoute("/become-a-creator")({
  head: () => ({
    meta: [
      { title: "Become a Creator — JAIN FET Learning Hub" },
      { name: "description", content: "Share your knowledge by creating faculty-reviewed courses." },
      { property: "og:title", content: "Become a Creator — JAIN FET Learning Hub" },
      { property: "og:description", content: "Share your knowledge by creating faculty-reviewed courses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Creator,
});

function Creator() {
  const steps = [[PenLine, "Plan & build", "Outline modules and lessons."], [FileUp, "Submit", "Send your course for review."], [Bot, "AI-assisted checks", "Supporting findings for reviewers."], [UserCheck, "Faculty decision", "Faculty approve before publication."]] as const;
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">Coming soon</span>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight">Knowledge is better when shared.</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Turn what you know into something others can learn. The creator studio opens in an upcoming update — sign in to be ready.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-4">
        {steps.map(([I, t, d]) => (
          <div key={t} className="rounded-xl border border-border bg-card p-5 shadow-card"><I className="h-6 w-6 text-primary" /><p className="mt-3 font-semibold">{t}</p><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>
        ))}
      </div>
      <div className="mt-10 flex gap-3">
        <Link to="/login" className="inline-flex h-12 items-center rounded-md bg-primary px-6 font-semibold text-primary-foreground">Sign in to get started</Link>
        <Link to="/courses" className="inline-flex h-12 items-center rounded-md border border-primary px-6 font-semibold text-primary">Explore Courses</Link>
      </div>
    </div>
  );
}
