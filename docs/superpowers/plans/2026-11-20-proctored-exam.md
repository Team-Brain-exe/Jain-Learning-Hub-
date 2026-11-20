# Proctored Exam Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full proctored exam mode. A proctored course assessment opens in a new tab as a
timed, one-question-at-a-time exam with a navigator, fullscreen and tab-leaving detection,
warnings, auto-submit, review-before-submit and a detailed result, plus builder settings and an
admin violations view.

**Architecture:**
- **Route:** a separate route `/learn/$slug/exam` renders a fixed full-viewport shell.
- **State:** exam state lives in a localStorage `createStore` keyed `${slug}:${userId}`, behind
  seam functions in `src/data/proctoring.ts`.
- **Logic and UI:** small hooks (countdown, fullscreen, violation detection) are composed by
  `useExamSession`, a phase machine; presentational components live in `src/components/proctor/`.
- **Scoring:** a single `scoreQuiz` in `platform.ts` handles the new question types.

**Tech Stack:** React 19, TypeScript, TanStack Router (file routes), Tailwind v4 tokens, shadcn
(`alert-dialog`, `sheet`, `progress`, `checkbox`, `switch`, `select`), lucide-react, sonner, vitest +
@testing-library/react (jsdom).

**Spec:** `docs/superpowers/specs/2026-11-20-proctored-exam-design.md`

## Global Constraints

- A quiz **without** `proctor` must behave exactly as today. Never edit or delete existing tests.
- Do not edit `src/routeTree.gen.ts` (the router plugin regenerates it), `src/components/ui/*`,
  `src/routes/__root.tsx`, or `supabase/migrations/`.
- `src/data/platform.ts`: only the changes in Task 1. `git pull` before touching it.
- Colours come from tokens only (`text-success`, `bg-warning/15`, `text-destructive`, `bg-primary`…). No hex values.
  No Flowbite dependency.
- Every browser-storage access is wrapped in try/catch (use `createStore`, which already does).
- Copy says "recorded", never "prevented" or "secure".
- One task = one branch `feat/ojush-p<N>-<slug>` = one PR into `main`; no force-push (Lovable sync).
- Before each PR, run `npm run test && npm run build` and `npx eslint <changed files>`, and all must
  pass. Repo-wide lint already fails on `main` because of older files; say so in the PR.
- Scoring: 1 mark per question. Multi-select is an exact set match. An empty answer counts as skipped.
- Violation debounce is 1000 ms; timer tick 250 ms; low-time thresholds 5 min (warning) and
  1 min (destructive); live announcements at 10, 5 and 1 min; heartbeat 5 s, stale after 15 s.

## Review Focus

1. **Storage blocked (private mode or quota):** the exam still starts and submits from memory, and
   the top bar shows "Not saved: don't close this tab". Test in Task 5.
2. **Quiz edited after a session started:** `order` ids that no longer exist are dropped and new
   question ids are appended, with no crash. Test in Task 5.
3. **Opening `/learn/<slug>/exam` directly** when the quiz is not proctored, the student isn't
   enrolled, or no attempts are left (and no session exists) shows an explanatory empty state with a
   link back, never the exam. Test in Task 9.
4. **Multi-select answer cleared to `[]`** counts as skipped, not wrong, and never as correct. Test in
   Task 1.
5. **Questions with no `section`** are grouped under "Questions" in the navigator and the per-section
   score. Tests in Tasks 1 and 7.

---

### Task 1 (P-0): Types, scoring, sample exam data

**Files:**
- Create: `src/data/proctoring.ts` (types and pure helpers only for now)
- Modify: `src/data/platform.ts` (the `QuizQuestion`, `Quiz`, `QuizAttempt` and `AppUser`
  interfaces on lines 15–41, `USERS` on 58–63, `scoreQuiz` and `submitAttempt` on 287–302)
- Modify: `src/data/quizzes.ts` (the DSA quiz)
- Modify: `.gitignore` (add `.superpowers/`)
- Add: `docs/superpowers/specs/2026-11-20-proctored-exam-design.md`, `docs/superpowers/plans/2026-11-20-proctored-exam.md`
- Test: `src/test/proctoring-scoring.test.ts`; append one `describe` at the end of `src/test/platform.test.ts`

**Interfaces:**
- **Produces, in `proctoring.ts`:**
  - `ViolationType`, `Violation`, `ProctorConfig`, `AttemptMeta` and `ExamSession`, exactly as in
    spec §7.1.
  - `remainingSeconds(deadlineMs: number, nowMs: number): number`. It is ≥ 0 and uses
    `Math.ceil` on the seconds.
  - `effectiveMinutes(cfg: ProctorConfig, multiplier = 1): number`
  - `isAnswered(a: number | number[] | undefined): boolean`
  - `scoreExam(quiz: Quiz, answers: Record<string, number | number[]>): ExamScore`, where
    `ExamScore = { right; wrong; skipped; total; score; passed; sections: Record<string, { right: number; total: number }> }`
  - `seededShuffle<T>(items: T[], seed: string): T[]`
