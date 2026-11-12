import { useSyncExternalStore } from "react";

// Demo-only enrollment kept in the browser; swap for an API service later.
const KEY = "jfet-enrollments";
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { cache = []; }
  return cache!;
}
const EMPTY: string[] = [];

export function enroll(slug: string) {
  const next = Array.from(new Set([...read(), slug]));
  cache = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function useEnrollments() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    read,
    () => EMPTY,
  );
}
