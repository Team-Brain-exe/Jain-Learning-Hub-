import { BookOpen, CheckCircle2, Clock, Trophy } from "lucide-react";

export interface LearningStatsProps {
  enrolledCount: number;
  lessonsDoneCount: number;
  completedCount: number;
  inProgressCount: number;
}

export function LearningStats({
  enrolledCount,
  lessonsDoneCount,
  completedCount,
  inProgressCount,
}: LearningStatsProps) {
  const statItems = [
    {
      id: "enrolled",
      label: "Enrolled Courses",
      value: enrolledCount,
      icon: BookOpen,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
      description: "Total courses joined",
    },
    {
      id: "in-progress",
      label: "In Progress",
      value: inProgressCount,
      icon: Clock,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-500/10",
      description: "Active coursework",
    },
    {
      id: "lessons-done",
      label: "Lessons Completed",
      value: lessonsDoneCount,
      icon: CheckCircle2,
      iconColor: "text-success",
      bgColor: "bg-success/10",
      description: "Completed modules",
    },
    {
      id: "completed",
      label: "Courses Completed",
      value: completedCount,
      icon: Trophy,
      iconColor: "text-gold",
      bgColor: "bg-gold/15",
      description: "Certificates earned",
    },
  ];

  return (
    <section aria-label="Learner Overview Statistics">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-hover sm:p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </span>
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${item.bgColor}`}
                  aria-hidden="true"
                >
                  <Icon className={`h-5 w-5 ${item.iconColor}`} />
                </span>
              </div>

              <div className="mt-3">
                <p className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
