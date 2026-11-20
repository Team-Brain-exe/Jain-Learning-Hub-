# Frontend features added (no backend)

Everything below is frontend-only. Shared records live in browser `localStorage` through
`src/data/platform.ts`; each exported action there maps 1:1 to a future API endpoint, so the UI
does not need to change when a backend arrives. Permission checks are UI-level only.

| Area | Routes | Main files |
|---|---|---|
| Demo auth + roles (learner / creator / reviewer / admin) | `/login`, `/profile` | `hooks/use-auth.ts`, `routes/login.tsx` |
| Creator Studio (drafts, builder, autosave, preview, submit) | `/creator`, `/creator/$id` | `components/studio/Builder.tsx` |
| Rule-based AI pre-check (advisory report, reviewer override with reason) | inside builder + review | `lib/ai-check.ts`, `components/studio/AiReportView.tsx` |
| Faculty review queue + decisions | `/faculty`, `/faculty/review/$id` | |
| Admin: assign reviewers, publish/unpublish, users & roles, policy, audit log, certificate approval | `/admin` | |
| Published creator courses appear in catalogue / detail / lesson player | `/courses`, `/courses/$slug`, `/learn/...` | `findCourse`, `useAllCourses` |
| Real lesson media (mp4/webm, YouTube, Vimeo, captions) with error state; real resource links; real transcripts | lesson page | `components/courses/LessonVideo.tsx` |
| Quizzes: builder, attempts, pass mark, results, history | `/learn/$slug/quiz` | `data/quizzes.ts` |
| Certificates: eligibility, request, admin authorisation, printable page with QR, public verify | `/certificates`, `/verify` | |
| Notifications (bell) | header | |

## Demo walkthrough
1. Sign in as **Ananya Rao (creator)** → `/creator` → New course (or open the seeded "Linux Command Line Essentials").
2. Sign in as **University Admin** → Submissions → assign **Dr. Meera Iyer**.
3. Sign in as **Dr. Meera Iyer** → `/faculty` → Approve.
4. Admin → Publish. The course is now in `/courses`.
5. Learner → enroll, complete lessons, take the assessment, request certificate; Admin authorises; open and verify.

## Swapping in a real backend
Replace the bodies of the actions in `src/data/platform.ts` (and `signInDemo`/`signOut` in `use-auth.ts`)
with API calls, keep the hook/selector signatures, and delete `createStore` usage.

## Consent workflow (frontend)

Components and utilities developed for the peer-to-peer consent and upload authorization workflow (Tickets M-1 through M-4):

| Component / Utility     | File                                               | Purpose                                                                                                                  |
| ----------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `consentSteps`          | `src/data/consent-steps.ts`                        | Complete 10-step institutional consent and review workflow data with actor mappings.                                     |
| `ConsentStepper`        | `src/components/consent/ConsentStepper.tsx`        | Responsive 10-step stepper showing completed, current, and upcoming states with actor badges and screen reader support.  |
| `ProceedToUploadButton` | `src/components/consent/ProceedToUploadButton.tsx` | Guarded upload action button enforcing faculty approval with accessible tooltips, icons, and mobile hints.               |
| `RejectedRequestCard`   | `src/components/consent/RejectedRequestCard.tsx`   | Alert card displaying faculty rejection remarks, decision date, and one-click request revision flow.                     |
| `fileTypes`             | `src/data/file-types.ts`                           | Content format specifications, allowed extensions, and maximum upload size limits (video, audio, ppt, pdf, docx, image). |
| `FileTypeIcon`          | `src/components/consent/FileTypeIcon.tsx`          | Accessible Lucide icon mapper for all supported content formats.                                                         |
| `SupportedFileTypes`    | `src/components/consent/SupportedFileTypes.tsx`    | Responsive visual grid showcasing accepted formats, extensions, and size limits.                                         |
| `validateFile`          | `src/lib/validate-file.ts`                         | Case-insensitive file extension and size validation utility returning user-friendly error messages.                      |
