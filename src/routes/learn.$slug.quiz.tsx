import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { findCourse, getQuiz, scoreQuiz, submitAttempt, usePlatform } from "@/data/platform";
import { useAuth } from "@/hooks/use-auth";
import { useEnrollments } from "@/hooks/use-enrollment";
import { btn, btnOutline, card, Empty, fmtDateTime, RequireRole } from "@/components/studio/ui";
import { ExamEntryCard } from "@/components/proctor/ExamEntryCard";
import type { Quiz, QuizAttempt } from "@/data/platform";
import { effectiveMinutes, examSessions, finalizeExpired, sessionKey } from "@/data/proctoring";

export const Route = createFileRoute("/learn/$slug/quiz")({
  head: () => ({ meta: [{ title: "Course assessment — JAIN FET Learning Hub" }, { name: "robots", content: "noindex" }] }),
  component: () => <RequireRole roles={["learner", "creator", "reviewer", "admin"]}><QuizPage /></RequireRole>,
});

function QuizPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const state = usePlatform();
  const enrolled = useEnrollments().includes(slug);
  const course = findCourse(slug);
  const quiz = getQuiz(slug, state);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<ReturnType<typeof scoreQuiz> | null>(null);

  if (!course) return <Empty title="Course not found"><Link to="/courses" className={btn}>Browse courses</Link></Empty>;
  if (!quiz) return <div className="mx-auto max-w-xl px-4 py-16"><Empty title="No assessment yet" body="This course doesn't have an assessment published."><Link to="/learn/$slug/$lessonId" params={{ slug, lessonId: "1-1" }} className={btn}>Back to lessons</Link></Empty></div>;
  if (!enrolled) return <div className="mx-auto max-w-xl px-4 py-16"><Empty title="Enroll to take the assessment"><Link to="/courses/$slug" params={{ slug }} className={btn}>View course</Link></Empty></div>;

  const mine = state.attempts.filter((a) => a.userId === user!.id && a.slug === slug);
  const left = quiz.maxAttempts - mine.length;
  if (quiz.proctor) {
    return <ProctoredQuiz slug={slug} title={course.title} quiz={quiz} mine={mine} left={left} />;
  }
  const complete = quiz.questions.every((q) => answers[q.id] !== undefined);

  const submit = () => {
    const a = submitAttempt(user!, slug, answers);
    if (typeof a === "string") { toast.error(a); return; }
    setResult(scoreQuiz(quiz, answers));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/my-learning" className="text-sm font-semibold text-primary">← My Learning</Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{course.title}: Final assessment</h1>
      <p className="mt-2 text-sm text-muted-foreground">{quiz.questions.length} questions · pass mark {quiz.passMark}% · {left > 0 ? `${left} of ${quiz.maxAttempts} attempts left` : "no attempts left"}</p>

      {result && (
        <div className={`${card} mt-6 ${result.passed ? "border-success" : "border-destructive"}`} role="status">
          <p className="text-2xl font-bold">{result.score}% — {result.passed ? "Passed 🎉" : "Not passed yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">{result.right} of {result.total} correct.{result.passed && " You can now request your certificate."}</p>
          <div className="mt-4 flex gap-3">
            {result.passed && <Link to="/certificates" className={btn}>Go to certificates</Link>}
            {!result.passed && left > 0 && <button className={btnOutline} onClick={() => { setResult(null); setAnswers({}); }}>Try again</button>}
          </div>
        </div>
      )}

      <ol className="mt-8 space-y-6">
        {quiz.questions.map((q, i) => (
          <li key={q.id} className={card}>
            <p className="font-semibold">{i + 1}. {q.prompt}</p>
            <div className="mt-3 space-y-2" role="radiogroup" aria-label={q.prompt}>
              {q.options.filter((o) => o.trim()).map((o, oi) => {
                const picked = answers[q.id] === oi;
                const show = !!result;
                return (
                  <label key={oi} className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm ${picked ? "border-primary bg-secondary" : "border-border"} ${show && oi === q.correct ? "border-success bg-success/10" : ""}`}>
                    <input type="radio" name={q.id} disabled={show || left <= 0} checked={picked} onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} />
                    <span className="flex-1">{o}</span>
                    {show && oi === q.correct && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {show && picked && oi !== q.correct && <XCircle className="h-4 w-4 text-destructive" />}
                  </label>
                );
              })}
            </div>
            {result && <p className="mt-3 text-sm text-muted-foreground">{q.explanation}</p>}
          </li>
        ))}
      </ol>
      {!result && <button className={`${btn} mt-6`} disabled={!complete || left <= 0} onClick={submit}>Submit answers</button>}
      {!result && !complete && <p className="mt-2 text-xs text-muted-foreground">Answer every question to submit.</p>}

      {mine.length > 0 && (
        <section className="mt-10">
          <h2 className="font-bold">Attempt history</h2>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card text-sm">
            {mine.map((a) => <li key={a.id} className="flex justify-between px-4 py-2"><span>{fmtDateTime(a.at)}</span><span className={a.passed ? "font-semibold text-success" : "text-muted-foreground"}>{a.score}% {a.passed ? "· passed" : ""}</span></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Proctored assessments: an entry card that opens the exam in its own tab, plus history. */
function ProctoredQuiz({
  slug,
  title,
  quiz,
  mine,
  left,
}: {
  slug: string;
  title: string;
  quiz: Quiz;
  mine: QuizAttempt[];
  left: number;
}) {
  const { user } = useAuth();

  // Close out an exam whose deadline passed while its tab was closed.
  useEffect(() => {
    if (user) finalizeExpired(user, slug, quiz);
  }, [user, slug, quiz]);

  const minutes = quiz.proctor ? effectiveMinutes(quiz.proctor, user?.timeMultiplier ?? 1) : 0;
  // Subscribed, so the label flips to "Resume exam" while the exam tab runs (server snapshot: {}).
  const sessions = examSessions.use();
  const active = !!user && !!sessions[sessionKey(slug, user.id)];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/my-learning" className="text-sm font-semibold text-primary">
        ← My Learning
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{title}: Final assessment</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {quiz.questions.length} questions · pass mark {quiz.passMark}% ·{" "}
        {left > 0 ? `${left} of ${quiz.maxAttempts} attempts left` : "no attempts left"}
      </p>

      <ExamEntryCard
        quiz={quiz}
        slug={slug}
        attemptsLeft={left}
        maxAttempts={quiz.maxAttempts}
        hasActiveSession={active}
        minutes={minutes}
        requireFullscreen={quiz.proctor?.requireFullscreen ?? true}
      />

      {mine.length > 0 && (
        <section className="mt-10">
          <h2 className="font-bold">Attempt history</h2>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card text-sm">
            {mine.map((a) => {
              const n = a.meta?.violations.filter((v) => v.counted).length ?? 0;
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span>{fmtDateTime(a.at)}</span>
                  <span className="flex items-center gap-2">
                    {n > 0 && (
                      <span className="rounded bg-warning/15 px-1.5 text-xs font-semibold text-warning">
                        <span aria-hidden="true">⚠ {n}</span>
                        <span className="sr-only">{n} warnings</span>
                      </span>
                    )}
                    <span
                      className={a.passed ? "font-semibold text-success" : "text-muted-foreground"}
                    >
                      {a.score}% {a.passed ? "· passed" : ""}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
