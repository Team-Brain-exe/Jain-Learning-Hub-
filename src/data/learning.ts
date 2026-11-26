import type { Course } from "@/data/courses";
import { flattenLessons } from "@/data/courses";
import type { LearnerState } from "@/hooks/use-enrollment";

export const LEARNER_GOAL_STORAGE_KEY = "jfet_learner_goal";
export const DEFAULT_WEEKLY_GOAL = 5;

export interface LearnerGoalData {
  targetLessons: number;
}

/**
 * Safely read personal weekly lesson goal from localStorage.
 */
export function getStoredLearnerGoal(): number {
  if (typeof window === "undefined") return DEFAULT_WEEKLY_GOAL;

  try {
    const raw = localStorage.getItem(LEARNER_GOAL_STORAGE_KEY);
    if (!raw) return DEFAULT_WEEKLY_GOAL;

    const parsed = JSON.parse(raw);
    const target = typeof parsed === "number" ? parsed : Number(parsed?.targetLessons);

    return Number.isFinite(target) && target > 0 ? target : DEFAULT_WEEKLY_GOAL;
  } catch {
    return DEFAULT_WEEKLY_GOAL;
  }
}

/**
 * Safely store personal weekly lesson goal to localStorage.
 */
export function setStoredLearnerGoal(target: number): boolean {
  if (typeof window === "undefined") return false;

  try {
    const cleanTarget = Math.max(1, Math.min(50, Math.round(target)));

    localStorage.setItem(
      LEARNER_GOAL_STORAGE_KEY,
      JSON.stringify({
        targetLessons: cleanTarget,
        updatedAt: new Date().toISOString(),
      }),
    );

    return true;
  } catch {
    return false;
  }
}

/**
 * Count lessons completed during the current local calendar week.
 *
 * The week starts Monday at 00:00 local time.
 * Old completions without timestamps and future timestamps are excluded.
 */
export function countLessonsCompletedThisWeek(
  completedAt: LearnerState["completedAt"],
  now: number = Date.now(),
): number {
  if (!completedAt || !Number.isFinite(now)) return 0;

  const weekStart = new Date(now);
  const dayOfWeek = weekStart.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekStartTimestamp = weekStart.getTime();

  let count = 0;

  for (const courseTimestamps of Object.values(completedAt)) {
    if (!courseTimestamps || typeof courseTimestamps !== "object") {
      continue;
    }

    for (const timestamp of Object.values(courseTimestamps)) {
      if (
        typeof timestamp === "number" &&
        Number.isFinite(timestamp) &&
        timestamp >= weekStartTimestamp &&
        timestamp <= now
      ) {
        count += 1;
      }
    }
  }

  return count;
}

export interface DashboardCourseItem {
  course: Course;
  progress: {
    done: number;
    total: number;
    percent: number;
  };
  resumeLessonId: string;
  nextLessonTitle: string;
  lastAccessedTimestamp?: number;
}

/**
 * Find the next incomplete lesson title for a course.
 */
export function getLessonTitle(course: Course, lessonId: string): string {
  const all = flattenLessons(course);
  const found = all.find((lesson) => lesson.id === lessonId);

  return found ? found.title : `Lesson ${lessonId}`;
}

/**
 * Find the next milestone for a learner based on current in-progress courses.
 */
export function findNextMilestone(
  coursesWithProgress: {
    course: Course;
    progress: { done: number; total: number; percent: number };
  }[],
): {
  courseTitle: string;
  remainingLessons: number;
  percent: number;
} | null {
  const inProgress = coursesWithProgress
    .filter((item) => item.progress.percent > 0 && item.progress.percent < 100)
    .sort((a, b) => b.progress.percent - a.progress.percent);

  if (inProgress.length === 0) {
    const notStarted = coursesWithProgress.find((item) => item.progress.percent === 0);

    if (notStarted) {
      return {
        courseTitle: notStarted.course.title,
        remainingLessons: notStarted.progress.total,
        percent: 0,
      };
    }

    return null;
  }

  const closest = inProgress[0];
  if (!closest) return null;

  return {
    courseTitle: closest.course.title,
    remainingLessons: closest.progress.total - closest.progress.done,
    percent: closest.progress.percent,
  };
}

/**
 * Format relative activity timestamp in human-readable terms.
 */
export function formatActivityTime(timestamp?: number | undefined): string {
  if (!timestamp || !Number.isFinite(timestamp)) return "Recently";

  const now = Date.now();
  const diffMinutes = Math.floor((now - timestamp) / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
