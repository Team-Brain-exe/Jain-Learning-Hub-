import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Award, Check, ChevronRight, Flag, Plus, Minus, Target } from "lucide-react";
import { getStoredLearnerGoal, setStoredLearnerGoal } from "@/data/learning";

export interface LearningGoalsPanelProps {
  weeklyLessonsDone?: number;
  totalLessonsDone?: number;
  completedCoursesCount: number;
  nextMilestone: {
    courseTitle: string;
    remainingLessons: number;
    percent: number;
  } | null;
}

export function LearningGoalsPanel({
  weeklyLessonsDone = 0,
  completedCoursesCount,
  nextMilestone,
}: LearningGoalsPanelProps) {
  const [goal, setGoal] = useState<number>(() => getStoredLearnerGoal());
  const [savedNotice, setSavedNotice] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleUpdateGoal = (newGoal: number) => {
    const value = Math.max(1, Math.min(30, newGoal));

    setGoal(value);
    setStoredLearnerGoal(value);
    setSavedNotice(true);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setSavedNotice(false);
    }, 2000);
  };

  const currentProgress = Math.min(weeklyLessonsDone, goal);
  const goalPercent = Math.min(100, Math.round((currentProgress / goal) * 100));

  return (
    <div
      aria-label="Personal Learning Goals and Milestones"
      className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Personal Weekly Goal
          </h2>
        </div>

        {savedNotice && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success animate-fade-in">
            <Check className="h-3 w-3" /> Saved locally
          </span>
        )}
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-extrabold text-foreground sm:text-3xl">
              {currentProgress}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {" "}
              / {goal} lessons target
            </span>
          </div>

          <span className="text-xs font-bold text-primary sm:text-sm">{goalPercent}%</span>
        </div>

        <div
          className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={goalPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Weekly Goal: ${goalPercent}%`}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${goalPercent}%` }}
          />
        </div>

        {/* Goal adjustment controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
          <span className="text-xs text-muted-foreground">Adjust weekly target:</span>

          <div className="flex flex-wrap items-center gap-1.5">
            {[3, 5, 8, 12].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleUpdateGoal(preset)}
                className={`min-h-8 min-w-8 rounded px-2.5 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  goal === preset
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                aria-label={`Set target to ${preset} lessons`}
              >
                {preset}
              </button>
            ))}

            <div className="flex items-center ml-1 border border-border rounded">
              <button
                type="button"
                onClick={() => handleUpdateGoal(goal - 1)}
                className="inline-flex h-8 w-8 items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40"
                aria-label="Decrease target"
                disabled={goal <= 1}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleUpdateGoal(goal + 1)}
                className="inline-flex h-8 w-8 items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40"
                aria-label="Increase target"
                disabled={goal >= 30}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground/80 italic">
          * Personal study goal stored locally on this device; not an official university
          requirement.
        </p>
      </div>

      {/* Next Milestone / Certificate Section */}
      <div className="mt-6 pt-5 border-t border-border space-y-3">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-bold text-foreground">Next Milestone</h3>
        </div>

        {nextMilestone ? (
          <div className="rounded-xl bg-muted/50 p-3.5 border border-border/70">
            <p className="text-xs font-semibold text-primary truncate">
              {nextMilestone.courseTitle}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {nextMilestone.remainingLessons === 0
                ? "Course finished! Certificate unlocked."
                : `${nextMilestone.remainingLessons} lessons remaining to complete this course.`}
            </p>

            <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
              <span>{nextMilestone.percent}% complete</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
            Enroll in a course to unlock your next academic milestone.
          </div>
        )}

        <div className="pt-2">
          <Link
            to="/certificates"
            className="group flex items-center justify-between rounded-xl border border-border bg-gradient-to-r from-card to-secondary/30 p-3 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                {completedCoursesCount > 0
                  ? `View ${completedCoursesCount} Certificate${completedCoursesCount > 1 ? "s" : ""}`
                  : "Certificates Directory"}
              </span>
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
