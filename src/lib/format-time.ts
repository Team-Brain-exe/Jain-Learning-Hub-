function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Formats seconds as mm:ss (or h:mm:ss when an hour or more). */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** Formats whole seconds as "{m} min {s} s", or "{s} s" under a minute. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} min ${s % 60} s` : `${s} s`;
}

/** Local 24h clock time, HH:MM:SS, for an ISO timestamp ("—" when unparseable). */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** "+mm:ss" offset of `atIso` from `startIso` (clamped at zero; "—" when unparseable). */
export function formatOffset(startIso: string, atIso: string): string {
  const diff = Date.parse(atIso) - Date.parse(startIso);
  if (!Number.isFinite(diff)) return "—";
  const s = Math.max(0, Math.floor(diff / 1000));
  return `+${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
