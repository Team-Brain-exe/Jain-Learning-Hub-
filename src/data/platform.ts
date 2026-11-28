/**
 * Platform data layer — FRONTEND DEMO.
 * Holds users, creator submissions, reviews, quizzes, certificates, notifications and audit
 * events in localStorage. Each exported action maps 1:1 to a future API endpoint.
 * NOTE: the permission checks here only guard the UI/demo. A real backend must enforce them.
 */
import { createStore } from "@/lib/create-store";
import { courses as staticCourses, type Course, type Level, type Module } from "@/data/courses";
import { sampleQuizzes } from "@/data/quizzes";
import type { AttemptMeta, ProctorConfig } from "@/data/proctoring";

export type Role = "learner" | "creator" | "reviewer" | "admin";
export type Status = "draft" | "submitted" | "under_review" | "changes_requested" | "approved" | "rejected" | "published" | "archived";
export type CreatorType = "Faculty Course" | "Student Creator";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  creatorType?: CreatorType | undefined;
  department?: string | undefined;
  timeMultiplier?: number | undefined;
}
export interface LessonDraft {
  id: string; title: string; minutes: number; kind: "video" | "reading" | "quiz";
  description: string; videoUrl: string; captionsUrl: string; transcript: string;
  resources: { title: string; url: string }[];
}
export interface ModuleDraft { id: string; title: string; lessons: LessonDraft[] }
export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
  type?: "single" | "multi" | "truefalse" | undefined;
  correctAll?: number[] | undefined;
  section?: string | undefined;
}
export interface Quiz {
  passMark: number;
  maxAttempts: number;
  questions: QuizQuestion[];
  proctor?: ProctorConfig | undefined;
}
export interface AiFinding { id: string; severity: "high" | "medium" | "low"; area: string; message: string; suggestion: string }
export interface AiReport { generatedAt: string; provider: string; version: string; score: number; summary: string; findings: AiFinding[] }
export interface Feedback { id: string; at: string; by: string; kind: "submitted" | "assigned" | "approve" | "reject" | "changes" | "override" | "publish" | "archive" | "comment"; text: string }
export interface Submission {
  id: string; slug?: string | undefined; ownerId: string; ownerName: string; ownerType: CreatorType;
  title: string; description: string; category: string; level: Level; weeks: number;
  keywords: string[]; prerequisites: string[]; outcomes: string[]; modules: ModuleDraft[]; quiz?: Quiz | undefined;
  status: Status; reviewerId?: string | undefined; reviewerName?: string | undefined;
  feedback: Feedback[]; aiReport?: AiReport | undefined; overrides: Record<string, string>;
  version: number; createdAt: string; updatedAt: string; submittedAt?: string | undefined;
}
export interface Notification { id: string; userId: string; text: string; at: string; read: boolean; href?: string | undefined }
export interface AuditEvent { id: string; at: string; actor: string; action: string; target: string }
export interface Certificate {
  id: string; slug: string; courseTitle: string; learnerId: string; learnerName: string;
  status: "requested" | "issued" | "rejected"; requestedAt: string; issuedAt?: string | undefined; issuedBy?: string | undefined; quizScore?: number | undefined;
}
export interface QuizAttempt {
  id: string;
  userId: string;
  slug: string;
  at: string;
  score: number;
  passed: boolean;
  answers: Record<string, number | number[]>;
  meta?: AttemptMeta | undefined;
}
export interface Policy { minDescriptionChars: number; minOutcomes: number; minLessons: number; defaultPassMark: number; requireQuiz: boolean }
export interface PlatformState {
  users: AppUser[]; submissions: Submission[]; notifications: Notification[]; audit: AuditEvent[];
  certificates: Certificate[]; attempts: QuizAttempt[]; policy: Policy;
}

export const DEFAULT_POLICY: Policy = { minDescriptionChars: 1, minOutcomes: 1, minLessons: 1, defaultPassMark: 70, requireQuiz: false };
export const statusLabel: Record<Status, string> = {
  draft: "Draft", submitted: "Submitted", under_review: "Under review", changes_requested: "Changes requested",
  approved: "Approved", rejected: "Rejected", published: "Published", archived: "Archived",
};

