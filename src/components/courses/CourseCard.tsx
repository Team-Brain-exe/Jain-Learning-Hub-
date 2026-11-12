import { Link } from "@tanstack/react-router";
import { Clock, Star, Users } from "lucide-react";
import type { Course } from "@/data/courses";

export function LevelBadge({ level }: { level: string }) {
  return <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">{level}</span>;
}

export function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      to="/courses/$slug"
      params={{ slug: course.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-hover"
    >
      <div className="aspect-[16/10] overflow-hidden border-b border-border bg-muted">
        <img src={course.thumbnail} alt="" loading="lazy" width={1024} height={640} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">{course.category}</span>
          {course.type === "Student Creator" && <span className="text-xs font-medium text-success">Faculty reviewed</span>}
        </div>
        <h3 className="mt-2 text-lg font-bold leading-snug text-foreground group-hover:text-primary">{course.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{course.instructor.name}</p>
        <p className="mt-3 line-clamp-2 text-sm text-foreground/80">{course.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
          <LevelBadge level={course.level} />
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{course.weeks} weeks</span>
          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" />{course.rating}</span>
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.learners.toLocaleString()}</span>
        </div>
        <span className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-primary text-sm font-semibold text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
          Explore Course
        </span>
      </div>
    </Link>
  );
}
