import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CheckCircle2, Clock, PlayCircle, Trophy } from "lucide-react";
import { courseProgress, flattenLessons, resumeLessonId, type Course } from "@/data/courses";
import { useLearner } from "@/hooks/use-enrollment";
import { useAllCourses } from "@/data/platform";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/my-learning")({
  head: () => ({
    meta: [
      { title: "My Learning — JAIN FET Learning Hub" },
      { name: "description", content: "Your enrolled courses, progress and recently accessed lessons." },
      { property: "og:title", content: "My Learning — JAIN FET Learning Hub" },
      { property: "og:description", content: "Your enrolled courses, progress and recently accessed lessons." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyLearning,
});

function Bar({ percent }: { percent: number }) {
  return <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} /></div>;
}

function MyLearning() {
  const s = useLearner();
  const courses = useAllCourses();
  const { user } = useAuth();
  const enrolled = courses.filter((c) => s.enrolled.includes(c.slug));
  const withP = enrolled.map((c) => ({ c, p: courseProgress(c, s.completed[c.slug]), resume: resumeLessonId(c, s.last[c.slug], s.completed[c.slug]) }));
  const inProgress = withP.filter((x) => x.p.percent < 100);
  const done = withP.filter((x) => x.p.percent === 100);
  const recent = [...withP].filter((x) => s.last[x.c.slug]).sort((a, b) => (s.accessed[b.c.slug] ?? 0) - (s.accessed[a.c.slug] ?? 0));
  const top = recent[0];
  const lessonsDone = withP.reduce((n, x) => n + x.p.done, 0);
  const lessonTitle = (c: Course, id: string) => flattenLessons(c).find((l) => l.id === id)?.title;

  return (
    <div>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-sm font-semibold text-primary">My Learning</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Welcome back, {user ? user.name.split(" ")[0] : "learner"}</h1>
          <p className="mt-2 text-muted-foreground">Pick up where you left off. Progress is a demo saved on this device. <Link to="/certificates" className="font-semibold text-primary">View certificates</Link></p>
          <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-lg">
            {[[BookOpen, enrolled.length, "Enrolled"], [Clock, lessonsDone, "Lessons done"], [Trophy, done.length, "Completed"]].map(([I, n, l]) => {
              const Icon = I as typeof BookOpen;
              return <div key={l as string} className="rounded-lg border border-border bg-background p-3"><Icon className="h-4 w-4 text-primary" /><p className="mt-1 text-xl font-bold text-navy">{n as number}</p><p className="text-xs text-muted-foreground">{l as string}</p></div>;
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
        {!enrolled.length ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-primary" />
            <p className="mt-4 text-lg font-semibold">You haven't enrolled in any courses yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Browse the catalog, open a course and click "Enroll in Course" to start learning.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link to="/courses" className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">Explore Courses</Link>
              <Link to="/courses/$slug" params={{ slug: "python-programming-fundamentals" }} className="inline-flex h-10 items-center rounded-md border border-primary px-5 text-sm font-semibold text-primary">Try Python Fundamentals</Link>
            </div>
          </div>
        ) : (
          <>
            {top && (
              <section className="overflow-hidden rounded-xl border border-border bg-navy text-navy-foreground">
                <div className="grid md:grid-cols-[280px_1fr]">
                  <img src={top.c.thumbnail} alt="" className="hidden h-full w-full object-cover md:block" />
                  <div className="p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-navy-foreground/70">Continue where you left off</p>
                    <p className="mt-1 text-xl font-bold">{top.c.title}</p>
                    <p className="mt-1 text-sm text-navy-foreground/80">Next: {lessonTitle(top.c, top.resume)}</p>
                    <div className="mt-4 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-navy-foreground/20"><div className="h-full rounded-full bg-gold" style={{ width: `${top.p.percent}%` }} /></div><span className="text-sm">{top.p.percent}%</span></div>
                    <Link to="/learn/$slug/$lessonId" params={{ slug: top.c.slug, lessonId: top.resume }} className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-primary-foreground px-5 text-sm font-semibold text-navy hover:bg-secondary">
                      <PlayCircle className="h-4 w-4" /> Continue Learning
                    </Link>
                  </div>
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-bold">In progress</h2>
              {inProgress.length ? (
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {inProgress.map(({ c, p, resume }) => (
                    <div key={c.slug} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card">
                      <img src={c.thumbnail} alt="" loading="lazy" className="aspect-[16/9] w-full border-b border-border object-cover" />
                      <div className="flex flex-1 flex-col p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{c.category}</p>
                        <Link to="/courses/$slug" params={{ slug: c.slug }} className="mt-1 font-bold leading-snug hover:text-primary">{c.title}</Link>
                        <p className="mt-1 text-sm text-muted-foreground">{c.instructor.name}</p>
                        <div className="mt-4 flex items-center gap-3"><Bar percent={p.percent} /><span className="text-sm font-semibold">{p.percent}%</span></div>
                        <p className="mt-1 text-xs text-muted-foreground">{p.done} of {p.total} lessons complete</p>
                        <Link to="/learn/$slug/$lessonId" params={{ slug: c.slug, lessonId: resume }} className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                          {p.done || s.last[c.slug] ? "Continue Learning" : "Start Course"}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-3 text-sm text-muted-foreground">Nothing in progress — great work!</p>}
            </section>

            {recent.length > 0 && (
              <section>
                <h2 className="text-xl font-bold">Recently accessed</h2>
                <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
                  {recent.slice(0, 4).map(({ c, p }) => (
                    <li key={c.slug}>
                      <Link to="/learn/$slug/$lessonId" params={{ slug: c.slug, lessonId: s.last[c.slug]! }} className="flex items-center gap-4 p-4 transition hover:bg-muted">
                        <PlayCircle className="h-5 w-5 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{lessonTitle(c, s.last[c.slug]!)}</p><p className="truncate text-xs text-muted-foreground">{c.title}</p></div>
                        <span className="text-sm text-muted-foreground">{p.percent}%</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="text-xl font-bold">Completed</h2>
              {done.length ? (
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {done.map(({ c }) => (
                    <li key={c.slug} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                      <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
                      <div className="flex-1"><p className="font-semibold">{c.title}</p><p className="text-xs text-muted-foreground">All lessons complete</p></div>
                      <Link to="/learn/$slug/$lessonId" params={{ slug: c.slug, lessonId: "1-1" }} className="text-sm font-semibold text-primary">Review</Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-sm text-muted-foreground">Finish every lesson in a course and it will appear here.</p>}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