const now = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
export const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const USERS: AppUser[] = [
  {
    id: "u-learner",
    name: "Aarav Sharma",
    email: "learner@demo.jain.edu",
    role: "learner",
    department: "B.Tech CSE, Year 2",
    timeMultiplier: 1.5,
  },
  { id: "u-creator", name: "Ananya Rao", email: "creator@demo.jain.edu", role: "creator", creatorType: "Student Creator", department: "B.Tech CSE, Year 4" },
  { id: "u-reviewer", name: "Dr. Meera Iyer", email: "reviewer@demo.jain.edu", role: "reviewer", department: "AIML" },
  { id: "u-reviewer2", name: "Prof. Arjun Menon", email: "reviewer2@demo.jain.edu", role: "reviewer", department: "CSE" },
  { id: "u-admin", name: "University Admin", email: "admin@demo.jain.edu", role: "admin", department: "FET Office" },
];

const blankLesson = (title = "New lesson"): LessonDraft => ({
  id: uid("l"), title, minutes: 10, kind: "video", description: "", videoUrl: "", captionsUrl: "", transcript: "", resources: [],
});
export const newLesson = blankLesson;
export const newModule = (title = "New module"): ModuleDraft => ({ id: uid("m"), title, lessons: [blankLesson("Lesson 1")] });
export const newQuestion = (): QuizQuestion => ({ id: uid("q"), prompt: "", options: ["", "", "", ""], correct: 0, explanation: "" });

function seedSubmission(): Submission {
  const t = now();
  const L = (title: string, minutes: number, description: string, transcript: string): LessonDraft => ({
    ...blankLesson(title), minutes, description, transcript, resources: [{ title: "Cheat sheet", url: "https://example.com/linux-cheatsheet.pdf" }],
  });
  return {
    id: "sub-seed-1", ownerId: "u-creator", ownerName: "Ananya Rao", ownerType: "Student Creator",
    title: "Linux Command Line Essentials", category: "Programming", level: "Beginner", weeks: 3,
    description: "Learn to navigate the Linux shell, manage files and processes, and automate small tasks with shell scripts, using hands-on exercises designed for first-time terminal users.",
    keywords: ["linux", "bash", "terminal"], prerequisites: ["A laptop with Linux, macOS or WSL"],
    outcomes: ["Navigate the file system from the terminal", "Manage files, permissions and processes", "Write simple Bash scripts"],
    modules: [
      { id: "m-s1", title: "Getting Around", lessons: [L("The Shell and the File System", 14, "What a shell is and how directories are organised.", "00:00 Welcome to the shell.\n01:10 Understanding paths."), L("Working with Files", 18, "Create, copy, move and remove files safely.", "00:00 Let's make some files.")] },
      { id: "m-s2", title: "Permissions and Scripting", lessons: [L("File Permissions", 16, "Read, write and execute bits explained with chmod.", "00:00 Permissions overview."), L("Your First Bash Script", 22, "Variables, conditionals and loops in a script.", "00:00 Writing a script.")] },
    ],
    quiz: {
      passMark: 70, maxAttempts: 3,
      questions: [
        { id: "q-s1", prompt: "Which command lists files in the current directory?", options: ["ls", "cd", "rm", "cat"], correct: 0, explanation: "`ls` lists directory contents." },
        { id: "q-s2", prompt: "What does `chmod +x script.sh` do?", options: ["Deletes the script", "Makes the script executable", "Renames the script", "Shows the script"], correct: 1, explanation: "`+x` adds the execute permission." },
      ],
    },
    status: "submitted", feedback: [{ id: uid("f"), at: t, by: "Ananya Rao", kind: "submitted", text: "Submitted for review (v1)." }],
    overrides: {}, version: 1, createdAt: t, updatedAt: t, submittedAt: t,
  };
}

const initial = (): PlatformState => ({
  users: USERS, submissions: [seedSubmission()], audit: [], certificates: [], attempts: [], policy: DEFAULT_POLICY,
  notifications: USERS.map((u) => ({ id: uid("n"), userId: u.id, text: "Welcome to JAIN FET Learning Hub (demo workspace).", at: now(), read: false })),
});

export const platform = createStore<PlatformState>("jfet-platform-v1", initial);
export const usePlatform = platform.use;
const mutate = (fn: (s: PlatformState) => PlatformState) => platform.update(fn);

