import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  fetchCourses,
  fetchCourseById,
  fetchMyEnrollments,
  enrollInCourse,
  fetchCourseProgress,
  recordLessonProgress,
  fetchCourseQuiz,
  fetchQuizAttempts,
  submitQuizAttempt,
  setStoredToken,
} from "@/lib/api-client";
import {
  enroll,
  setLessonComplete,
  syncEnrollmentsFromApi,
  useLearner,
} from "@/hooks/use-enrollment";

describe("Phase 2: Courses, enrollment and learning integration", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setStoredToken(null);
    vi.restoreAllMocks();
  });

  describe("Course API adapters", () => {
    it("fetches published course catalog from /api/courses", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        expect(String(url)).toContain("/api/courses");
        return new Response(
          JSON.stringify([
            {
              id: "c-101",
              creator_id: "student_creator",
              permission_id: "perm-1",
              title: "Distributed Systems",
              slug: "distributed-systems",
              category: "Cloud",
              level: "advanced",
              status: "PUBLISHED",
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-02T00:00:00Z",
              modules: [],
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const courses = await fetchCourses();
      expect(courses).toHaveLength(1);
      expect(courses[0]?.title).toBe("Distributed Systems");
      expect(courses[0]?.slug).toBe("distributed-systems");
    });

    it("fetches course detail by id from /api/courses/:id", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        expect(String(url)).toContain("/api/courses/c-101");
        return new Response(
          JSON.stringify({
            id: "c-101",
            creator_id: "student_creator",
            permission_id: "perm-1",
            title: "Distributed Systems",
            slug: "distributed-systems",
            category: "Cloud",
            level: "advanced",
            status: "PUBLISHED",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-02T00:00:00Z",
            modules: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const course = await fetchCourseById("c-101");
      expect(course.id).toBe("c-101");
      expect(course.status).toBe("PUBLISHED");
    });
  });

  describe("Enrollment API adapters & hooks", () => {
    it("posts enrollment to /api/courses/:id/enroll", async () => {
      setStoredToken("test-student-token");

      let calledMethod = "";
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        calledMethod = init?.method ?? "GET";
        expect(String(url)).toContain("/api/courses/course_pub_01/enroll");
        return new Response(
          JSON.stringify({
            id: "enr-01",
            student_id: "student_101",
            course_id: "course_pub_01",
            enrolled_at: "2026-01-01T00:00:00Z",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      });

      const res = await enrollInCourse("course_pub_01");
      expect(calledMethod).toBe("POST");
      expect(res.id).toBe("enr-01");
      expect(res.course_id).toBe("course_pub_01");
    });

    it("fetches student active enrollments from /api/enrollments/me", async () => {
      setStoredToken("test-student-token");

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        expect(String(url)).toContain("/api/enrollments/me");
        return new Response(
          JSON.stringify([
            {
              id: "enr-01",
              student_id: "student_101",
              course_id: "course_pub_01",
              enrolled_at: "2026-01-01T00:00:00Z",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const enrollments = await fetchMyEnrollments();
      expect(enrollments).toHaveLength(1);
      expect(enrollments[0]?.course_id).toBe("course_pub_01");
    });

    it("syncs backend enrollments into useLearner store", async () => {
      setStoredToken("test-student-token");

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        if (String(url).includes("/api/enrollments/me")) {
          return new Response(
            JSON.stringify([
              {
                id: "enr-01",
                student_id: "student_101",
                course_id: "course_synced_99",
                enrolled_at: "2026-01-01T00:00:00Z",
              },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("Not found", { status: 404 });
      });

      await syncEnrollmentsFromApi();

      const stateRaw = localStorage.getItem("jfet-learner-v2");
      expect(stateRaw).not.toBeNull();
      const parsed = JSON.parse(stateRaw!);
      expect(parsed.enrolled).toContain("course_synced_99");
    });
  });

  describe("Lesson progress API adapters", () => {
    it("posts lesson completion to /api/lessons/:id/progress", async () => {
      setStoredToken("test-student-token");

      let requestBody: any;
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        expect(String(url)).toContain("/api/lessons/les_101/progress");
        requestBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            id: "prog-01",
            student_id: "student_101",
            lesson_id: "les_101",
            is_completed: true,
            completed_at: "2026-01-01T00:00:00Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const res = await recordLessonProgress("les_101", true);
      expect(requestBody.is_completed).toBe(true);
      expect(res.is_completed).toBe(true);
      expect(res.lesson_id).toBe("les_101");
    });

    it("fetches course progress overview from /api/courses/:id/progress", async () => {
      setStoredToken("test-student-token");

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        expect(String(url)).toContain("/api/courses/course_pub_01/progress");
        return new Response(
          JSON.stringify({
            course_id: "course_pub_01",
            total_lessons: 4,
            completed_lessons: 2,
            progress_percentage: 50.0,
            is_course_completed: false,
            completed_lesson_ids: ["les_1", "les_2"],
            is_quiz_passed: false,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const progress = await fetchCourseProgress("course_pub_01");
      expect(progress.progress_percentage).toBe(50.0);
      expect(progress.completed_lessons).toBe(2);
      expect(progress.is_course_completed).toBe(false);
    });
  });

  describe("Quiz & attempts API adapters", () => {
    it("fetches course quiz without revealing answers from /api/courses/:id/quiz", async () => {
      setStoredToken("test-student-token");

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        expect(String(url)).toContain("/api/courses/course_pub_01/quiz");
        return new Response(
          JSON.stringify({
            id: "quiz-01",
            course_id: "course_pub_01",
            title: "Course Final Quiz",
            passing_score_percentage: 70,
            questions: [
              {
                id: "q-1",
                question_text: "What is Raft?",
                options: ["Consensus algorithm", "Data structure"],
                order_index: 0,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const quiz = await fetchCourseQuiz("course_pub_01");
      expect(quiz.id).toBe("quiz-01");
      expect(quiz.questions).toHaveLength(1);
      expect(quiz.questions[0]?.options).toContain("Consensus algorithm");
    });

    it("submits quiz attempt and receives server-calculated score from /api/quizzes/:id/attempts", async () => {
      setStoredToken("test-student-token");

      let requestBody: any;
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        expect(String(url)).toContain("/api/quizzes/quiz-01/attempts");
        requestBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            id: "att-01",
            quiz_id: "quiz-01",
            student_id: "student_101",
            total_questions: 1,
            correct_answers: 1,
            score_percentage: 100,
            passed: true,
            passing_score_percentage: 70,
            attempted_at: "2026-01-01T00:00:00Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const res = await submitQuizAttempt("quiz-01", { "q-1": 0 });
      expect(requestBody.answers).toEqual({ "q-1": 0 });
      expect(res.passed).toBe(true);
      expect(res.score_percentage).toBe(100);
    });
  });
});