- **Produces, in `platform.ts`:**
  - `QuizQuestion.type?: "single" | "multi" | "truefalse"`, `QuizQuestion.correctAll?: number[]`,
    `QuizQuestion.section?: string`
  - `Quiz.proctor?: ProctorConfig`
  - `QuizAttempt.answers: Record<string, number | number[]>` and `QuizAttempt.meta?: AttemptMeta`
  - `AppUser.timeMultiplier?: number`
  - `isCorrect(q: QuizQuestion, a: number | number[] | undefined): boolean`
  - `submitAttempt(user, slug, answers, meta?: AttemptMeta)`

- [ ] **Step 1: Write the failing tests** in `src/test/proctoring-scoring.test.ts`:
  - `remainingSeconds(10_500, 0) === 11`; `remainingSeconds(5000, 5000) === 0`;
    `remainingSeconds(1000, 9000) === 0`
  - `effectiveMinutes({durationMinutes: 20, maxViolations: 3, requireFullscreen: true}, 1.5) === 30`
  - `isCorrect` on a multi question with `correctAll [0,2]`: `[2,0]` is true, `[0]` is false,
    `[0,1,2]` is false, `[]` is false
  - `scoreExam` on a 4-question quiz (one single, one multi, one true/false, one without `section`)
    with answers `{single correct, multi: [], tf wrong}` returns `right 1, wrong 1, skipped 2,
    total 4, score 25`. `sections` has keys `"A"` and `"Questions"`.
  - `seededShuffle([1,2,3,4,5], "s1")` returns the same result twice and is a permutation of the
    input.
  - **In `platform.test.ts`:** `submitAttempt(learner, slug, answers, meta)` stores `meta`
    unchanged on the attempt, and calling it without `meta` leaves `meta` `undefined`.
  - **Also in `platform.test.ts`:** `scoreQuiz` on an untyped question scores exactly as before.

- [ ] **Step 2: Run** `npx vitest run src/test/proctoring-scoring.test.ts src/test/platform.test.ts`.
  Expected: FAIL (module/exports missing).

- [ ] **Step 3: Implement the changes.**
  - **Exports and types:** add the `proctoring.ts` exports and the optional `platform.ts` fields.
  - **`isCorrect`:**
    - For `type === "multi"`, it is a sorted set equality with `correctAll` and requires
      `a.length > 0`.
    - Otherwise it is `a === q.correct`.
  - **`scoreQuiz`:** count rights with `isCorrect`. Its return shape is unchanged.
  - **`submitAttempt`:** gets a 4th optional parameter and spreads `meta` only when defined.
  - **`scoreExam`:** groups by `q.section ?? "Questions"`.
  - **`seededShuffle`:** a Fisher–Yates shuffle driven by a mulberry32 PRNG seeded from a string hash.
  - **`USERS`:** give `u-learner` `timeMultiplier: 1.5`.
  - **DSA quiz:**
    - 10 questions: the 4 existing ones (as section "A · Basics") plus 6 new ones, of which ≥ 1 is
      `type: "multi"` with `correctAll` and `correct = correctAll[0]`, ≥ 1 is
      `type: "truefalse"` with options `["True","False"]`, and the rest are in "B · Applied".
    - `proctor: { durationMinutes: 2, maxViolations: 3, requireFullscreen: true, shuffleQuestions: true, shuffleOptions: true }`.
  - **Python quiz:** leave it untouched.

- [ ] **Step 4: Run** `npm run test`. Expected: all pass, including every pre-existing test.

- [ ] **Step 5: Commit, push and open the PR.** Title: `[P-0] feat(exam): proctoring types, scoring for new question types, demo exam`.
  The PR body must flag that `scoreQuiz`/`answers` changed beyond "optional fields only" and why
  (spec §7.2).

---

### Task 2 (P-1): `useCountdown` and `QuizTimer`

**Files:**
- Create: `src/hooks/use-countdown.ts`, `src/components/proctor/QuizTimer.tsx`
- Test: `src/test/use-countdown.test.ts`, `src/test/quiz-timer.test.tsx`

**Interfaces:**
- Consumes: `remainingSeconds` (Task 1).
- Produces:
  - `useCountdown(deadlineMs: number | null, onExpire: () => void): { secondsLeft: number; expired: boolean }`
  - `<QuizTimer secondsLeft={number} />`, which renders `mm:ss` (or `h:mm:ss` at an hour or more)
    with the `Clock` icon:
    - At 300 s or more: `bg-muted`. Below 300 s: `bg-warning/15 text-warning`. Below 60 s:
      `bg-destructive/10 text-destructive`.
    - A visually hidden `aria-live="polite"` span announces "10 minutes left", "5 minutes left" or
      "1 minute left" only when crossing those thresholds.