/* ---------- helpers ---------- */
const audit = (s: PlatformState, actor: string, action: string, target: string): PlatformState => ({
  ...s, audit: [{ id: uid("a"), at: now(), actor, action, target }, ...s.audit].slice(0, 500),
});
const notify = (s: PlatformState, userIds: string[], text: string, href?: string): PlatformState => ({
  ...s, notifications: [...userIds.map((userId) => ({ id: uid("n"), userId, text, at: now(), read: false, href })), ...s.notifications].slice(0, 500),
});
const patchSub = (s: PlatformState, id: string, fn: (x: Submission) => Submission): PlatformState => ({
  ...s, submissions: s.submissions.map((x) => (x.id === id ? { ...fn(x), updatedAt: now() } : x)),
});
const fb = (by: string, kind: Feedback["kind"], text: string): Feedback => ({ id: uid("f"), at: now(), by, kind, text });
const idsWithRole = (s: PlatformState, role: Role) => s.users.filter((u) => u.role === role).map((u) => u.id);

/* ---------- permissions (UI-level only) ---------- */
export const canEdit = (x: Submission) => x.status === "draft" || x.status === "changes_requested";
export const homeFor = (role: Role) => (role === "admin" ? "/admin" : role === "reviewer" ? "/faculty" : role === "creator" ? "/creator" : "/my-learning");

/* ---------- submissions ---------- */
export function createDraft(owner: AppUser): string {
  const id = uid("sub");
  const t = now();
  mutate((s) => audit({
    ...s,
    submissions: [{
      id, ownerId: owner.id, ownerName: owner.name, ownerType: owner.creatorType ?? "Student Creator",
      title: "Untitled course", description: "", category: "Programming", level: "Beginner", weeks: 4,
      keywords: [], prerequisites: [], outcomes: [], modules: [newModule("Module 1")], status: "draft",
      feedback: [], overrides: {}, version: 0, createdAt: t, updatedAt: t,
    }, ...s.submissions],
  }, owner.name, "Created draft", id));
  return id;
}
export const updateSubmission = (id: string, patch: Partial<Submission>) => mutate((s) => patchSub(s, id, (x) => ({ ...x, ...patch })));
export const deleteDraft = (id: string, actor: AppUser) => mutate((s) => audit({ ...s, submissions: s.submissions.filter((x) => !(x.id === id && x.status === "draft")) }, actor.name, "Deleted draft", id));

export function validateForSubmit(x: Submission, _p: Policy = DEFAULT_POLICY): string[] {
  const e: string[] = [];
  if (x.title.trim().length < 5 || x.title === "Untitled course") e.push("Give the course a clear title (5+ characters).");
  if (!x.description.trim()) e.push("Provide a course description.");
  if (!x.outcomes.some((o) => o.trim())) e.push("Add at least one learning outcome.");
  const lessons = x.modules.flatMap((m) => m.lessons);
  if (!lessons.length) e.push("Add at least one lesson.");
  x.modules.forEach((m, i) => { if (!m.title.trim()) e.push(`Module ${i + 1} needs a title.`); if (!m.lessons.length) e.push(`Module “${m.title || i + 1}” has no lessons.`); });
  lessons.forEach((l) => { if (!l.title.trim()) e.push("Every lesson needs a title."); if (l.kind === "video" && !l.videoUrl.trim()) e.push(`Lesson “${l.title}” needs a video URL.`); });
  if (x.quiz?.questions.length) {
    x.quiz.questions.forEach((q, i) => {
      if (!q.prompt.trim()) e.push(`Quiz question ${i + 1} has no text.`);
      if (q.options.filter((o) => o.trim()).length < 2) e.push(`Quiz question ${i + 1} needs at least two options.`);
      if (!q.options[q.correct]?.trim()) e.push(`Quiz question ${i + 1}: the correct answer is blank.`);
    });
  }
  return [...new Set(e)];
}

