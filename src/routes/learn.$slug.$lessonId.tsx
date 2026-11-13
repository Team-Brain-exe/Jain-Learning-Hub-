import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Circle, FileText, Maximize, PanelLeftClose, PanelLeftOpen, Play, Settings, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { courseProgress, flattenLessons, lessonContent, type Course, type FlatLesson } from "@/data/courses";
import { allCourses, findCourse, getQuiz, usePlatform } from "@/data/platform";
import { LessonVideo } from "@/components/courses/LessonVideo";
import { setLessonComplete, useLearner, visitLesson } from "@/hooks/use-enrollment";

export const Route = createFileRoute("/learn/$slug/$lessonId")({
  loader: ({ params }) => {
    const course = findCourse(params.slug);
    const lesson = course && flattenLessons(course).find((l) => l.id === params.lessonId);
    if (!course || !lesson) { if (typeof window === "undefined") return { course: null as Course | null, lesson: null as FlatLesson | null }; throw notFound(); }
    return { course: course as Course | null, lesson: lesson as FlatLesson | null };
  },
  head: ({ loaderData }) => ({
    meta: loaderData?.course && loaderData.lesson
      ? [
          { title: `${loaderData.lesson.title} · ${loaderData.course.title} — JAIN FET Learning Hub` },
          { name: "description", content: `Lesson: ${loaderData.lesson.title} in ${loaderData.course.title}.` },
          { property: "og:title", content: `${loaderData.lesson.title} · ${loaderData.course.title}` },
          { property: "og:description", content: `Lesson from ${loaderData.course.title} on JAIN FET Learning Hub.` },
          { property: "og:type", content: "article" },
          { name: "twitter:card", content: "summary" },
          { name: "robots", content: "noindex" },
        ]
      : [{ title: "Lesson unavailable — JAIN FET Learning Hub" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Lesson not found</h1>
      <Link to="/my-learning" className="mt-4 inline-block font-semibold text-primary">Back to My Learning</Link>
    </div>
  ),
  component: LessonPage,
});

function VideoPlaceholder({ title, minutes }: { title: string; minutes: number }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-navy text-navy-foreground">
      <span className="absolute left-4 top-4 rounded-md bg-gold px-2 py-1 text-xs font-bold text-navy">Video placeholder</span>
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <button
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause placeholder" : "Play placeholder"}
          className="grid h-16 w-16 place-items-center rounded-full bg-primary-foreground text-navy transition hover:scale-105"
        >
          {playing ? <span className="flex gap-1.5"><span className="h-6 w-1.5 rounded bg-navy" /><span className="h-6 w-1.5 rounded bg-navy" /></span> : <Play className="ml-1 h-7 w-7 fill-current" />}
        </button>
        <div>
          <p className="text-lg font-semibold">{title}</p>
          <p className="mt-1 text-sm text-navy-foreground/70">
            {playing ? "Lesson video not yet uploaded — this is a demo player." : "The lesson video will appear here once published."}
          </p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy to-transparent px-4 pb-3 pt-8">
        <div className="h-1 w-full rounded-full bg-navy-foreground/25"><div className={`h-full rounded-full bg-primary transition-all duration-700 ${playing ? "w-1/4" : "w-0"}`} /></div>
        <div className="mt-2 flex items-center gap-4 text-xs text-navy-foreground/80">
          <Play className="h-4 w-4" /><Volume2 className="h-4 w-4" />
          <span>0:00 / {minutes}:00</span>
          <span className="ml-auto flex items-center gap-4"><Settings className="h-4 w-4" /><Maximize className="h-4 w-4" /></span>
        </div>
      </div>
    </div>
  );
}

function LessonPage() {
  const data = Route.useLoaderData();
  const { slug, lessonId } = Route.useParams();
  const state = usePlatform();
  const course = data.course ?? allCourses(state).find((c) => c.slug === slug);
  const lesson = data.lesson ?? (course ? flattenLessons(course).find((l) => l.id === lessonId) : undefined);
  if (!course || !lesson) return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Lesson not found</h1>
      <Link to="/my-learning" className="mt-4 inline-block font-semibold text-primary">Back to My Learning</Link>
    </div>
  );
  return <LessonView course={course} lesson={lesson} />;
}

function LessonView({ course, lesson }: { course: Course; lesson: FlatLesson }) {
  const hasQuiz = !!getQuiz(course.slug, usePlatform());
  const navigate = useNavigate();
  const state = useLearner();
  const completed = state.completed[course.slug] ?? [];
  const lessons = useMemo(() => flattenLessons(course), [course]);
  const prev = lessons[lesson.index - 1];
  const next = lessons[lesson.index + 1];
  const isDone = completed.includes(lesson.id);
  const progress = courseProgress(course, completed);
  const content = lessonContent(course, lesson);
  const [tab, setTab] = useState<"overview" | "resources" | "transcript">("overview");
  const [sidebar, setSidebar] = useState(true);
  const [mobileCurriculum, setMobileCurriculum] = useState(false);
  const [openModules, setOpenModules] = useState<number[]>([lesson.moduleIndex]);

  useEffect(() => {
    visitLesson(course.slug, lesson.id);
    setOpenModules((o) => (o.includes(lesson.moduleIndex) ? o : [...o, lesson.moduleIndex]));
    setTab("overview");
    setMobileCurriculum(false);
  }, [course.slug, lesson.id, lesson.moduleIndex]);

  const go = (id: string) => navigate({ to: "/learn/$slug/$lessonId", params: { slug: course.slug, lessonId: id } });
  const toggleDone = () => {
    setLessonComplete(course.slug, lesson.id, !isDone);
    if (!isDone) toast.success("Lesson marked complete", { description: next ? `Up next: ${next.title}` : "You've reached the end of the course." });
  };

  const curriculum = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Course progress</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress.percent}%` }} /></div>
          <span className="text-sm font-semibold">{progress.percent}%</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{progress.done} of {progress.total} lessons complete</p>
        {hasQuiz && <Link to="/learn/$slug/quiz" params={{ slug: course.slug }} className="mt-3 inline-flex h-8 items-center rounded-md border border-primary px-3 text-xs font-semibold text-primary hover:bg-accent">Take final assessment</Link>}
      </div>
      <div className="flex-1 overflow-y-auto">
        {course.modules.map((m, mi) => {
          const open = openModules.includes(mi);
          const mLessons = lessons.filter((l) => l.moduleIndex === mi);
          const mDone = mLessons.filter((l) => completed.includes(l.id)).length;
          return (
            <div key={m.title} className="border-b border-border">
              <button
                aria-expanded={open}
                onClick={() => setOpenModules(open ? openModules.filter((x) => x !== mi) : [...openModules, mi])}
                className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left hover:bg-muted"
              >
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">MODULE {mi + 1} · {mDone}/{mLessons.length}</p>
                  <p className="mt-0.5 text-sm font-semibold">{m.title}</p>
                </div>
                <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-primary transition ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <ul className="pb-2">
                  {mLessons.map((l) => {
                    const current = l.id === lesson.id;
                    const done = completed.includes(l.id);
                    return (
                      <li key={l.id}>
                        <Link
                          to="/learn/$slug/$lessonId"
                          params={{ slug: course.slug, lessonId: l.id }}
                          aria-current={current ? "page" : undefined}
                          className={`flex items-start gap-3 border-l-4 py-2.5 pl-4 pr-4 text-sm transition ${current ? "border-primary bg-secondary font-semibold text-primary" : "border-transparent hover:bg-muted"}`}
                        >
                          {done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                          <span className="flex-1">{l.title}</span>
                          <span className="text-xs font-normal text-muted-foreground">{l.minutes}m</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="bg-card">
      <div className="border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => setSidebar((s) => !s)} aria-label={sidebar ? "Hide curriculum" : "Show curriculum"} className="hidden h-9 w-9 place-items-center rounded-md hover:bg-accent lg:grid">
            {sidebar ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </button>
          <Link to="/my-learning" className="flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> My Learning</Link>
          <span className="hidden text-muted-foreground sm:inline">/</span>
          <Link to="/courses/$slug" params={{ slug: course.slug }} className="hidden truncate text-sm font-medium hover:text-primary sm:inline">{course.title}</Link>
          <button onClick={() => setMobileCurriculum(true)} className="ml-auto rounded-md border border-border px-3 py-1.5 text-sm font-semibold lg:hidden">Curriculum · {progress.percent}%</button>
        </div>
      </div>

      <div className="flex">
        {sidebar && <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-80 shrink-0 border-r border-border lg:block">{curriculum}</aside>}

        {mobileCurriculum && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="h-full w-[85%] max-w-sm bg-card shadow-hover">
              <div className="flex items-center justify-between border-b border-border p-4"><p className="font-bold">Curriculum</p><button aria-label="Close curriculum" onClick={() => setMobileCurriculum(false)}><X className="h-5 w-5" /></button></div>
              <div className="h-[calc(100%-57px)]">{curriculum}</div>
            </div>
            <button aria-label="Close curriculum" className="flex-1 bg-foreground/40" onClick={() => setMobileCurriculum(false)} />
          </div>
        )}

        <div className="min-w-0 flex-1 bg-background">
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
            <p className="text-sm font-semibold text-primary">{course.title}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{lesson.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Module {lesson.moduleIndex + 1}: {lesson.moduleTitle} · Video · {lesson.minutes} min</p>

            <div className="mt-5">{lesson.videoUrl ? <LessonVideo url={lesson.videoUrl} captionsUrl={lesson.captionsUrl} title={lesson.title} /> : <VideoPlaceholder title={lesson.title} minutes={lesson.minutes} />}</div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button disabled={!prev} onClick={() => prev && go(prev.id)} className="inline-flex h-10 items-center gap-1 rounded-md border border-border bg-card px-4 text-sm font-semibold disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                onClick={toggleDone}
                className={`inline-flex h-10 items-center gap-2 rounded-md px-5 text-sm font-semibold transition ${isDone ? "border border-success bg-card text-success" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
              >
                <Check className="h-4 w-4" /> {isDone ? "Completed · Mark incomplete" : "Mark as Complete"}
              </button>
              <button disabled={!next} onClick={() => next && go(next.id)} className="ml-auto inline-flex h-10 items-center gap-1 rounded-md border border-primary bg-card px-4 text-sm font-semibold text-primary disabled:opacity-40">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 rounded-xl border border-border bg-card">
              <div role="tablist" className="flex border-b border-border px-2">
                {(["overview", "resources", "transcript"] as const).map((t) => (
                  <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold capitalize transition ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="p-6">
                {tab === "overview" && <p className="leading-relaxed text-foreground/85">{content.description}</p>}
                {tab === "resources" && (
                  <ul className="space-y-3">
                    {content.resources.length === 0 && <li className="text-sm text-muted-foreground">No resources attached to this lesson.</li>}
                    {content.resources.map((r) => (
                      <li key={r.title}>
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noreferrer noopener" className="flex w-full items-center gap-3 rounded-lg border border-border p-4 text-left transition hover:border-primary">
                            <span className="grid h-10 w-10 place-items-center rounded-md bg-secondary text-primary"><FileText className="h-5 w-5" /></span>
                            <span className="flex-1"><span className="block text-sm font-semibold">{r.title}</span><span className="break-all text-xs text-muted-foreground">{r.kind} · opens in a new tab</span></span>
                          </a>
                        ) : <button onClick={() => toast.info("Sample resource", { description: "Downloadable materials will be added when the course is published." })} className="flex w-full items-center gap-3 rounded-lg border border-border p-4 text-left transition hover:border-primary">
                          <span className="grid h-10 w-10 place-items-center rounded-md bg-secondary text-primary"><FileText className="h-5 w-5" /></span>
                          <span className="flex-1"><span className="block text-sm font-semibold">{r.title}</span><span className="text-xs text-muted-foreground">{r.kind} · {r.meta}</span></span>
                        </button>}
                      </li>
                    ))}
                  </ul>
                )}
                {tab === "transcript" && (
                  <div>
                    {!content.real && <p className="mb-4 rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-navy">Sample transcript — the real transcript will be added by the course creator.</p>}
                    {content.real && content.transcript.length === 0 && <p className="text-sm text-muted-foreground">No transcript provided for this lesson.</p>}
                    <ul className="space-y-3">
                      {content.transcript.map(([t, line]) => (
                        <li key={t + line} className="flex gap-4 text-sm"><span className="w-12 shrink-0 font-mono text-primary">{t}</span><span className="text-foreground/85">{line}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Progress is saved on this device only (demo).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
