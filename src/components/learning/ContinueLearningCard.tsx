import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, CheckCircle, PlayCircle } from "lucide-react";
import type { Course } from "@/data/courses";

export interface ContinueLearningCardProps {
  course: Course;
  resumeLessonId: string;
  nextLessonTitle?: string | undefined;
  progressPercent: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
}

export function ContinueLearningCard({
  course,
  resumeLessonId,
  nextLessonTitle,
  progressPercent,
  completedLessonsCount,
  totalLessonsCount,
}: ContinueLearningCardProps) {
  const isComplete = progressPercent === 100;

  return (
    <section
      aria-label="Continue Learning Spotlight"
      className="overflow-hidden rounded-2xl border border-navy/30 bg-navy text-navy-foreground shadow-card"
    >
      <div className="grid md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]">
        <div className="relative min-w-0 aspect-[16/9] w-full overflow-hidden bg-navy-foreground/10 md:h-full md:aspect-auto">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="h-full w-full object-cover transition duration-300 hover:scale-105"
          />
          <div className="absolute top-3 left-3">
            <span className="rounded-full bg-navy/85 px-2.5 py-1 text-xs font-semibold tracking-wide text-gold backdrop-blur-xs">
              {course.category}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between p-6 sm:p-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gold">
                {isComplete ? "Course Completed" : "Resume Learning"}
              </span>
              <span className="text-xs text-navy-foreground/70">{course.instructor.name}</span>
            </div>

            <h2 className="mt-2 break-words text-xl font-bold tracking-tight text-white sm:text-2xl">
              {course.title}
            </h2>

            <div className="mt-2 flex items-center gap-2 text-sm text-navy-foreground/90 min-w-0">
              <BookOpen className="h-4 w-4 shrink-0 text-gold" />
              <span className="shrink-0 font-medium text-white">
                {isComplete ? "Review From:" : "Next Lesson:"}
              </span>
              <span className="truncate font-semibold text-gold">
                {nextLessonTitle || `Lesson ${resumeLessonId}`}
              </span>
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm text-navy-foreground/80">
                <span>Course Progress</span>
                <span className="font-bold text-white">{progressPercent}%</span>
              </div>
              <div
                className="h-2.5 w-full overflow-hidden rounded-full bg-navy-foreground/20"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progress: ${progressPercent}%`}
              >
                <div
                  className="h-full rounded-full bg-gold transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-navy-foreground/70">
                {completedLessonsCount} of {totalLessonsCount} lessons completed
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/learn/$slug/$lessonId"
              params={{ slug: course.slug, lessonId: resumeLessonId }}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-gold px-6 text-sm font-bold text-navy shadow-sm transition hover:bg-gold/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <PlayCircle className="h-5 w-5" />
              {isComplete ? "Review Course" : "Continue Learning"}
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              to="/courses/$slug"
              params={{ slug: course.slug }}
              className="inline-flex h-11 items-center rounded-lg border border-navy-foreground/30 px-4 text-sm font-medium text-navy-foreground transition hover:bg-navy-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Course Overview
            </Link>

            {isComplete && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                Certificate ready
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
