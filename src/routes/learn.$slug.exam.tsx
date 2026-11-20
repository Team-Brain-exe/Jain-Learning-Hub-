import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ExamIntro } from "@/components/proctor/ExamIntro";
import { ExamResult } from "@/components/proctor/ExamResult";
import { ExamTopBar } from "@/components/proctor/ExamTopBar";
import { FullscreenGuard } from "@/components/proctor/FullscreenGuard";
import { QuestionNavigator } from "@/components/proctor/QuestionNavigator";
import { QuestionView } from "@/components/proctor/QuestionView";
import { ReviewScreen } from "@/components/proctor/ReviewScreen";
import { SecondTabBlocker } from "@/components/proctor/SecondTabBlocker";
import { SubmitDialog } from "@/components/proctor/SubmitDialog";
import { ViolationWarning } from "@/components/proctor/ViolationWarning";
import { btn, btnOutline, card, Empty, RequireRole } from "@/components/studio/ui";
import { findCourse, getQuiz, usePlatform, type AppUser, type Quiz } from "@/data/platform";
import { effectiveMinutes, isAnswered, type ExamSession } from "@/data/proctoring";
import { useAuth } from "@/hooks/use-auth";
import { useEnrollments } from "@/hooks/use-enrollment";
import { useExamSession } from "@/hooks/use-exam-session";
import { useExamShortcuts } from "@/hooks/use-exam-shortcuts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/learn/$slug/exam")({
  head: () => ({
    meta: [{ title: "Exam — JAIN FET Learning Hub" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireRole roles={["learner", "creator", "reviewer", "admin"]}>
      <ExamPage />
    </RequireRole>
  ),
});

function Shell({ children }: { children: ReactNode }) {
  return <div className="fixed inset-0 z-50 overflow-auto bg-background">{children}</div>;
}

function Guard({ slug, title, body }: { slug: string; title: string; body?: string | undefined }) {
  return (
    <Shell>
      <div className="mx-auto max-w-xl px-4 py-16">
        <Empty title={title} {...(body ? { body } : {})}>
          <Link to="/learn/$slug/quiz" params={{ slug }} className={btn}>
            Back to the course quiz
          </Link>
        </Empty>
      </div>
    </Shell>
  );
}

function ExamPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const state = usePlatform();
  const enrolled = useEnrollments().includes(slug);
  const course = findCourse(slug);
  const quiz = getQuiz(slug, state);

  if (!course) return <Guard slug={slug} title="Course not found" />;
  if (!quiz?.proctor) return <Guard slug={slug} title="This assessment isn't a proctored exam" />;
  if (!enrolled) return <Guard slug={slug} title="Enroll to take the exam" />;
  // RequireRole guarantees a user.
  return <ExamShell user={user!} slug={slug} quiz={quiz} courseTitle={course.title} />;
}

function ExamShell({
  user,
  slug,
  quiz,
  courseTitle,
}: {
  user: AppUser;
  slug: string;
  quiz: Quiz;
  courseTitle: string;
}) {
  const exam = useExamSession({ user, slug, quiz });
  const { attempts } = usePlatform();
  const [submitOpen, setSubmitOpen] = useState(false);

  // Keep the last live session so the result can still show it after finishing deletes it.
  const [snapshot, setSnapshot] = useState<ExamSession | undefined>(exam.session);
  if (exam.session && exam.session !== snapshot) setSnapshot(exam.session);

  const cfg = quiz.proctor!;
  const minutes = effectiveMinutes(cfg, user.timeMultiplier ?? 1);
  const mine = attempts.filter((a) => a.userId === user.id && a.slug === slug).length;
  const left = quiz.maxAttempts - mine;

  const session = exam.session;
  const blocked = exam.needsFullscreen || exam.otherTabActive;
  const qid = session?.order[session.current];
  const question = quiz.questions.find((q) => q.id === qid);
  const optionOrder =
    (question && session?.optionOrder[question.id]) ?? question?.options.map((_, i) => i) ?? [];
  const current = session?.current ?? 0;
  const total = session?.order.length ?? 0;
  const isLast = current >= total - 1;
  const showQuestions = exam.phase === "active" && !blocked;

  // The sheet unmounts without closing when the questions are hidden; don't leave shortcuts off.
  const [sheetOpen, setSheetOpen] = useState(false);
  if (sheetOpen && !showQuestions) setSheetOpen(false);

  const prev = () => {
    if (current > 0) exam.go(current - 1);
  };
  const next = () => {
    if (isLast) exam.openReview();
    else exam.go(current + 1);
  };

  useExamShortcuts({
    enabled:
      exam.phase === "active" &&
      !exam.warning &&
      !exam.needsFullscreen &&
      !exam.otherTabActive &&
      !submitOpen &&
      !sheetOpen,
    optionCount: optionOrder.length,
    onPick: (display) => {
      if (!question || !session) return;
      const original = optionOrder[display];
      if (original === undefined) return;
      if (question.type !== "multi") {
        exam.answer(question.id, original);
        return;
      }
      const cur = session.answers[question.id];
      const picked = Array.isArray(cur) ? cur : cur === undefined ? [] : [cur];
      const nextPicked = picked.includes(original)
        ? picked.filter((n) => n !== original)
        : [...picked, original].sort((a, b) => a - b);
      exam.answer(question.id, nextPicked.length ? nextPicked : undefined);
    },
    onPrev: prev,
    onNext: next,
    onFlag: () => {
      if (question) exam.flag(question.id);
    },
  });

  if (exam.phase === "finished" && exam.result) {
    const snap = snapshot;
    return (
      <Shell>
        <ExamResult
          quiz={quiz}
          slug={slug}
          score={exam.result.score}
          attempt={exam.result.attempt}
          attemptNo={mine}
          order={snap?.order ?? quiz.questions.map((q) => q.id)}
          optionOrder={snap?.optionOrder ?? {}}
          answers={exam.result.attempt.answers}
          onClose={() => window.close()}
        />
      </Shell>
    );
  }

  if (exam.phase === "intro" && left <= 0) {
    return <Guard slug={slug} title="No attempts left" body={exam.error ?? undefined} />;
  }

  const answers = session?.answers ?? {};
  const flagged = session?.flagged ?? [];
  const answered = session ? session.order.filter((id) => isAnswered(answers[id])).length : 0;
  const answeredPct = total ? (answered / total) * 100 : 0;
  const unanswered = total - answered;

  return (
    <Shell>
      {exam.phase === "intro" && (
        <>
          {exam.error && (
            <p
              role="alert"
              className="mx-auto mt-6 w-full max-w-5xl rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {exam.error}
            </p>
          )}
          <ExamIntro
            quiz={quiz}
            courseTitle={courseTitle}
            attemptsLeft={left}
            maxAttempts={quiz.maxAttempts}
            minutes={minutes}
            maxViolations={cfg.maxViolations}
            onStart={() => void exam.start()}
            singleTab={!exam.otherTabActive}
          />
        </>
      )}

      {(exam.phase === "active" || exam.phase === "reviewing") && session && (
        <ExamTopBar
          title={courseTitle}
          section={exam.phase === "active" ? question?.section : undefined}
          saveState={exam.saveState === "failed" ? "error" : exam.saveState}
          counted={exam.counted}
          max={cfg.maxViolations}
          secondsLeft={exam.secondsLeft}
          answeredPct={answeredPct}
          onSubmit={exam.phase === "reviewing" ? () => setSubmitOpen(true) : exam.openReview}
        />
      )}

      {exam.phase === "active" && session && (
        <>
          {showQuestions && question && (
            <>
              <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 pb-24 lg:grid-cols-[1fr_300px] lg:pb-6">
                <div className="min-w-0 space-y-4">
                  <QuestionView
                    question={question}
                    index={current}
                    total={total}
                    optionOrder={optionOrder}
                    answer={answers[question.id]}
                    flagged={flagged.includes(question.id)}
                    onAnswer={(a) => exam.answer(question.id, a)}
                    onFlag={() => exam.flag(question.id)}
                    onPrev={prev}
                    onNext={next}
                    hideNav
                  />
                  <div className="hidden items-center justify-between gap-2 lg:flex">
                    <button
                      type="button"
                      className={btnOutline}
                      onClick={prev}
                      disabled={current === 0}
                    >
                      ← Previous
                    </button>
                    <button type="button" className={btn} onClick={next}>
                      {isLast ? "Review answers →" : "Save & next →"}
                    </button>
                  </div>
                </div>
                <aside className={cn(card, "hidden self-start lg:block")}>
                  <QuestionNavigator
                    quiz={quiz}
                    order={session.order}
                    answers={answers}
                    flagged={flagged}
                    current={current}
                    onGo={exam.go}
                  />
                  <button
                    type="button"
                    className={cn(btnOutline, "mt-5 w-full")}
                    onClick={exam.openReview}
                  >
                    Review &amp; submit
                  </button>
                </aside>
              </div>
              <nav
                aria-label="Question navigation"
                className="fixed inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t bg-card p-3 lg:hidden"
              >
                <button
                  type="button"
                  className={cn(btnOutline, "px-3")}
                  onClick={prev}
                  disabled={current === 0}
                  aria-label="Previous question"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <QuestionNavigator
                  quiz={quiz}
                  order={session.order}
                  answers={answers}
                  flagged={flagged}
                  current={current}
                  onGo={exam.go}
                  variant="sheet"
                  onReview={exam.openReview}
                  onOpenChange={setSheetOpen}
                />
                <button type="button" className={cn(btn, "px-4")} onClick={next}>
                  {isLast ? "Review" : "Next"}
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </nav>
            </>
          )}
        </>
      )}

      {exam.phase === "reviewing" && session && !blocked && (
        <>
          <ReviewScreen
            quiz={quiz}
            order={session.order}
            answers={answers}
            flagged={flagged}
            onGo={(i) => {
              exam.go(i);
              exam.closeReview();
            }}
            onBack={exam.closeReview}
            onSubmit={() => setSubmitOpen(true)}
          />
          <SubmitDialog
            open={submitOpen}
            unanswered={unanswered}
            onCancel={() => setSubmitOpen(false)}
            onConfirm={() => {
              setSubmitOpen(false);
              exam.submit();
            }}
          />
        </>
      )}

      <FullscreenGuard
        open={exam.needsFullscreen && !exam.otherTabActive}
        secondsLeft={exam.secondsLeft}
        {...(exam.counted > 0
          ? { warningText: `${exam.counted} of ${cfg.maxViolations} warnings recorded.` }
          : {})}
        onEnter={() => void exam.enterFullscreen()}
      />
      <ViolationWarning warning={exam.warning} onAcknowledge={exam.dismissWarning} />
      <SecondTabBlocker open={exam.otherTabActive} onTakeOver={exam.takeOver} />
    </Shell>
  );
}
