import { describe, expect, it } from "vitest";
import { courses, filterCourses } from "@/data/courses";

describe("course catalog", () => {
  it("searches by instructor", () => {
    expect(filterCourses(courses, { q: "meera" }).map((c) => c.slug)).toEqual(["introduction-to-machine-learning"]);
  });
  it("combines category and level filters", () => {
    const r = filterCourses(courses, { categories: ["Programming"], levels: ["Beginner"] });
    expect(r.map((c) => c.title).sort()).toEqual(["Git and GitHub for Beginners", "Python Programming Fundamentals"]);
  });
  it("sorts by name", () => {
    expect(filterCourses(courses, { sort: "name" })[0]?.title).toBe("Data Structures and Algorithms");
  });
});

import { courseProgress, getCourse, resumeLessonId } from "@/data/courses";
describe("progress", () => {
  const py = getCourse("python-programming-fundamentals")!;
  it("counts completed lessons as a percentage", () => {
    expect(courseProgress(py, ["1-1", "1-2", "1-3"])).toEqual({ done: 3, total: 15, percent: 20 });
  });
  it("resumes at the last visited lesson, else first incomplete", () => {
    expect(resumeLessonId(py, "3-2", [])).toBe("3-2");
    expect(resumeLessonId(py, undefined, ["1-1"])).toBe("1-2");
  });
});
