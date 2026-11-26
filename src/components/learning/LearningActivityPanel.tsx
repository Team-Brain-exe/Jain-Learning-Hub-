import { Link } from "@tanstack/react-router";
import { Clock, PlayCircle, History, ExternalLink } from "lucide-react";
import type { Course } from "@/data/courses";
import { formatActivityTime } from "@/data/learning";

export interface RecentActivityItem {
  course: Course;
  lessonId: string;
  lessonTitle: string;
  progressPercent: number;
  timestamp?: number | undefined;
}

export interface LearningActivityPanelProps {
  items: RecentActivityItem[];
}

export function LearningActivityPanel({ items }: LearningActivityPanelProps) {
  return (
    <div
      aria-label="Recently Accessed Lessons"
      className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Recent Activity
          </h2>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {items.length} {items.length === 1 ? "lesson" : "lessons"} logged
        </span>
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center">
          <Clock className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            No recent activity recorded yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            When you open a course module, your progress will appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border" role="list">
          {items.map((item) => (
            <li
              key={`${item.course.slug}-${item.lessonId}`}
              className="min-w-0 py-3 first:pt-0 last:pb-0"
            >
              <Link
                to="/learn/$slug/$lessonId"
                params={{ slug: item.course.slug, lessonId: item.lessonId }}
                className="group flex flex-col gap-2 rounded-lg p-2.5 transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    aria-hidden="true"
                  >
                    <PlayCircle className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.lessonTitle}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.course.title} • {item.course.category}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pl-11 text-xs">
                  <span className="font-semibold text-foreground/80">
                    {item.progressPercent}% complete
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                      {formatActivityTime(item.timestamp)}
                    </span>
                    <ExternalLink
                      className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
