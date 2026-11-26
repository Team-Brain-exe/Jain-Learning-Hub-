import { useSyncExternalStore } from "react";
import {
  enrollInCourse,
  recordLessonProgress,
  fetchMyEnrollments,
  getStoredToken,
} from "@/lib/api-client";

// Learner state kept in this browser and synchronized with backend API when authenticated.
const KEY = "jfet-learner-v2";
const LEGACY = "jfet-enrollments";

export interface LearnerState {
  enrolled: string[];
  completed: Record<string, string[]>; // slug -> lesson ids
  completedAt: Record<string, Record<string, number>>; // slug -> lesson id -> completion timestamp
  last: Record<string, string>; // slug -> lesson id
  accessed: Record<string, number>; // slug -> timestamp
}

const EMPTY: LearnerState = {
  enrolled: [],
  completed: {},
  completedAt: {},
  last: {},
  accessed: {},
};

const listeners = new Set<() => void>();
let cache: LearnerState | null = null;

function read(): LearnerState {
  if (typeof window === "undefined") return EMPTY;
  if (cache) return cache;

  try {
    const raw = localStorage.getItem(KEY);

    if (raw) {
      const parsed = JSON.parse(raw);
      cache = {
        ...EMPTY,
        ...parsed,
        completedAt: parsed?.completedAt ?? {},
      };
    } else {
      cache = {
        ...EMPTY,
        enrolled: JSON.parse(localStorage.getItem(LEGACY) || "[]"),
      };
    }
  } catch {
    cache = EMPTY;
  }

  return cache!;
}

function write(next: LearnerState) {
  cache = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

export const enroll = (slug: string, courseId?: string) => {
  const state = read();

  write({
    ...state,
    enrolled: Array.from(new Set([...state.enrolled, slug])),
    accessed: {
      ...state.accessed,
      [slug]: state.accessed[slug] ?? Date.now(),
    },
  });

  const token = getStoredToken();

  if (token) {
    enrollInCourse(courseId ?? slug).catch(() => {
      // Local state remains active.
    });
  }
};

export const setLessonComplete = (slug: string, lessonId: string, done: boolean) => {
  const state = read();
  const currentCompleted = new Set(state.completed[slug] ?? []);
  const courseTimestamps = { ...(state.completedAt[slug] ?? {}) };

  if (done) {
    // Only timestamp a genuinely new completion.
    // Existing completions without timestamps may predate weekly tracking.
    if (!currentCompleted.has(lessonId)) {
      courseTimestamps[lessonId] = Date.now();
    }

    currentCompleted.add(lessonId);
  } else {
    currentCompleted.delete(lessonId);
    delete courseTimestamps[lessonId];
  }

  const nextCompletedAt = { ...state.completedAt };

  if (Object.keys(courseTimestamps).length > 0) {
    nextCompletedAt[slug] = courseTimestamps;
  } else {
    delete nextCompletedAt[slug];
  }

  write({
    ...state,
    completed: {
      ...state.completed,
      [slug]: [...currentCompleted],
    },
    completedAt: nextCompletedAt,
  });

  const token = getStoredToken();

  if (token) {
    recordLessonProgress(lessonId, done).catch(() => {
      // Local state remains active.
    });
  }
};

export const syncEnrollmentsFromApi = async () => {
  const token = getStoredToken();
  if (!token) return;

  try {
    const enrollments = await fetchMyEnrollments();

    if (enrollments && enrollments.length) {
      const state = read();
      const courseIds = enrollments.map((enrollment) => enrollment.course_id);

      write({
        ...state,
        enrolled: Array.from(new Set([...state.enrolled, ...courseIds])),
      });
    }
  } catch {
    // Ignore network or auth errors.
  }
};

export const visitLesson = (slug: string, lessonId: string) => {
  const state = read();

  write({
    ...state,
    enrolled: state.enrolled.includes(slug) ? state.enrolled : [...state.enrolled, slug],
    last: {
      ...state.last,
      [slug]: lessonId,
    },
    accessed: {
      ...state.accessed,
      [slug]: Date.now(),
    },
  });
};

const subscribe = (callback: () => void) => {
  listeners.add(callback);

  return () => {
    listeners.delete(callback);
  };
};

export function useLearner() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useEnrollments() {
  return useLearner().enrolled;
}