- [ ] **Step 1: Write the failing tests**, using `vi.useFakeTimers()` and `vi.setSystemTime`:
  - Ticks reach 0 and `onExpire` is called exactly once, even after a further 5 s.
  - A deadline already in the past calls `onExpire` once on mount and `secondsLeft === 0`.
  - After unmount, advancing timers doesn't call `onExpire`.
  - `null` deadline: no interval and `secondsLeft === 0`, `expired === false`.
  - Jumping the system time forward 90 s (sleep) makes the next tick show the reduced time, not
    −0.25 s.
  - `QuizTimer`: 125 → "02:05"; 59 → has the class `text-destructive`; the live region text at 299
    is "5 minutes left".
- [ ] **Step 2: Run** `npx vitest run src/test/use-countdown.test.ts src/test/quiz-timer.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** Use a 250 ms `setInterval`; recompute from `Date.now()`; guard
  `onExpire` with a ref so it fires once per deadline value; clear the interval on unmount. Keep
  `onExpire` in a ref so a new callback identity doesn't restart the interval.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit and open the PR** `[P-1] feat(exam): deadline-based countdown and QuizTimer`, with screenshots of the 3 timer states.

---

### Task 3 (P-2): `useFullscreen` and `FullscreenGuard`

**Files:**
- Create: `src/hooks/use-fullscreen.ts`, `src/components/proctor/FullscreenGuard.tsx`
- Test: `src/test/use-fullscreen.test.tsx`

**Interfaces:**
- Produces:
  - `useFullscreen(): { supported: boolean; isFullscreen: boolean; enter: () => Promise<boolean>; exit: () => Promise<void> }`.
    `supported` is `!!document.documentElement.requestFullscreen && document.fullscreenEnabled !== false`.
    `enter` resolves `false` when it is rejected.
  - `<FullscreenGuard open={boolean} secondsLeft={number} warningText?: string onEnter={() => void} />`:
    - A `fixed inset-0 z-[60] bg-navy text-navy-foreground` overlay with `role="dialog"` and
      `aria-modal="true"`.
    - Heading: "Return to fullscreen to continue". Text: "Your questions are hidden. The timer is
      still running:" followed by `mm:ss`.
    - Button "Enter fullscreen", focused on open.

- [ ] **Step 1: Write the failing tests.**
  - Stub `document.documentElement.requestFullscreen` and `document.exitFullscreen` with
    `vi.fn()`; dispatch `fullscreenchange` after setting `document.fullscreenElement` via
    `Object.defineProperty`. `isFullscreen` flips both ways.
  - With `requestFullscreen` deleted, `supported` is false and `enter()` resolves false.
  - `FullscreenGuard open` renders the heading, focuses the button, and the click calls `onEnter`.
  - `open={false}` renders nothing.
- [ ] **Step 2: Run** `npx vitest run src/test/use-fullscreen.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** both pieces.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit and open the PR** `[P-2] feat(exam): fullscreen hook and return-to-fullscreen overlay`, with 375px and 1280px screenshots.

---

### Task 4 (P-3): `useViolationDetection`

**Files:**
- Create: `src/hooks/use-violation-detection.ts`
- Test: `src/test/use-violation-detection.test.ts`

**Interfaces:**
- Consumes: `ViolationType` (Task 1).
- Produces: `useViolationDetection({ active: boolean; watchFullscreen: boolean; onViolation: (type: ViolationType) => void }): void`.
  - **Event mapping:** `visibilitychange` with `document.visibilityState === "hidden"` →
    `tab_hidden`; window `blur` → `window_blur`; `fullscreenchange` to no element while
    `watchFullscreen` → `fullscreen_exit`; `copy`/`cut`/`paste` → `copy_paste`; `contextmenu` →
    `context_menu`.
  - **Prevent defaults:** call `preventDefault()` on `contextmenu`, `copy`, `cut` and `paste`.
  - **Debounce:** any event within 1000 ms of the last *reported* one is ignored.

- [ ] **Step 1: Write the failing tests** (fake timers):
  - Hidden plus blur 50 ms apart → 1 call.
  - A second switch 2 s later → a 2nd call.
  - `active: false` → 0 calls.
  - After unmount, events → 0 calls.
  - `copy` → called with `"copy_paste"` and `defaultPrevented === true`.
  - A fullscreen exit with `watchFullscreen: false` → 0 calls.
