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