export function submitForReview(id: string, actor: AppUser): string[] {
  const s0 = platform.get();
  const x = s0.submissions.find((y) => y.id === id);
  if (!x || !canEdit(x)) return ["This course cannot be submitted in its current state."];
  const errs = validateForSubmit(x, s0.policy);
  if (errs.length) return errs;
  mutate((s) => {
    let n = patchSub(s, id, (y) => ({
      ...y, status: "submitted", version: y.version + 1, submittedAt: now(), reviewerId: y.status === "changes_requested" ? y.reviewerId : undefined,
      feedback: [...y.feedback, fb(actor.name, "submitted", `Submitted for review (v${y.version + 1}).`)],
    }));
    n = n.submissions.find((y) => y.id === id)?.reviewerId ? { ...n } : n;
    n = notify(n, idsWithRole(n, "admin"), `New submission “${x.title}” needs a reviewer.`, "/admin");
    const rev = n.submissions.find((y) => y.id === id)?.reviewerId;
    if (rev) n = notify(n, [rev], `“${x.title}” was resubmitted for your review.`, `/faculty/review/${id}`);
    return audit(n, actor.name, "Submitted course", `${x.title} (${id})`);
  });
  return [];
}

export function assignReviewer(id: string, reviewerId: string, actor: AppUser): string | null {
  const s0 = platform.get();
  const x = s0.submissions.find((y) => y.id === id);
  const r = s0.users.find((u) => u.id === reviewerId && u.role === "reviewer");
  if (!x || !r) return "Reviewer not found.";
  if (x.ownerId === r.id) return "A reviewer cannot be assigned to their own course.";
  mutate((s) => {
    let n = patchSub(s, id, (y) => ({
      ...y, reviewerId: r.id, reviewerName: r.name, status: y.status === "submitted" ? "under_review" : y.status,
      feedback: [...y.feedback, fb(actor.name, "assigned", `Assigned to ${r.name}.`)],
    }));
    n = notify(n, [r.id], `You were assigned “${x.title}” for review.`, `/faculty/review/${id}`);
    n = notify(n, [x.ownerId], `“${x.title}” is now under review by ${r.name}.`, `/creator/${id}`);
    return audit(n, actor.name, "Assigned reviewer", `${x.title} → ${r.name}`);
  });
  return null;
}

export function setAiReport(id: string, report: AiReport) {
  mutate((s) => patchSub(s, id, (x) => ({ ...x, aiReport: report, overrides: {} })));
}
export function overrideFinding(id: string, findingId: string, reason: string, actor: AppUser): string | null {
  if (reason.trim().length < 5) return "A reason is required to override an AI finding.";
  mutate((s) => audit(patchSub(s, id, (x) => ({
    ...x, overrides: { ...x.overrides, [findingId]: reason.trim() }, feedback: [...x.feedback, fb(actor.name, "override", `Overrode AI finding: ${reason.trim()}`)],
  })), actor.name, "Overrode AI finding", `${id}/${findingId}`));
  return null;
}

export function reviewDecision(id: string, decision: "approve" | "reject" | "changes", text: string, actor: AppUser): string | null {
  const x = platform.get().submissions.find((y) => y.id === id);
  if (!x) return "Submission not found.";
  if (x.ownerId === actor.id) return "You cannot review your own course.";
  if (actor.role === "reviewer" && x.reviewerId !== actor.id) return "This course is not assigned to you.";
  if (x.status !== "under_review") return "Only courses under review can receive a decision.";
  if (decision !== "approve" && text.trim().length < 10) return "Please explain your decision (10+ characters).";
  const status: Status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "changes_requested";
  const verb = { approve: "Approved", reject: "Rejected", changes: "Requested changes on" }[decision];
  mutate((s) => {
    let n = patchSub(s, id, (y) => ({ ...y, status, feedback: [...y.feedback, fb(actor.name, decision, text.trim() || "Approved.")] }));
    n = notify(n, [x.ownerId], `“${x.title}”: ${statusLabel[status].toLowerCase()}.`, `/creator/${id}`);
    if (decision === "approve") n = notify(n, idsWithRole(n, "admin"), `“${x.title}” is approved and ready to publish.`, "/admin");
    return audit(n, actor.name, `${verb} course`, `${x.title} (${id})`);
  });
  return null;
}

