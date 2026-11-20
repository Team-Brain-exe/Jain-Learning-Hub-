import { useEffect, useRef, useState } from "react";

import { remainingSeconds } from "@/data/proctoring";

const TICK_MS = 250;

const secondsFor = (deadlineMs: number | null): number =>
  deadlineMs === null ? 0 : remainingSeconds(deadlineMs, Date.now());

/**
 * Deadline-based countdown. Remaining time is recomputed from the wall clock on
 * every tick so sleeping/throttled tabs never drift. `onExpire` fires once per
 * deadline value.
 */
export function useCountdown(
  deadlineMs: number | null,
  onExpire: () => void,
): { secondsLeft: number; expired: boolean } {
  // The deadline the state belongs to, so a new deadline never renders the old value first.
  const [state, setState] = useState(() => ({
    deadline: deadlineMs,
    secondsLeft: secondsFor(deadlineMs),
  }));
  let secondsLeft = state.secondsLeft;
  if (state.deadline !== deadlineMs) {
    secondsLeft = secondsFor(deadlineMs);
    setState({ deadline: deadlineMs, secondsLeft });
  }
  const onExpireRef = useRef(onExpire);
  const firedRef = useRef<number | null>(null);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (deadlineMs === null) {
      setState({ deadline: null, secondsLeft: 0 });
      return;
    }
    let id: ReturnType<typeof setInterval> | undefined;
    const tick = () => {
      const left = remainingSeconds(deadlineMs, Date.now());
      setState((s) =>
        s.deadline === deadlineMs && s.secondsLeft === left
          ? s
          : { deadline: deadlineMs, secondsLeft: left },
      );
      if (left <= 0) {
        if (id !== undefined) clearInterval(id);
        if (firedRef.current !== deadlineMs) {
          firedRef.current = deadlineMs;
          onExpireRef.current();
        }
      }
    };
    tick();
    if (remainingSeconds(deadlineMs, Date.now()) > 0) {
      id = setInterval(tick, TICK_MS);
    }
    return () => {
      if (id !== undefined) clearInterval(id);
    };
  }, [deadlineMs]);

  return { secondsLeft, expired: deadlineMs !== null && secondsLeft <= 0 };
}
