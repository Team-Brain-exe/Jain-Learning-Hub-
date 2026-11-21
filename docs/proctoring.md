# Proctored exams

A proctored exam is a quiz with a `proctor` config (time limit, maximum counted warnings, fullscreen requirement). It records signs that the student left the exam. It is a deterrent and an audit trail, not a guarantee. Everything runs in the browser against mock data; see "Why the backend must own the timer and scoring".

## 1. How it works

1. The quiz page shows an entry card. It opens the exam in a **new tab** (`/learn/:slug/exam`).
2. The student sees the rules and a system check. Start stays disabled until they tick the acknowledgement box.
3. Starting creates a session in `localStorage` with a fixed `startedAt` and **deadline**. The timer counts down to that deadline, so a refresh, a closed tab or a sleeping laptop cannot pause it.
4. One question is shown at a time (shuffled within sections). Answers save on every change ("Saved ✓"). Keys 1–4 pick an option, F flags.
5. A review screen lists answered, unanswered and flagged questions, then a confirm dialog submits.
6. The exam is submitted automatically when time runs out or when the number of counted violations reaches the limit.
7. The result page shows the score, an integrity summary (every recorded event, counted or not) and the answer review. Attempt history shows a warning count.

| Area             | File                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Exam route       | `src/routes/learn.$slug.exam.tsx`                                                          |
| Quiz page entry  | `src/routes/learn.$slug.quiz.tsx`, `src/components/proctor/ExamEntryCard.tsx`              |
| State machine    | `src/hooks/use-exam-session.ts`                                                            |
| Detection        | `src/hooks/use-violation-detection.ts`, `src/hooks/use-fullscreen.ts`                      |
| Timer, shortcuts | `src/hooks/use-countdown.ts`, `src/hooks/use-exam-shortcuts.ts`                            |
| System check     | `src/hooks/use-system-check.ts`, `src/components/proctor/SystemCheck.tsx`                  |
| Screens          | `src/components/proctor/*` (intro, question view, review, result, warning, guard, blocker) |
| Data and seam    | `src/data/proctoring.ts`                                                                   |

## 2. What is detected

| Event                           | Counted | Notes                                                                                  |
| ------------------------------- | ------- | -------------------------------------------------------------------------------------- |
| Tab hidden (`visibilitychange`) | yes     | Hidden plus blur together are debounced to one                                         |
| Window blur                     | yes     |                                                                                        |
| Fullscreen exit                 | yes     | Overlay hides the questions until fullscreen returns                                   |
| Copy, cut, paste                | yes     |                                                                                        |
| Right-click                     | yes     |                                                                                        |
| Second tab opened               | no      | Logged. The new tab can take over; the old one is blocked within one heartbeat (5 s)   |
| Fullscreen unavailable          | no      | Logged as `fullscreen_unsupported`; warn-only mode                                     |
| Fullscreen refused by browser   | no      | Same as above (iframe, policy, kiosk). The student is never blocked behind the overlay |

Events are debounced to one per second. The warning dialog says an event was **recorded**.

A single `fullscreen_unsupported` entry, whether the API is missing or the browser refused to
enter fullscreen, switches the rest of that attempt to warn-only. From then on fullscreen is no
longer enforced in any tab: no guard overlay, and fullscreen exits are no longer recorded. Other
events are still recorded and counted. Warn-only is derived from the session's violation log, so a
reload or a second tab keeps it. This is deliberate: a browser or device limitation must never
block a student unfairly.

## 3. What is NOT detected

- Another device or a phone.
- A second monitor.
- Screenshots or photos of the screen.
- People in the room.
- Virtual machines or remote desktop.
- DevTools edits to `localStorage`. In this mock a student can change their own deadline or answers.
- Browser extensions.
- OS-level overlays and notifications.

## 4. Why the backend must own the timer and scoring

The client is fully under the student's control. A real deployment must:

- issue `startedAt` and `deadline` on the server;
- reject answers that arrive after the deadline;
- score on the server (the client never receives the answer key);
- store violations append-only, so the client can add events but never remove or edit them.