export function publishSubmission(id: string, actor: AppUser): string | null {
  const s0 = platform.get();
  const x = s0.submissions.find((y) => y.id === id);
  if (!x || (x.status !== "approved" && x.status !== "archived")) return "Only approved courses can be published.";
  let slug = x.slug ?? slugify(x.title);
  const taken = (sl: string) => [...staticCourses.map((c) => c.slug), ...s0.submissions.filter((y) => y.id !== id && y.slug).map((y) => y.slug)].includes(sl);
  if (!x.slug) { let i = 2; const base = slug; while (taken(slug)) slug = `${base}-${i++}`; }
  mutate((s) => {
    let n = patchSub(s, id, (y) => ({ ...y, slug, status: "published", feedback: [...y.feedback, fb(actor.name, "publish", "Published to the public catalogue.")] }));
    n = notify(n, [x.ownerId], `“${x.title}” is now live in the catalogue.`, `/courses/${slug}`);
    return audit(n, actor.name, "Published course", `${x.title} (${id})`);
  });
  return null;
}
export function archiveSubmission(id: string, actor: AppUser) {
  mutate((s) => audit(patchSub(s, id, (y) => ({ ...y, status: "archived", feedback: [...y.feedback, fb(actor.name, "archive", "Removed from the public catalogue.")] })), actor.name, "Unpublished course", id));
}

