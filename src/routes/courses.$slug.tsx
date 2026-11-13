import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CheckCircle2, ChevronDown, Clock, PlayCircle, Star, Users, BarChart, Layers } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { allCourses, findCourse, usePlatform } from "@/data/platform";
import type { Course } from "@/data/courses";
import { LevelBadge } from "@/components/courses/CourseCard";
import { enroll, useEnrollments } from "@/hooks/use-enrollment";

export const Route = createFileRoute("/courses/$slug")({
  loader: ({ params }) => {
    const course = findCourse(params.slug);
    // Creator-published courses live in browser storage, so on the server they resolve client-side.
    if (!course) { if (typeof window === "undefined") return { course: null as Course | null }; throw notFound(); }
    return { course: course as Course | null };
  },
  head: ({ loaderData }) => ({
    meta: loaderData?.course
      ? [
          { title: `${loaderData.course.title} — JAIN FET Learning Hub` },
          { name: "description", content: loaderData.course.description },
          { property: "og:title", content: loaderData.course.title },
          { property: "og:description", content: loaderData.course.description },
          { property: "og:type", content: "article" },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [{ title: "Course not found — JAIN FET Learning Hub" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Course not found</h1>
      <Link to="/courses" className="mt-4 inline-block font-semibold text-primary">Browse all courses</Link>
    </div>
  ),
  component: CourseDetail,
});

function CourseDetail() {
  const { course: loaded } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const state = usePlatform();
  const course = loaded ?? allCourses(state).find((c) => c.slug === slug);
  if (!course) return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Course not found</h1>
      <Link to="/courses" className="mt-4 inline-block font-semibold text-primary">Browse all courses</Link>
    </div>
  );
  return <CourseView course={course} />;
}

function CourseView({ course }: { course: Course }) {
  const enrolled = useEnrollments().includes(course.slug);
  const [open, setOpen] = useState<number[]>([0]);
  const total = course.modules.reduce((n, m) => n + m.lessons.length, 0);

  const onEnroll = () => {
    enroll(course.slug);
    toast.success(`You're enrolled in ${course.title}`, { description: "Demo enrollment saved on this device. Find it in My Learning." });
  };

  return (
    <div>
      <section className="border-b border-border bg-secondary">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px]">
          <div>
            <nav className="text-sm text-muted-foreground">
              <Link to="/courses" className="hover:text-primary">Courses</Link> ›{" "}
              <Link to="/courses" search={{ category: course.category }} className="hover:text-primary">{course.category}</Link>
            </nav>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{course.title}</h1>
            <p className="mt-4 max-w-2xl text-lg text-foreground/80">{course.description}</p>
            <div className="mt-6 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-navy text-sm font-bold text-navy-foreground">
                {course.instructor.name.replace(/^(Dr\.|Prof\.)\s/, "").split(" ").map((p) => p[0]).join("")}
              </span>
              <div>
                <p className="text-sm">Instructor: <span className="font-semibold text-primary">{course.instructor.name}</span></p>
                <p className="text-xs text-muted-foreground">{course.instructor.role}</p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {enrolled ? (
                <Link to="/my-learning" className="inline-flex h-12 items-center gap-2 rounded-md bg-success px-8 font-semibold text-primary-foreground">
                  <CheckCircle2 className="h-5 w-5" /> Enrolled · Go to My Learning
                </Link>
              ) : (
                <button onClick={onEnroll} className="inline-flex h-12 items-center rounded-md bg-primary px-8 font-semibold text-primary-foreground transition hover:bg-primary/90">
                  Enroll in Course
                </button>
              )}
            </div>
            <p className="mt-3 text-sm text-muted-foreground"><span className="font-semibold text-foreground">{course.learners.toLocaleString()}</span> already enrolled</p>
          </div>
          <img src={course.thumbnail} alt={course.title} width={1024} height={640} className="hidden aspect-[16/10] w-full rounded-xl border border-border object-cover shadow-card lg:block" />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mt-px grid grid-cols-2 divide-border rounded-b-xl border border-t-0 border-border bg-card shadow-card md:grid-cols-4 md:divide-x">
          {[
            [Layers, `${course.modules.length} modules`, `${total} lessons`],
            [BarChart, `${course.level} level`, course.category],
            [Clock, `${course.weeks} weeks`, "Learn at your own pace"],
            [Star, course.rating ? `${course.rating} rating` : "New course", course.type],
          ].map(([Icon, t, s]) => {
            const I = Icon as typeof Star;
            return (
              <div key={t as string} className="flex items-start gap-3 p-5">
                <I className="mt-0.5 h-5 w-5 text-primary" />
                <div><p className="font-semibold">{t as string}</p><p className="text-sm text-muted-foreground">{s as string}</p></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-bold">What you'll learn</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {course.outcomes.map((o) => (
                <li key={o} className="flex gap-2.5 text-sm"><CheckCircle2 className="h-5 w-5 shrink-0 text-success" />{o}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">About this course</h2>
            <p className="mt-3 text-foreground/80">{course.overview}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Prerequisites</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-foreground/80">
              {course.prerequisites.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </section>

          <section>
            <div className="flex items-end justify-between">
              <h2 className="text-xl font-bold">Course curriculum</h2>
              <button onClick={() => setOpen(open.length === course.modules.length ? [] : course.modules.map((_, i) => i))} className="text-sm font-semibold text-primary">
                {open.length === course.modules.length ? "Collapse all" : "Expand all"}
              </button>
            </div>
            <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {course.modules.map((m, i) => {
                const isOpen = open.includes(i);
                const mins = m.lessons.reduce((n, l) => n + l.minutes, 0);
                return (
                  <div key={m.title}>
                    <button
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? open.filter((x) => x !== i) : [...open, i])}
                      className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-muted"
                    >
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">MODULE {i + 1}</p>
                        <p className="mt-0.5 font-semibold">{m.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{m.lessons.length} lessons · {mins} min</p>
                      </div>
                      <ChevronDown className={`h-5 w-5 shrink-0 text-primary transition ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <ul className="border-t border-border bg-background px-5 py-2">
                        {m.lessons.map((l) => (
                          <li key={l.title} className="flex items-center justify-between py-2.5 text-sm">
                            <span className="flex items-center gap-2.5"><PlayCircle className="h-4 w-4 text-primary" />{l.title}</span>
                            <span className="text-muted-foreground">{l.minutes} min</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <LevelBadge level={course.level} />
            <p className="mt-3 font-bold">{course.title}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Users className="h-4 w-4" />{course.learners.toLocaleString()} learners</p>
            {enrolled ? (
              <Link to="/my-learning" className="mt-5 flex h-11 items-center justify-center rounded-md bg-success text-sm font-semibold text-primary-foreground">Enrolled ✓</Link>
            ) : (
              <button onClick={onEnroll} className="mt-5 h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90">Enroll in Course</button>
            )}
            <p className="mt-3 text-xs text-muted-foreground">Demo enrollment — saved on this device only.</p>
          </div>
          {course.type === "Student Creator" && (
            <div className="rounded-xl border border-border bg-card p-5 text-sm">
              <p className="font-semibold text-success">Faculty reviewed</p>
              <p className="mt-1 text-muted-foreground">Created by a student and approved by faculty after AI-assisted checks.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
