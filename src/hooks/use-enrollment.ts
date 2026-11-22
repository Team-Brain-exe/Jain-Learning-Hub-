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
  last: Record<string, string>; // slug -> lesson id
  accessed: Record<string, number>; // slug -> timestamp
}
const EMPTY: LearnerState = { enrolled: [], completed: {}, last: {}, accessed: {} };
const listeners = new Set<() => void>();
let cache: LearnerState | null = null;

function read(): LearnerState {
  if (typeof window === "undefined") return EMPTY;
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) cache = { ...EMPTY, ...JSON.parse(raw) };
    else cache = { ...EMPTY, enrolled: JSON.parse(localStorage.getItem(LEGACY) || "[]") };
  } catch { cache = EMPTY; }
  return cache!;
}
function write(next: LearnerState) {
  cache = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export const enroll = (slug: string, courseId?: string) => {
  const s = read();
  write({ ...s, enrolled: Array.from(new Set([...s.enrolled, slug])), accessed: { ...s.accessed, [slug]: s.accessed[slug] ?? Date.now() } });

  const token = getStoredToken();
  if (token) {
    enrollInCourse(courseId ?? slug).catch(() => {
      // Local state remains active
    });
  }
};

export const setLessonComplete = (slug: string, lessonId: string, done: boolean) => {
  const s = read();
  const cur = new Set(s.completed[slug] ?? []);
  if (done) cur.add(lessonId); else cur.delete(lessonId);
  write({ ...s, completed: { ...s.completed, [slug]: [...cur] } });

  const token = getStoredToken();
  if (token) {
    recordLessonProgress(lessonId, done).catch(() => {
      // Local state remains active
    });
  }
};

export const syncEnrollmentsFromApi = async () => {
  const token = getStoredToken();
  if (!token) return;
  try {
    const enrollments = await fetchMyEnrollments();
    if (enrollments && enrollments.length) {
      const s = read();
      const courseIds = enrollments.map((e) => e.course_id);
      write({ ...s, enrolled: Array.from(new Set([...s.enrolled, ...courseIds])) });
    }
  } catch {
    // Ignore network or auth errors
  }
};

export const visitLesson = (slug: string, lessonId: string) => {
  const s = read();
  write({
    ...s,
    enrolled: s.enrolled.includes(slug) ? s.enrolled : [...s.enrolled, slug],
    last: { ...s.last, [slug]: lessonId },
    accessed: { ...s.accessed, [slug]: Date.now() },
  });
};

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
export function useLearner() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
export function useEnrollments() {
  return useLearner().enrolled;
}