/* ---------- catalogue (static sample + published creator courses) ---------- */
const hue = (t: string) => [...t].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
export const placeholderThumb = (title: string, category: string) => {
  const h = hue(category);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(${h},70%,38%)'/><stop offset='1' stop-color='hsl(${(h + 50) % 360},70%,22%)'/></linearGradient></defs><rect width='640' height='360' fill='url(#g)'/><text x='32' y='320' fill='white' font-family='sans-serif' font-size='28' font-weight='700'>${title.replace(/[<>&']/g, "").slice(0, 34)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export function toCourse(x: Submission): Course {
  return {
    slug: x.slug ?? slugify(x.title), title: x.title, category: x.category, level: x.level, weeks: x.weeks, type: x.ownerType,
    instructor: { name: x.ownerName, role: x.ownerType === "Student Creator" ? "Student Creator — faculty reviewed" : "Faculty Creator" },
    description: x.description.length > 170 ? `${x.description.slice(0, 167)}…` : x.description, overview: x.description,
    keywords: x.keywords, thumbnail: placeholderThumb(x.title, x.category), learners: 0, rating: 0,
    addedOn: (x.updatedAt || now()).slice(0, 10), outcomes: x.outcomes.filter(Boolean), prerequisites: x.prerequisites.filter(Boolean),
    modules: x.modules.map<Module>((m) => ({
      title: m.title,
      lessons: m.lessons.map((l) => ({
        title: l.title, minutes: l.minutes, kind: l.kind, description: l.description || undefined, videoUrl: l.videoUrl || undefined,
        captionsUrl: l.captionsUrl || undefined, resources: l.resources.filter((r) => r.title && r.url), transcript: l.transcript || undefined,
      })),
    })),
  };
}
export const publishedCourses = (s: PlatformState = platform.get()) => s.submissions.filter((x) => x.status === "published" && x.slug).map(toCourse);
export const allCourses = (s: PlatformState = platform.get()): Course[] => [...staticCourses, ...publishedCourses(s)];
export const findCourse = (slug: string) => allCourses().find((c) => c.slug === slug);
export function useAllCourses(): Course[] {
  const s = usePlatform();
  return allCourses(s);
}

/* ---------- quizzes ---------- */
export function getQuiz(slug: string, s: PlatformState = platform.get()): Quiz | undefined {
  const sub = s.submissions.find((x) => x.slug === slug && x.status === "published");
  return sub?.quiz ?? sampleQuizzes[slug];
}
/** Single source of truth for correctness: certificates and bestAttempt read attempt.score. */
export function isCorrect(q: QuizQuestion, a: number | number[] | undefined): boolean {
  if (q.type === "multi") {
    if (!Array.isArray(a) || a.length === 0) return false;
    const want = [...(q.correctAll ?? [])].sort((x, y) => x - y);
    const got = [...a].sort((x, y) => x - y);
    return want.length === got.length && want.every((v, i) => v === got[i]);
  }
  return a === q.correct;
}
export const scoreQuiz = (quiz: Quiz, answers: Record<string, number | number[]>) => {
  const right = quiz.questions.filter((q) => isCorrect(q, answers[q.id])).length;
  const score = quiz.questions.length ? Math.round((right / quiz.questions.length) * 100) : 0;
  return { right, total: quiz.questions.length, score, passed: score >= quiz.passMark };
};
export function submitAttempt(
  user: AppUser,
  slug: string,
  answers: Record<string, number | number[]>,
  meta?: AttemptMeta,
): QuizAttempt | string {
  const s0 = platform.get();
  const quiz = getQuiz(slug, s0);
  if (!quiz) return "No assessment is available for this course.";
  const used = s0.attempts.filter((a) => a.userId === user.id && a.slug === slug).length;
  if (used >= quiz.maxAttempts) return "You have used all attempts for this assessment.";
  const r = scoreQuiz(quiz, answers);
  const attempt: QuizAttempt = {
    id: uid("at"),
    userId: user.id,
    slug,
    at: now(),
    score: r.score,
    passed: r.passed,
    answers,
    ...(meta ? { meta } : {}),
  };
  mutate((s) => ({ ...s, attempts: [attempt, ...s.attempts] }));
  return attempt;
}
export const bestAttempt = (attempts: QuizAttempt[], userId: string, slug: string) =>
  attempts.filter((a) => a.userId === userId && a.slug === slug).sort((a, b) => b.score - a.score)[0];

/* ---------- certificates ---------- */
/** Completion rule: every lesson done AND (no quiz OR quiz passed). */
export function eligibility(opts: { totalLessons: number; doneLessons: number; hasQuiz: boolean; quizPassed: boolean }) {
  const reasons: string[] = [];
  if (opts.doneLessons < opts.totalLessons) reasons.push(`Complete all lessons (${opts.doneLessons}/${opts.totalLessons}).`);
  if (opts.hasQuiz && !opts.quizPassed) reasons.push("Pass the course assessment.");
  return { eligible: reasons.length === 0, reasons };
}
export const newCertificateCode = () => {
  const a = new Uint8Array(6);
  (globalThis.crypto ?? { getRandomValues: (x: Uint8Array) => x.map(() => Math.floor(Math.random() * 256)) }).getRandomValues(a);
  return `JFET-${[...a].map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("")}`;
};
export function requestCertificate(user: AppUser, course: Course, quizScore?: number): string | null {
  const s0 = platform.get();
  if (s0.certificates.some((c) => c.learnerId === user.id && c.slug === course.slug && c.status !== "rejected")) return "A certificate request already exists for this course.";
  const cert: Certificate = { id: newCertificateCode(), slug: course.slug, courseTitle: course.title, learnerId: user.id, learnerName: user.name, status: "requested", requestedAt: now(), quizScore };
  mutate((s) => audit(notify({ ...s, certificates: [cert, ...s.certificates] }, idsWithRole(s, "admin"), `${user.name} requested a certificate for “${course.title}”.`, "/admin"), user.name, "Requested certificate", cert.id));
  return null;
}
export function decideCertificate(id: string, approve: boolean, actor: AppUser) {
  mutate((s) => {
    const c = s.certificates.find((x) => x.id === id);
    if (!c) return s;
    let n: PlatformState = { ...s, certificates: s.certificates.map((x) => (x.id === id ? { ...x, status: approve ? "issued" : "rejected", issuedAt: approve ? now() : undefined, issuedBy: approve ? actor.name : undefined } : x)) };
    n = notify(n, [c.learnerId], approve ? `Your certificate for “${c.courseTitle}” is ready.` : `Your certificate request for “${c.courseTitle}” was declined.`, approve ? "/certificates" : undefined);
    return audit(n, actor.name, approve ? "Issued certificate" : "Declined certificate", id);
  });
}
export const findCertificate = (code: string) => platform.get().certificates.find((c) => c.id.toLowerCase() === code.trim().toLowerCase());

/* ---------- admin / misc ---------- */
export const setUserRole = (userId: string, role: Role, actor: AppUser) => mutate((s) => audit({ ...s, users: s.users.map((u) => (u.id === userId ? { ...u, role } : u)) }, actor.name, "Changed role", `${userId} → ${role}`));
export const updateProfile = (userId: string, patch: Partial<AppUser>) => mutate((s) => ({ ...s, users: s.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)) }));
export const updatePolicy = (p: Policy, actor: AppUser) => mutate((s) => audit({ ...s, policy: p }, actor.name, "Updated policy", JSON.stringify(p)));
export const markAllRead = (userId: string) => mutate((s) => ({ ...s, notifications: s.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)) }));
export const resetDemoData = () => platform.reset();