- [ ] **Step 2: Run** `npx vitest run src/test/use-violation-detection.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Keep `onViolation` in a ref; attach listeners only while `active`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit and open the PR** `[P-3] feat(exam): debounced violation detection hook`.

---

### Task 5 (P-4): Session store, seams and `useExamSession`

**Files:**
- Modify: `src/data/proctoring.ts` (add the store and seams)
- Create: `src/hooks/use-exam-session.ts`
- Test: `src/test/exam-session-store.test.ts`, `src/test/use-exam-session.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–4.
- **Produces, in `proctoring.ts`:**
  - `examSessions` (`createStore<Record<string, ExamSession>>("jfet-exam-sessions-v1", () => ({}))`)
  - `sessionKey(slug, userId)`
  - `getActiveSession(slug, userId): ExamSession | undefined`
  - `startExam(user: AppUser, slug: string, quiz: Quiz, tabId: string): ExamSession`.
    `startedAt` and `deadlineMs` use `effectiveMinutes(quiz.proctor!, user.timeMultiplier ?? 1)`.
    It shuffles with `seededShuffle(ids, sessionKey + startedAt)` when configured; `optionOrder`
    holds the identity when not shuffling.
  - `saveAnswer(key, qid, a: number | number[] | undefined): boolean` (false when storage threw;
    detect by reading back)
  - `toggleFlag(key, qid)`
  - `setCurrent(key, index)`
  - `recordViolation(key, v: Violation)`
  - `heartbeat(key, tabId)`, which writes `ExamSession.lastBeat: number` (add this field)
  - `claimTab(key, tabId)`
  - `finishExam(user, slug, quiz, reason?: "timeout" | "violations"): QuizAttempt | string`. It
    builds `AttemptMeta` (with `timeTakenSec`, `sectionScores`, `skipped` from `scoreExam`), calls
    `submitAttempt` and deletes the session.
  - `finalizeExpired(user, slug, quiz, now = Date.now()): QuizAttempt | null`
  - `reconcileOrder(session, quiz): ExamSession`, which drops unknown ids and appends new ones
    (Review Focus 2)
  - Each seam carries a `/** → POST/GET /api/... */` comment, following the
    `upload-permissions.ts` style.
- **Produces, in `use-exam-session.ts`:**
  - `useExamSession({ user, slug, quiz }): ExamSessionApi` with:
    - `phase: "intro" | "active" | "reviewing" | "finished"`
    - `session?: ExamSession`, `secondsLeft: number`
    - `counted: number` (violations with `counted: true`)
    - `warning: { n: number; max: number; type: ViolationType; at: string; last: boolean } | null`
    - `needsFullscreen: boolean`, `otherTabActive: boolean`
    - `saveState: "saved" | "saving" | "failed"`
    - `result: { attempt: QuizAttempt; score: ExamScore } | null`
    - `start(): Promise<void>`, `answer(qid, a)`, `flag(qid)`, `go(index)`, `openReview()`,
      `closeReview()`, `submit()`, `dismissWarning()`, `enterFullscreen()`, `takeOver()`
  - `const tabId` comes from `crypto.randomUUID()` once per mount.
  - **Phase rules:**
    - Use the first matching rule:
      1. `finished` when `result` is set.
      2. `active` when a session exists and `finalizeExpired` didn't close it.
      3. Otherwise `intro`.
    - `reviewing` is entered by `openReview()`.
  - **Violation counting:**
    - A violation is counted unless its type is `fullscreen_unsupported` or `second_tab`.
    - Reaching `maxViolations` calls `finishExam(..., "violations")` and shows no warning.
    - A fullscreen exit counts as a violation and also sets `needsFullscreen` (only when
      `requireFullscreen && supported`).
    - When `!supported`, record one uncounted `fullscreen_unsupported` violation at start.
  - **Expiry:** `useCountdown` expiry calls `finishExam(..., "timeout")`.
  - **Finishing:**
    - `finishExam` must run once, so guard it with a ref.
    - After finishing, call `exit()` on fullscreen.
  - **Other tabs:**
    - Heartbeat every 5000 ms.
    - `otherTabActive` is true when `session.tabId !== tabId && Date.now() - lastBeat < 15000`.

