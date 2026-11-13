import { beforeEach, describe, expect, it } from "vitest";
import {
  assignReviewer, createDraft, eligibility, findCourse, platform, publishSubmission, reviewDecision, scoreQuiz,
  submitAttempt, submitForReview, updateSubmission, validateForSubmit, requestCertificate, decideCertificate, getQuiz, newQuestion,
} from "@/data/platform";
import { runAiCheck } from "@/lib/ai-check";

const user = (id: string) => platform.get().users.find((u) => u.id === id)!;
const complete = (id: string) =>
  updateSubmission(id, {
    title: "Intro to Networking", description: "x".repeat(120), outcomes: ["Explain the OSI model", "Configure subnets", "Use packet analysers"], prerequisites: ["None"],
    modules: [{ id: "m1", title: "Basics", lessons: [1, 2, 3].map((n) => ({ id: `l${n}`, title: `Lesson ${n} OSI subnets`, minutes: 10, kind: "reading" as const, description: "d", videoUrl: "", captionsUrl: "", transcript: "", resources: [] })) }],
    quiz: { passMark: 70, maxAttempts: 2, questions: [{ ...newQuestion(), prompt: "Layer 3?", options: ["Network", "Link", "", ""], correct: 0, explanation: "e" }] },
  });

beforeEach(() => platform.reset());

describe("submission workflow", () => {
  it("blocks incomplete submissions with readable errors", () => {
    const id = createDraft(user("u-creator"));
    const errs = submitForReview(id, user("u-creator"));
    expect(errs.length).toBeGreaterThan(3);
    expect(platform.get().submissions.find((s) => s.id === id)!.status).toBe("draft");
  });

  it("runs draft → submit → assign → approve → publish and exposes the course", () => {
    const creator = user("u-creator");
    const id = createDraft(creator);
    complete(id);
    expect(validateForSubmit(platform.get().submissions.find((s) => s.id === id)!)).toEqual([]);
    expect(submitForReview(id, creator)).toEqual([]);
    expect(assignReviewer(id, "u-reviewer", user("u-admin"))).toBeNull();
    expect(reviewDecision(id, "approve", "", user("u-reviewer"))).toBeNull();
    expect(publishSubmission(id, user("u-admin"))).toBeNull();
    const course = findCourse("intro-to-networking");
    expect(course?.title).toBe("Intro to Networking");
    expect(getQuiz("intro-to-networking")?.questions).toHaveLength(1);
    expect(platform.get().audit.length).toBeGreaterThan(3);
  });

  it("enforces reviewer rules", () => {
    const id = createDraft(user("u-creator"));
    complete(id);
    submitForReview(id, user("u-creator"));
    assignReviewer(id, "u-reviewer", user("u-admin"));
    expect(reviewDecision(id, "approve", "", user("u-reviewer2"))).toMatch(/not assigned/);
    expect(reviewDecision(id, "reject", "no", user("u-reviewer"))).toMatch(/explain/);
    expect(publishSubmission(id, user("u-admin"))).toMatch(/approved/);
    expect(reviewDecision(id, "changes", "Please add detail to module 1", user("u-reviewer"))).toBeNull();
    expect(platform.get().submissions.find((s) => s.id === id)!.status).toBe("changes_requested");
  });

  it("never lets a reviewer review their own course", () => {
    const id = createDraft(user("u-reviewer"));
    expect(assignReviewer(id, "u-reviewer", user("u-admin"))).toMatch(/own/);
  });
});

describe("AI check", () => {
  it("flags thin drafts and scores a complete course higher", () => {
    const id = createDraft(user("u-creator"));
    const thin = runAiCheck(platform.get().submissions.find((s) => s.id === id)!);
    complete(id);
    const full = runAiCheck(platform.get().submissions.find((s) => s.id === id)!);
    expect(thin.findings.some((f) => f.severity === "high")).toBe(true);
    expect(full.score).toBeGreaterThan(thin.score);
    expect(thin.provider).toBe("local-rules");
  });
});

describe("assessments and certificates", () => {
  it("scores quizzes and enforces attempt limits", () => {
    const quiz = getQuiz("python-programming-fundamentals")!;
    const right = Object.fromEntries(quiz.questions.map((q) => [q.id, q.correct]));
    expect(scoreQuiz(quiz, right)).toMatchObject({ score: 100, passed: true });
    expect(scoreQuiz(quiz, {})).toMatchObject({ score: 0, passed: false });
    const u = user("u-learner");
    for (let i = 0; i < quiz.maxAttempts; i++) expect(typeof submitAttempt(u, "python-programming-fundamentals", right)).toBe("object");
    expect(submitAttempt(u, "python-programming-fundamentals", right)).toMatch(/all attempts/);
  });

  it("applies completion rules", () => {
    expect(eligibility({ totalLessons: 5, doneLessons: 4, hasQuiz: true, quizPassed: false }).reasons).toHaveLength(2);
    expect(eligibility({ totalLessons: 5, doneLessons: 5, hasQuiz: false, quizPassed: false }).eligible).toBe(true);
  });

  it("issues a verifiable certificate only after admin authorisation", () => {
    const course = findCourse("python-programming-fundamentals")!;
    const learner = user("u-learner");
    expect(requestCertificate(learner, course, 90)).toBeNull();
    expect(requestCertificate(learner, course, 90)).toMatch(/already/);
    const c = platform.get().certificates[0]!;
    expect(c.status).toBe("requested");
    expect(c.id).toMatch(/^JFET-[A-Z2-9]{6}$/);
    decideCertificate(c.id, true, user("u-admin"));
    expect(platform.get().certificates[0]!.status).toBe("issued");
  });
});
