import { Link } from "@tanstack/react-router";
import { Award, Compass, PlayCircle } from "lucide-react";
import type { Course } from "@/data/courses";

export interface LearningWelcomeProps {
  userName?: string | null | undefined;
  topResumable?:
    | {
        course: Course;
        lessonId: string;
        lessonTitle?: string | undefined;
      }
    | null
    | undefined;
  hasEnrollments: boolean;
  completedCoursesCount?: number | undefined;
}

export function LearningWelcome({
  userName,
  topResumable,
  hasEnrollments,
  completedCoursesCount = 0,
}: LearningWelcomeProps) {
  const trimmedName = userName?.trim();
  const firstName = trimmedName ? trimmedName.split(/\s+/)[0] : "Learner";

  return (
    <section
      aria-label="Learner Welcome Banner"
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-secondary/30 p-6 shadow-card sm:p-8"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Learner Dashboard
            </span>
            <span className="text-xs text-muted-foreground">JAIN FET Academic Hub</span>
          </div>

          <h1 className="mt-2 break-words text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Welcome back, <span className="text-primary">{firstName}</span>
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {hasEnrollments
              ? "Continue your engineering coursework, build verified technical competencies, and stay on track with your academic milestones."
              : "Discover curriculum-aligned engineering courses, enroll with one click, and begin learning at your own pace."}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs sm:text-sm">
            <span className="text-muted-foreground">
              Progress is stored locally on this device.
            </span>
            {completedCoursesCount > 0 && (
              <Link
                to="/certificates"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
              >
                <Award className="h-4 w-4" />
                View {completedCoursesCount} earned{" "}
                {completedCoursesCount === 1 ? "certificate" : "certificates"}
              </Link>
            )}
            {completedCoursesCount === 0 && hasEnrollments && (
              <Link
                to="/certificates"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
              >
                <Award className="h-4 w-4" />
                Certificates directory
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {topResumable ? (
            <>
              <Link
                to="/learn/$slug/$lessonId"
                params={{
                  slug: topResumable.course.slug,
                  lessonId: topResumable.lessonId,
                }}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <PlayCircle className="h-4 w-4" />
                Continue Learning
              </Link>
              <Link
                to="/courses"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Compass className="h-4 w-4 text-muted-foreground" />
                Browse Catalog
              </Link>
            </>
          ) : hasEnrollments ? (
            <>
              <Link
                to="/courses"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Compass className="h-4 w-4" />
                Explore More Courses
              </Link>
              <Link
                to="/certificates"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-primary/40 bg-card px-4 text-sm font-semibold text-primary transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Award className="h-4 w-4" />
                View Certificates
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/courses"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Compass className="h-4 w-4" />
                Explore Courses
              </Link>
              <Link
                to="/courses/$slug"
                params={{ slug: "python-programming-fundamentals" }}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-primary/40 bg-card px-4 text-sm font-semibold text-primary transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Try Python Fundamentals
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