- [ ] **Step 1: Write the failing store tests** (`exam-session-store.test.ts`, with
  `examSessions.reset()` in `beforeEach`):
  - `startExam` deadline = now + 2 min for `u-creator`, and + 3 min for `u-learner` (1.5×).
  - The shuffled `order` is a permutation and is stable for the same key and `startedAt`.
  - `saveAnswer` → `getActiveSession` returns the answer.
  - After `window.dispatchEvent(new StorageEvent("storage", { key: "jfet-exam-sessions-v1" }))`
    (which clears `createStore`'s in-memory cache, like a reload), `getActiveSession` returns the
    same `deadlineMs`.
  - `finishExam` stores an attempt with `meta.autoSubmitReason === "timeout"` and deletes the session.
  - `finalizeExpired` with `now > deadlineMs` returns an attempt; before the deadline it returns
    `null`.
  - `reconcileOrder` drops `"gone"` and appends `"new"`.
  - **Storage blocked:** `localStorage.setItem` spied to throw, then `startExam` still returns a
    session and `saveAnswer` returns false (Review Focus 1).
- [ ] **Step 2: Write the failing hook tests** (`use-exam-session.test.tsx`, `renderHook`, fake
  timers, fullscreen stubbed as in Task 3):
  - `start()` → `phase === "active"`.
  - Firing `visibilitychange` hidden 3 times, 2 s apart, makes the 3rd finish with `"violations"`;
    `result.attempt.meta.autoSubmitted === true`.
  - Advancing past the deadline gives `"timeout"`.
  - `finishExam` is called once even if the timeout and the 3rd violation happen in the same tick.
  - With `requestFullscreen` deleted, a `fullscreen_unsupported` violation is recorded with
    `counted: false` and `counted === 0`.
  - Re-rendering a fresh hook after `start()` resumes `active` with the same `deadlineMs`.
  - A second hook instance (different `tabId`) sees `otherTabActive === true`; `takeOver()` flips
    it.
- [ ] **Step 3: Run** `npx vitest run src/test/exam-session-store.test.ts src/test/use-exam-session.test.tsx`. Expected: FAIL.
- [ ] **Step 4: Implement** the store, seams and hook.
- [ ] **Step 5: Run** the same command, then `npm run test`. Expected: PASS.
- [ ] **Step 6: Commit and open the PR** `[P-4] feat(exam): exam session store and useExamSession`.

---

### Task 6 (P-5a): Intro, system check, warning, second-tab blocker

**Files:**
- Create: `src/components/proctor/ExamIntro.tsx`, `SystemCheck.tsx`, `ViolationWarning.tsx`, `SecondTabBlocker.tsx`
- Test: `src/test/exam-intro.test.tsx`, `src/test/violation-warning.test.tsx`

**Interfaces:**
- Produces:
  - `<ExamIntro quiz courseTitle attemptsLeft maxAttempts minutes onStart />`. The summary tiles
    show sections with counts, total marks, time and attempts. The five rules use the spec copy.
    The `Checkbox` reads "I have read and understand the rules.", and the button is "Start
    proctored exam", disabled until checked or when `attemptsLeft <= 0`. The right column holds
    `SystemCheck` and the keyboard-shortcut card.
  - `<SystemCheck />`, `useSystemCheck(): { fullscreen: boolean; screenOk: boolean; singleTab: boolean; storageOk: boolean }`.
    `screenOk` means `innerWidth >= 320`. `singleTab` comes from `useExamSession` via a prop, so
    `SystemCheck` takes `singleTab` as a prop. When `!fullscreen`, it shows "Fullscreen isn't
    available on this device, so the exam runs in warn-only mode."
  - `<ViolationWarning warning onAcknowledge />`, built on `AlertDialog`:
    - Title: "Warning {n} of {max}", or "Warning {n} of {max}: last warning" when `last`.
    - Body: the type label plus "This has been recorded."
    - Footer text: "After {max} warnings your attempt is submitted automatically." When `last`, use
      the destructive callout "One more violation will submit your attempt."
    - Its only action is `AlertDialogAction` "I understand".
    - `onEscapeKeyDown={e => e.preventDefault()}`.
  - `TYPE_LABEL: Record<ViolationType, string>` (exported from `ViolationWarning.tsx`):
    - `tab_hidden`: "You left the exam tab."
    - `window_blur`: "The exam window lost focus."
    - `fullscreen_exit`: "You exited fullscreen."
    - `copy_paste`: "Copying or pasting was detected."
    - `context_menu`: "Right-click was detected."
    - `second_tab`: "The exam was opened in another tab."
    - `fullscreen_unsupported`: "Fullscreen isn't available on this device."
  - `<SecondTabBlocker open onTakeOver />` reads "This exam is open in another tab" and has a
    button "Use this tab".

- [ ] **Step 1: Write the failing tests:**
  - Start is disabled until the checkbox is clicked, then enabled, and the click calls `onStart`.
  - With `attemptsLeft 0`, Start stays disabled after checking.
  - The warning renders "Warning 2 of 3: last warning" when `last`.
  - Pressing Escape keeps the dialog open.
  - "I understand" calls `onAcknowledge` and has focus on open.
- [ ] **Step 2: Run** `npx vitest run src/test/exam-intro.test.tsx src/test/violation-warning.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement**, matching mockup screens 2 and 5. Use `card`, `btn` from
  `@/components/studio/ui`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit and open the PR** `[P-5a] feat(exam): intro, system check, warning dialog, second-tab blocker`, with 375px and 1280px screenshots.

---

### Task 7 (P-5b): Top bar, question view, navigator, review and submit

**Files:**
- Create: `src/components/proctor/ExamTopBar.tsx`, `QuestionView.tsx`, `QuestionNavigator.tsx`, `ReviewScreen.tsx`, `SubmitDialog.tsx`
- Test: `src/test/question-view.test.tsx`, `src/test/question-navigator.test.tsx`, `src/test/review-screen.test.tsx`

**Interfaces:**
- **Consumes:** `ExamSession`, `QuizQuestion`, `QuizTimer`.
- **Produces:**
  - **`<ExamTopBar>`**
    - **Props:** `title`, `section`, `saveState`, `counted`, `max`, `secondsLeft` and `onSubmit`.
    - **Layout:** sticky; the warnings chip is hidden when `counted === 0`; under the bar, a
      `Progress` showing the answered %.
    - **Save states:** "Saving…", "Saved ✓" (`text-success`), or "Not saved: don't close this tab"
      (`text-warning`).
  - **`<QuestionView>`**
    - **Props:** `question`, `index`, `total`, `optionOrder: number[]`, `answer`, `flagged`,
      `onAnswer(a)`, `onFlag`, `onPrev`, `onNext` and `readOnly?`.
    - **Inputs by type:** `single` and `truefalse` render a radio group; `multi` renders
      checkboxes with the caption "Select all that apply".
    - **What callbacks receive:** options display in `optionOrder`, but `onAnswer` always receives
      **original** indices.
    - **Clear and flag:** "Clear answer" calls `onAnswer(undefined)`. The flag button has
      `aria-pressed` and reads "Flag for review" or "Flagged".
    - **Text and labels:** the question text has `select-none`; options show their number key.
  - **`useExamShortcuts({ enabled, optionCount, onPick(displayIndex), onPrev, onNext, onFlag })`**
    lives in `QuestionView.tsx`. It ignores events when `enabled` is false or the target is an
    input or textarea.
  - **`<QuestionNavigator>`**
    - **Props:** `quiz`, `order`, `answers`, `flagged`, `current` and `onGo(index)`.
    - **Layout:** grouped by `section ?? "Questions"`, each cell `h-9`, four states via tokens plus
      a legend. Every cell button's `aria-label` is "Question 4, flagged" or "Question 7, current,
      answered".
    - **Variants:** `variant="sidebar" | "sheet"`; the sheet variant wraps it in
      `Sheet side="bottom"` with the trigger "▦ {current+1} / {total}" and a "Review & submit"
      button.
  - **`<ReviewScreen>`**
    - **Props:** `quiz`, `order`, `answers`, `flagged`, `onGo(index)`, `onBack` and `onSubmit`.
    - **Content:** three count tiles and a "Needs attention" list of flagged or unanswered
      questions, each with a "Go →" link.
  - **`<SubmitDialog>`**
    - **Props:** `open`, `unanswered`, `onCancel` and `onConfirm`.
    - **Content:** an `AlertDialog` titled "Submit exam?". With `unanswered > 0`, the body reads
      "{n} questions are unanswered and will be marked wrong. You can't change answers after
      submitting." Buttons: "Keep working" and "Submit now".

- [ ] **Step 1: Write the failing tests:**
  - **Answer mapping:** with `optionOrder [2,0,1,3]`, clicking the first displayed option calls
    `onAnswer(2)`.
  - **Multi-select:** clicking 2 options accumulates `[a,b]`; clicking one again removes it.
  - **Shortcuts:** key `"3"` picks display index 2; key `"f"` calls `onFlag`; keys are ignored when
    `enabled` is false.
  - **Navigator cell names:** cells get the aria-labels described above. Questions with no
    section render under the "Questions" heading (Review Focus 5).
  - **Review screen:** it lists exactly the unanswered and flagged questions, and an empty multi
    answer `[]` is listed as unanswered.
- [ ] **Step 2: Run** `npx vitest run src/test/question-view.test.tsx src/test/question-navigator.test.tsx src/test/review-screen.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement**, matching mockup screens 3, 4 and 6.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit and open the PR** `[P-5b] feat(exam): top bar, question view, navigator, review and submit`, with screenshots.

---

### Task 8 (P-5c): Result, integrity summary, answer review

**Files:**
- Create: `src/components/proctor/ExamResult.tsx`, `IntegritySummary.tsx`, `AnswerReview.tsx`
- Test: `src/test/integrity-summary.test.tsx`, `src/test/exam-result.test.tsx`

**Interfaces:**
- Consumes: `ExamScore`, `AttemptMeta`, `QuestionView` with `readOnly`.
- **Produces:**
  - **`<ExamResult quiz score attempt attemptNo onReview onClose />`:**
    - **Score and status:** a score ring (an SVG circle with `stroke-success` or
      `stroke-destructive`), "Passed 🎉" or "Not passed yet", and "{right} of {total} correct ·
      pass mark {passMark}% · attempt {n} of {max}".
    - **Actions:** a "Go to certificates" link when passed, "Review answers", and "Close tab"
      (`window.close()`, with a `Link` to `/learn/$slug/quiz` as fallback text).
    - **Breakdown card:** correct, wrong and skipped.
    - **By-section card:** one `Progress` bar per section.
  - **`<IntegritySummary meta />`:**
    - **Fields:** "Time taken" (`{m} min {s} s`), "Warnings" (the counted count), "Submitted" (one
      of "By student", "Auto-submitted (time ran out)" or "Auto-submitted (too many violations)"),
      then a list of violations as "`{TYPE_LABEL}` at HH:MM:SS".
    - **No violations:** with zero counted violations it shows "No integrity issues recorded." in
      `text-success`.
  - **`<AnswerReview quiz order answers />`** shows one question at a time with prev/next. Each
    question has a "✓ Correct", "✕ Wrong" or "Skipped" chip, the correct option highlighted
    `border-success`, and the explanation.

- [ ] **Step 1: Write the failing tests:**
  - **IntegritySummary:** with no violations it shows "No integrity issues recorded." and has no
    element with `text-destructive`. With `autoSubmitReason "violations"` it shows "Auto-submitted
    (too many violations)". `timeTakenSec 1399` → "23 min 19 s".
  - **ExamResult:** the certificate link renders only when passed.
- [ ] **Step 2: Run** `npx vitest run src/test/integrity-summary.test.tsx src/test/exam-result.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement**, matching mockup screen 7.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit and open the PR** `[P-5c] feat(exam): result, integrity summary, answer review`.

---

### Task 9 (P-6): Exam route and quiz-page entry

**Files:**
- Create: `src/routes/learn.$slug.exam.tsx`, `src/components/proctor/ExamEntryCard.tsx`
- Modify: `src/routes/learn.$slug.quiz.tsx` (an early branch when `quiz.proctor` is set; a ⚠ chip on history rows)
- Test: `src/test/proctored-quiz.test.tsx`

**Interfaces:**
- Consumes: everything above.
- **Produces:**
  - **The route:** `/learn/$slug/exam`, wrapped in
    `RequireRole roles={["learner","creator","reviewer","admin"]}`, with
    `head` → `{ title: "Exam — JAIN FET Learning Hub", robots: noindex }`.
  - **The shell:** `<div className="fixed inset-0 z-50 overflow-auto bg-background">`. It renders
    by phase:
    - `intro` → `ExamIntro`.
    - `active` → `ExamTopBar` plus a grid: `QuestionView` and a sidebar navigator (≥ lg) or the
      sheet navigator (< lg).
    - `reviewing` → `ReviewScreen` plus `SubmitDialog`.
    - `finished` → `ExamResult`.
    - Always mounted: `FullscreenGuard`, `ViolationWarning` and `SecondTabBlocker`.
    - While the guard or blocker is open, the questions are not rendered.
  - **Guards (Review Focus 3):** each case below renders `Empty` with a link to
    `/learn/$slug/quiz` instead of the exam.
    - No course → "Course not found".
    - No quiz or `!quiz.proctor` → "This assessment isn't a proctored exam".
    - Not enrolled → "Enroll to take the exam".
    - `left <= 0` and no active session → "No attempts left".
  - **`<ExamEntryCard quiz slug attemptsLeft maxAttempts hasActiveSession />`** (mockup 1):
    - The button is an `<a href={`/learn/${slug}/exam`} target="_blank" rel="noopener">`
      labelled "Open exam in new tab", or "Resume exam" when `hasActiveSession`.
    - When `attemptsLeft <= 0` and there is no active session, it is disabled and reads "No
      attempts left".
  - **Quiz page:**
    - If `quiz.proctor`, call `finalizeExpired` once in an effect.
    - Render the header (title, meta line) plus `ExamEntryCard` plus attempt history, and return
      before the old question list.
    - Attempt history rows get
      `<span className="rounded bg-warning/15 px-1.5 text-xs font-semibold text-warning">⚠ {n}</span>`
      when `meta` has counted violations.
    - The non-proctored path is unchanged.

- [ ] **Step 1: Write the failing tests** (render the page components directly, wrapped in a
  router via the pattern in `src/test/app-routing.test.tsx`):
  - The Python quiz (non-proctored) renders the "Submit answers" button as before.
  - The DSA quiz renders "Open exam in new tab" with `target="_blank"`.
  - The exam route for the Python slug shows "This assessment isn't a proctored exam".
  - The exam route for DSA shows "Before you begin" and Start is disabled until the checkbox is
    ticked.
- [ ] **Step 2: Run** `npx vitest run src/test/proctored-quiz.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** Start the dev server once so the router plugin regenerates
  `routeTree.gen.ts`; commit the regenerated file and never hand-edit it.
- [ ] **Step 4: Run** `npm run test && npm run build`. Expected: PASS.
- [ ] **Step 5: Manual run in the browser** (sign in as Ananya; enroll in DSA). Do each of these:
  open in a new tab, start, switch tab, exit fullscreen, answer, flag, refresh mid-exam, close and
  reopen, then let the timer expire.
  Expected:
  - The warnings and overlay appear.
  - The timer continues across refresh and reopen.
  - The result shows "Auto-submitted (time ran out)".
  - The quiz tab's history shows the new row.
- [ ] **Step 6: Commit and open the PR** `[P-6] feat(exam): proctored exam route and quiz-page entry card`, with screenshots of each phase.

---

### Task 10 (P-7): Accessibility, edge cases, docs

**Files:**
- Create: `docs/proctoring.md`
- Modify: any `src/components/proctor/*` file, for fixes found

- [ ] **Step 1: Keyboard-only run** at 375px and 1280px. Check that:
  - Every dialog and overlay focuses its action.
  - Tab order follows the visual order.
  - Shortcuts don't fire while a dialog is open.
- [ ] **Step 2: Contrast.** Compute the rendered contrast of each top-bar state (warning chip,
  timer states, "Not saved") the same way as `docs/QA_MANDHAN_COMPONENTS.md`. Report failures to
  the lead and don't edit tokens.
- [ ] **Step 3: Edge cases.** Run each one and record the result in a table in the PR:
  - Laptop sleep for 1 minute (the deadline still applies).
  - Two tabs (the blocker appears, and takeover works).
  - The back button (the session survives; Resume shows on the quiz page).
  - F11 / Esc out of fullscreen (overlay plus 1 violation).
  - iPhone Safari or responsive emulation with `requestFullscreen` removed (warn-only, never
    blocked).
  - Storage blocked ("Not saved" shows, and submit still works).
- [ ] **Step 4: Write `docs/proctoring.md`** with these sections:
  - How it works
  - What is detected
  - What is **not** detected (other devices, phones, a second monitor, screenshots, virtual
    machines, DevTools edits to localStorage)
  - Why the backend must own the timer and scoring
  - Seam functions → future endpoints
- [ ] **Step 5: Run** `npm run test && npm run build`. Then commit and open the PR `[P-7] docs(exam): accessibility pass, edge-case results, proctoring.md`.

---

### Task 11 (P-8): Builder exam-mode settings

**Files:**
- Modify: `src/components/studio/Builder.tsx` (`QuizTab`, lines 103–131 only)
- Test: `src/test/builder-exam-mode.test.tsx`

**Interfaces:**
- **Consumes:** `Quiz.proctor`, `QuizQuestion.type/correctAll/section`.
- **Produces:**
  - **The "Exam mode" `Switch`:**
    - Turning it on sets `proctor` to
      `{ durationMinutes: 30, maxViolations: 3, requireFullscreen: true, shuffleQuestions: false, shuffleOptions: false }`.
    - Turning it off sets `proctor: undefined` and converts every `multi` question to `single`
      (keeping `correct`, deleting `correctAll`), and `truefalse` to `single`.
  - **Settings fields:** duration 5–180 and max violations 1–10 (clamped like the existing inputs),
    plus `Switch`es for fullscreen and the two shuffles.
  - **Per question, exam mode only:**
    - A type `Select` (single / multi / true-false) and a "Section" `input`.
    - Multi uses checkboxes for the correct options; `correct` is kept as `correctAll[0]`.
    - True/false sets `options: ["True","False"]` and hides the option editors.
  - **With exam mode off,** the tab renders exactly as before.

- [ ] **Step 1: Write the failing tests:**
  - With exam mode off, no "Duration" field is rendered.
  - Toggling it on shows the fields, and `updateSubmission` receives a `proctor` object.
  - Choosing multi and ticking options 1 and 3 stores `correctAll [0,2]` and `correct 0`.
  - Toggling exam mode off converts that question to `type: "single"` with `correct 0`.
- [ ] **Step 2: Run** `npx vitest run src/test/builder-exam-mode.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm run test`. Expected: PASS, including the existing builder tests.
- [ ] **Step 5: Commit and open the PR** `[P-8] feat(builder): exam-mode settings and question types`. Note in the PR that `Builder.tsx` is outside the Phase 2 file list.

---

### Task 12 (P-9): Admin proctored-attempts view

**Files:**
- Modify: `src/routes/admin.tsx` (add a section; existing sections untouched)
- Create: `src/components/proctor/ViolationTimeline.tsx`
- Test: `src/test/violation-timeline.test.tsx`

**Interfaces:**
- **Consumes:** `state.attempts` with `meta`, `state.users`, `findCourse`, `TYPE_LABEL`.
- **Produces:**
  - **The section:** a "Proctored attempts" section listing attempts that have `meta`, newest
    first, using shadcn `Table`.
  - **Columns:** Student, Course, Score, Warnings, Auto-submitted, Date. The Auto-submitted column
    shows "—", "Time ran out" or "Too many violations".
  - **Expanding a row:** each row toggles, with `aria-expanded`, a
    `<ViolationTimeline violations startedAt />` drawn as a vertical list showing "+mm:ss from
    start · label · counted/not counted".

- [ ] **Step 1: Write the failing test.** `ViolationTimeline` with violations at +00:30 and +01:05
  renders them in order with the right offsets; an empty list renders "No violations recorded."
- [ ] **Step 2: Run** `npx vitest run src/test/violation-timeline.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the timeline, then the admin section.
- [ ] **Step 4: Run** `npm run test && npm run build`. Expected: PASS. Then check `/admin` as
  University Admin at 375px (the table scrolls inside `overflow-x-auto`).
- [ ] **Step 5: Commit and open the PR** `[P-9] feat(admin): proctored attempts and violation timeline`. Tell Manthan in the PR description that `admin.tsx` changed.
