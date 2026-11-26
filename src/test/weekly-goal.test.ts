import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { countLessonsCompletedThisWeek } from "@/data/learning";

describe("Weekly learning goal tracking", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 26, 12, 0, 0));
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  describe("countLessonsCompletedThisWeek", () => {
    it("counts completions from Monday of the current week", () => {
      const completedAt = {
        python: {
          mondayLesson: new Date(2026, 10, 23, 9, 0, 0).getTime(),
          tuesdayLesson: new Date(2026, 10, 24, 9, 0, 0).getTime(),
          thursdayLesson: new Date(2026, 10, 26, 10, 0, 0).getTime(),
        },
      };

      expect(countLessonsCompletedThisWeek(completedAt)).toBe(3);
    });

    it("excludes completions from the previous week", () => {
      const completedAt = {
        python: {
          previousSunday: new Date(2026, 10, 22, 23, 59, 0).getTime(),
          currentMonday: new Date(2026, 10, 23, 0, 0, 0).getTime(),
        },
      };

      expect(countLessonsCompletedThisWeek(completedAt)).toBe(1);
    });

    it("does not count future timestamps", () => {
      const completedAt = {
        python: {
          completedToday: new Date(2026, 10, 26, 10, 0, 0).getTime(),
          futureLesson: new Date(2026, 10, 26, 13, 0, 0).getTime(),
        },
      };

      expect(countLessonsCompletedThisWeek(completedAt)).toBe(1);
    });

    it("returns zero when there are no timestamped completions", () => {
      expect(countLessonsCompletedThisWeek({})).toBe(0);
    });

    it("does not count invalid timestamps", () => {
      const completedAt = {
        python: {
          invalid: Number.NaN,
          notANumber: "invalid" as unknown as number,
        },
      };

      expect(countLessonsCompletedThisWeek(completedAt)).toBe(0);
    });
  });

  describe("Lesson completion timestamps", () => {
    it("records a timestamp when a lesson is newly completed", async () => {
      const { setLessonComplete } = await import("@/hooks/use-enrollment");

      setLessonComplete("python", "lesson-1", true);

      const stored = JSON.parse(localStorage.getItem("jfet-learner-v2")!);

      expect(stored.completed.python).toContain("lesson-1");
      expect(stored.completedAt.python["lesson-1"]).toBe(Date.now());
    });

    it("preserves the original timestamp when completion is repeated", async () => {
      const { setLessonComplete } = await import("@/hooks/use-enrollment");

      setLessonComplete("python", "lesson-1", true);

      const originalTimestamp = JSON.parse(localStorage.getItem("jfet-learner-v2")!).completedAt
        .python["lesson-1"];

      vi.setSystemTime(new Date(2026, 10, 27, 12, 0, 0));

      setLessonComplete("python", "lesson-1", true);

      const stored = JSON.parse(localStorage.getItem("jfet-learner-v2")!);

      expect(stored.completedAt.python["lesson-1"]).toBe(originalTimestamp);
    });

    it("removes the timestamp when a lesson is marked incomplete", async () => {
      const { setLessonComplete } = await import("@/hooks/use-enrollment");

      setLessonComplete("python", "lesson-1", true);
      setLessonComplete("python", "lesson-1", false);

      const stored = JSON.parse(localStorage.getItem("jfet-learner-v2")!);

      expect(stored.completed.python).not.toContain("lesson-1");
      expect(stored.completedAt.python).toBeUndefined();
    });

    it("does not assign a new timestamp to an old completion", async () => {
      localStorage.setItem(
        "jfet-learner-v2",
        JSON.stringify({
          enrolled: ["python"],
          completed: {
            python: ["old-lesson"],
          },
          last: {},
          accessed: {},
        }),
      );

      const { setLessonComplete } = await import("@/hooks/use-enrollment");

      // Repeating the completion action must not make an old completion
      // appear as if it happened during the current week.
      setLessonComplete("python", "old-lesson", true);

      const stored = JSON.parse(localStorage.getItem("jfet-learner-v2")!);

      expect(stored.completedAt.python).toBeUndefined();
    });
  });
});
