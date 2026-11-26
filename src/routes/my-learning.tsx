import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  GraduationCap,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { courseProgress, flattenLessons, resumeLessonId, type Course } from "@/data/courses";
import { useLearner } from "@/hooks/use-enrollment";
import { useAllCourses } from "@/data/platform";
import { useAuth } from "@/hooks/use-auth";
import { countLessonsCompletedThisWeek, findNextMilestone } from "@/data/learning";
import { LearningWelcome } from "@/components/learning/LearningWelcome";
import { LearningStats } from "@/components/learning/LearningStats";
import { ContinueLearningCard } from "@/components/learning/ContinueLearningCard";
import { LearningActivityPanel } from "@/components/learning/LearningActivityPanel";
import { LearningGoalsPanel } from "@/components/learning/LearningGoalsPanel";

export const Route = createFileRoute("/my-learning")({
  head: () => ({
    meta: [
      { title: "My Learning — JAIN FET Learning Hub" },
      {
        name: "description",
        content: "Your enrolled courses, progress, personal goals and recently accessed lessons.",
      },
      {
        property: "og:title",
        content: "My Learning — JAIN FET Learning Hub",
      },
      {
        property: "og:description",
        content: "Your enrolled courses, progress, personal goals and recently accessed lessons.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyLearning,
});

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progress: ${percent}%`}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function MyLearning() {
  const s = useLearner();
  const courses = useAllCourses();
  const { user } = useAuth();

  // Derive existing data structures safely.
  const enrolledList = Array.isArray(s.enrolled) ? s.enrolled : [];
  const completedMap = s.completed ?? {};
  const completedAtMap = s.completedAt ?? {};
  const lastMap = s.last ?? {};
  const accessedMap = s.accessed ?? {};

  const enrolled = courses.filter((course) => enrolledList.includes(course.slug));

  const withP = enrolled.map((course) => ({
    c: course,
    p: courseProgress(course, completedMap[course.slug]),
    resume: resumeLessonId(course, lastMap[course.slug], completedMap[course.slug]),
  }));

  const inProgress = withP.filter((item) => item.p.percent < 100);
  const done = withP.filter((item) => item.p.percent === 100);

  // Recent activity ordered by accessed timestamp.
  const recent = [...withP]
    .filter((item) => Boolean(lastMap[item.c.slug]))
    .sort((a, b) => (accessedMap[b.c.slug] ?? 0) - (accessedMap[a.c.slug] ?? 0));

  // Top course to resume (only spotlight in-progress courses).
  const top =
    inProgress.length > 0
      ? (recent.find((item) => item.p.percent < 100) ?? inProgress[0])
      : undefined;

  // Lifetime count remains unchanged for the statistics strip.
  const lessonsDone = withP.reduce((count, item) => count + item.p.done, 0);

  // Separate count for the personal weekly goal.
  const weeklyLessonsDone = countLessonsCompletedThisWeek(completedAtMap);

  const getLessonName = (course: Course, id: string) =>
    flattenLessons(course).find((lesson) => lesson.id === id)?.title;

  const nextMilestone = findNextMilestone(
    withP.map((item) => ({
      course: item.c,
      progress: item.p,
    })),
  );

  const recentActivityItems = recent.map(({ c, p }) => ({
    course: c,
    lessonId: lastMap[c.slug]!,
    lessonTitle: getLessonName(c, lastMap[c.slug]!) || `Lesson ${lastMap[c.slug]}`,
    progressPercent: p.percent,
    timestamp: accessedMap[c.slug],
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* M-1: Welcome Header */}
        <LearningWelcome
          userName={user?.name}
          topResumable={
            top
              ? {
                  course: top.c,
                  lessonId: top.resume,
                  lessonTitle: getLessonName(top.c, top.resume),
                }
              : null
          }
          hasEnrollments={enrolled.length > 0}
          completedCoursesCount={done.length}
        />

        {/* M-2: Statistics Strip */}
        <LearningStats
          enrolledCount={enrolled.length}
          lessonsDoneCount={lessonsDone}
          completedCount={done.length}
          inProgressCount={inProgress.length}
        />

        {/* State A: Zero Enrollments Empty State */}
        {!enrolled.length ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center sm:p-14 shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BookOpen className="h-7 w-7" />
            </div>

            <h2 className="mt-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              You haven't enrolled in any courses yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
              Explore the engineering catalogue, view course outcomes and syllabus, and enroll to
              start tracking your modules and certificates here.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/courses"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Compass className="h-4 w-4" />
                Explore Courses
              </Link>

              <Link
                to="/courses/$slug"
                params={{ slug: "python-programming-fundamentals" }}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-primary/30 bg-card px-5 text-sm font-semibold text-primary transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Sparkles className="h-4 w-4" />
                Try Python Fundamentals
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-10">
            {/* M-3: Spotlight Continue Learning Card (State B) */}
            {top && (
              <ContinueLearningCard
                course={top.c}
                resumeLessonId={top.resume}
                nextLessonTitle={getLessonName(top.c, top.resume)}
                progressPercent={top.p.percent}
                completedLessonsCount={top.p.done}
                totalLessonsCount={top.p.total}
              />
            )}

            {/* Dashboard Content Grid */}
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Main Column */}
              <div className="min-w-0 space-y-8 lg:col-span-2">
                {/* In Progress Courses (State B) */}
                <section aria-labelledby="in-progress-heading">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <h2
                        id="in-progress-heading"
                        className="text-lg font-bold tracking-tight text-foreground sm:text-xl"
                      >
                        In Progress Courses
                      </h2>
                    </div>

                    <span className="text-xs font-semibold text-muted-foreground">
                      {inProgress.length} {inProgress.length === 1 ? "course" : "courses"}
                    </span>
                  </div>

                  {inProgress.length > 0 ? (
                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                      {inProgress.map(({ c, p, resume }) => (
                        <div
                          key={c.slug}
                          className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all hover:shadow-hover"
                        >
                          <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                            <img
                              src={c.thumbnail}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />

                            <div className="absolute top-2.5 left-2.5">
                              <span className="rounded-md bg-background/90 px-2 py-0.5 text-[11px] font-semibold text-primary backdrop-blur-xs">
                                {c.category}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-1 flex-col p-5">
                            <Link
                              to="/courses/$slug"
                              params={{ slug: c.slug }}
                              className="font-bold leading-snug text-foreground hover:text-primary transition-colors line-clamp-1"
                            >
                              {c.title}
                            </Link>

                            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                              {c.instructor.name}
                            </p>

                            <div className="mt-4 space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-bold text-foreground">{p.percent}%</span>
                              </div>

                              <ProgressBar percent={p.percent} />

                              <p className="text-[11px] text-muted-foreground">
                                {p.done} of {p.total} lessons complete
                              </p>
                            </div>

                            <div className="mt-5 pt-3 border-t border-border/70">
                              <Link
                                to="/learn/$slug/$lessonId"
                                params={{
                                  slug: c.slug,
                                  lessonId: resume,
                                }}
                                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                <PlayCircle className="h-3.5 w-3.5" />
                                {p.done || lastMap[c.slug] ? "Continue Learning" : "Start Course"}
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-6 text-center">
                      <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        All enrolled courses are completed!
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Great job! Browse the catalog to start a new course.
                      </p>
                      <Link
                        to="/courses"
                        className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground"
                      >
                        Explore Catalog
                      </Link>
                    </div>
                  )}
                </section>

                {/* Completed Courses Section (State C) */}
                <section aria-labelledby="completed-heading">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-amber-600" />
                      <h2
                        id="completed-heading"
                        className="text-lg font-bold tracking-tight text-foreground sm:text-xl"
                      >
                        Completed Courses
                      </h2>
                    </div>

                    <span className="text-xs font-semibold text-muted-foreground">
                      {done.length} {done.length === 1 ? "course" : "courses"}
                    </span>
                  </div>

                  {done.length > 0 ? (
                    <ul className="mt-4 grid gap-4 sm:grid-cols-2" role="list">
                      {done.map(({ c }) => (
                        <li
                          key={c.slug}
                          className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-card sm:p-5"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
                              <CheckCircle2 className="h-5 w-5" />
                            </span>

                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-sm text-foreground line-clamp-1">
                                {c.title}
                              </h3>

                              <p className="text-xs text-muted-foreground">{c.instructor.name}</p>

                              <span className="mt-1 inline-block text-[11px] font-semibold text-success">
                                100% Completed • All lessons finished
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-border/70 text-xs font-semibold">
                            <Link
                              to="/learn/$slug/$lessonId"
                              params={{
                                slug: c.slug,
                                lessonId: "1-1",
                              }}
                              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              Review
                            </Link>

                            <Link
                              to="/certificates"
                              className="inline-flex h-9 items-center gap-1 rounded-md bg-secondary px-3 text-primary hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <Award className="h-3.5 w-3.5 text-amber-600" />
                              Certificate
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        Finish every lesson in a course and your verified completion and certificate
                        link will appear here.
                      </p>
                    </div>
                  )}
                </section>
              </div>

              {/* Sidebar Column */}
              <div className="min-w-0 space-y-8">
                {/* M-5: Learning Goals Panel */}
                <LearningGoalsPanel
                  weeklyLessonsDone={weeklyLessonsDone}
                  completedCoursesCount={done.length}
                  nextMilestone={nextMilestone}
                />

                {/* M-4: Learning Activity Panel */}
                <LearningActivityPanel items={recentActivityItems} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
