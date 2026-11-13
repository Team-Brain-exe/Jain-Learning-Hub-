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