## 5. Seam functions and future endpoints

Every function below is exported from `src/data/proctoring.ts`. The comment on each names the endpoint it becomes.

| Function                                | Future endpoint                              |
| --------------------------------------- | -------------------------------------------- |
| `getActiveSession(slug, userId)`        | `GET /api/exams/:slug/session`               |
| `startExam(user, slug, quiz, tabId)`    | `POST /api/exams/:slug/session`              |
| `saveAnswer(key, qid, a)`               | `PUT /api/exams/:slug/session/answers/:qid`  |
| `toggleFlag(key, qid)`                  | `POST /api/exams/:slug/session/flags/:qid`   |
| `setCurrent(key, index)`                | `PATCH /api/exams/:slug/session { current }` |
| `recordViolation(key, v)`               | `POST /api/exams/:slug/session/violations`   |
| `heartbeat(key, tabId)`                 | `POST /api/exams/:slug/session/heartbeat`    |
| `claimTab(key, tabId)`                  | `POST /api/exams/:slug/session/claim`        |
| `releaseTab(key, tabId)`                | `POST /api/exams/:slug/session/release`      |
| `finishExam(user, slug, quiz, reason?)` | `POST /api/exams/:slug/session/finish`       |
| `finalizeExpired(user, slug, quiz)`     | `POST /api/exams/:slug/session/finalize`     |
| `resumeExam(slug, userId, quiz)`        | `GET /api/exams/:slug/session` (resume)      |

## 6. Verification (20-21 Nov 2026, controller browser run, Chromium/Playwright)

| Check                                                                                                        | Result                                                         |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Entry card on quiz page, opens exam in new tab                                                               | ✅                                                             |
| Rules screen, Start disabled until checkbox                                                                  | ✅                                                             |
| Answer by click and keys 1–4, flag with F, autosave "Saved ✓"                                                | ✅                                                             |
| Tab switch → one warning (hidden+blur debounced to 1)                                                        | ✅                                                             |
| Esc does not close the warning; focus on "I understand"                                                      | ✅                                                             |
| Fullscreen exit → navy overlay + counted warning, warning dialog layered above                               | ✅                                                             |
| Refresh mid-exam → same deadline, resumes with fullscreen overlay                                            | ✅                                                             |
| Quiz page shows "Resume exam" while a session is live                                                        | ✅                                                             |
| Second tab → blocker; "Use this tab" takes over, logged as not counted; old tab blocked within one heartbeat | ✅                                                             |
| Timer runs out → auto-submit "Auto-submitted (time ran out)", session cleared                                | ✅                                                             |
| Attempt history shows ⚠ count                                                                                | ✅                                                             |
| Non-proctored Python quiz unchanged                                                                          | ✅                                                             |
| Extra-time 1.5× learner sees 3 min                                                                           | ✅                                                             |
| 375 px: no horizontal scroll; compact top bar; bottom bar with sheet navigator                               | ✅                                                             |
| Fullscreen refused by the browser → (was: stuck behind overlay) → now warn-only                              | ✅ fixed in this task                                          |
| Laptop sleep                                                                                                 | Covered by deadline-based timer + unit test (system-time jump) |
| F11 / Esc out of fullscreen                                                                                  | Same `fullscreenchange` path as above                          |
| No Fullscreen API (iPhone) and storage blocked                                                               | Covered by unit tests (not reproducible in this browser)       |

jsdom tests cover the fallback (`src/test/use-exam-session.test.tsx`), shortcuts being disabled while a dialog is open and focus moving to the fullscreen guard button (`src/test/exam-a11y.test.tsx`).

## 7. Contrast (measured)

| Element                                 | Ratio  | Result |
| --------------------------------------- | ------ | ------ |
| "Saved ✓"                               | 4.99:1 | ✅     |
| Question meta text                      | 6.8:1  | ✅     |
| Timer and warnings chip in warning tint | 3.38:1 | ❌     |

The failing chip uses `text-warning` on `bg-warning/15`, the same token issue already reported in `docs/a11y-ojus.md`. It was reported to the lead; theme tokens were not changed here.
