import { useSyncExternalStore } from "react";

/**
 * Tiny localStorage-backed store (SSR safe).
 * FRONTEND-ONLY DEMO LAYER: every shared record in the app (courses submitted by creators,
 * reviews, certificates...) lives in this browser. When a real API exists, replace the
 * actions exported from `@/data/platform` with fetch calls; components do not need to change.
 */
export function createStore<T>(key: string, init: () => T) {
  let cache: T | null = null;
  let server: T | null = null;
  const listeners = new Set<() => void>();

  const getServer = () => (server ??= init());
  const get = (): T => {
    if (typeof window === "undefined") return getServer();
    if (cache) return cache;
    try {
      const raw = localStorage.getItem(key);
      cache = raw ? (JSON.parse(raw) as T) : init();
      if (!raw) localStorage.setItem(key, JSON.stringify(cache));
    } catch {
      cache = init();
    }
    return cache as T;
  };
  const set = (next: T) => {
    cache = next;
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage full/blocked */ }
    listeners.forEach((l) => l());
  };
  const update = (fn: (s: T) => T) => set(fn(get()));
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  };
  // keep tabs in sync
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === key) { cache = null; listeners.forEach((l) => l()); }
    });
  }
  const use = () => useSyncExternalStore(subscribe, get, getServer);
  const reset = () => { cache = null; try { localStorage.removeItem(key); } catch { /* ignore */ } listeners.forEach((l) => l()); };
  return { get, set, update, use, reset };
}
