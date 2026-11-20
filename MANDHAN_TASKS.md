# Mandhan · Frontend Tasks

**Your focus:** the workflow screens: the 10-step stepper, the rejected-request card, the locked/unlocked "Proceed to Upload" button, and the supported-file-types helper.
**Reviewer:** (frontend lead) · **Estimated total:** 6 to 8 hours spread over about a week

Read the **Shared setup and rules** section at the bottom of this file first. It has the data file you will use, the git workflow, the PR checklist and the "don't touch" list.

## Project quick-start

```bash
npm.cmd install          # or: bun install
npm.cmd run dev
npm.cmd run test
```

Demo accounts (on `/login`): Ananya Rao is the **creator** (the student), Dr. Meera Iyer is the **reviewer** (faculty). The mock data in `src/data/upload-permissions.ts` ships with **three seeded requests**, one Pending, one Approved and one Rejected, so you can build each state without waiting for anything.

**Stack you'll use:** React 19, TypeScript, Tailwind v4, `lucide-react`, and the shadcn components already in `src/components/ui/` (`tooltip`, `alert`, `progress`).

---

## Ticket M-1 · Workflow stepper (start here)

**Goal:** show the 10 steps from the "Complete Consent Workflow" diagram and highlight where the student currently is.

**Create:**

- `src/data/consent-steps.ts` (the data)
- `src/components/consent/ConsentStepper.tsx` (the component)

**Step data** (type it properly):

```ts
export type Actor = "Peer (Student)" | "System" | "Faculty" | "AI System";
export interface ConsentStep {
  n: number;
  title: string;
  description: string;
  actor: Actor;
}
export const consentSteps: ConsentStep[] = [/* 10 items, text copied from the diagram */];
```

Steps, in order: 1 Peer Logs In · 2 Fills Consent Form · 3 Submits Request · 4 Faculty Receives Email · 5 Faculty Reviews Request · 6 Status Updates on Website · 7 Approved Peer Uploads Content · 8 AI Checks Content · 9 Final Faculty Review · 10 Content is Published. Use the one-line descriptions from the diagram.

**Component**

- Props: `{ currentStep: number }` (1 to 10).
- Each step is one of three visual states: **done** (green check), **current** (filled primary circle, `aria-current="step"`), **upcoming** (muted).
- Show an actor chip under each title: Student, System, Faculty, AI. Use different but calm tints: `bg-secondary`, `bg-muted`, `bg-warning/15`, `bg-accent`.
- Layout: **vertical list on mobile**, **horizontal on `lg:` and up** (`flex-col lg:flex-row`). On `lg` the row may scroll with `overflow-x-auto`.
- Use an `<ol>` so a screen reader announces "step 4 of 10".
- Do not hard-code the status colours of steps. Use tokens (`text-success`, `bg-primary`, `text-muted-foreground`).

**Done when**

- [x] `currentStep` 1, 4, 7, 10 all look right (screenshot each).
- [x] A test in `src/test/consent-stepper.test.tsx` checks that exactly one item has `aria-current="step"` and that `consentSteps` has 10 entries with unique `n`.

---

## Ticket M-2 · "Proceed to Upload" button states

**Goal:** the upload button is locked until a faculty member approves.

**Create:** `src/components/consent/ProceedToUploadButton.tsx`

**Look at first:** `btn` and `btnOutline` in `src/components/studio/ui.tsx`, and `src/components/ui/tooltip.tsx`.

**Props:** `{ status?: PermissionStatus; onProceed: () => void }` where `status` is `undefined` when the student has not requested anything.

| Status      | Button                         | Tooltip / hint                                         |
| ----------- | ------------------------------ | ------------------------------------------------------ |
| `undefined` | Disabled, "Proceed to Upload"  | "Request permission from a faculty member first."      |
| `pending`   | Disabled                       | "Waiting for faculty approval."                        |
| `rejected`  | Disabled                       | "Your request was rejected. Submit a revised request." |
| `approved`  | **Enabled**, calls `onProceed` | none                                                   |

**Watch out (common bug):** a `disabled` HTML button doesn't fire hover/focus events, so a tooltip on it never appears. Wrap the button in a `<span tabIndex={0}>` and put the `TooltipTrigger asChild` on the span. Also add `aria-disabled` and show the hint as visible text under the button on mobile, where there is no hover.

Add a `Lock` icon (lucide) on locked states and an `Upload` icon when enabled.

**Done when**

- [x] All 4 states are verified using the 3 seeded requests plus "no request".
- [x] The tooltip shows on hover **and** on keyboard focus for locked states.
- [x] A test (`src/test/proceed-button.test.tsx`) checks that `onProceed` is called only when approved.

---

## Ticket M-3 · Rejected request card

**Goal:** when faculty rejects, the student sees why and can try again.

**Create:** `src/components/consent/RejectedRequestCard.tsx`

**Props:** `{ permission: UploadPermission; onReviseRequest: (p: UploadPermission) => void }`

**Requirements**

- Use the `Alert` component from `@/components/ui/alert` (or the `card` class) with a destructive tone: `border-destructive/30 bg-destructive/5`.
- Show: the title of the request, the label "Rejected" (reuse Ojus's `UploadPermissionBadge`), the decision date (`fmtDate` from `ui.tsx`), and the **faculty's reason** in a quoted block.
- If `facultyRemarks` is empty, show "The faculty member did not leave a reason."
- Button **"Submit revised request"** (`btnOutline`). It calls `onReviseRequest(permission)`. The lead will pre-fill the form from it.
- Below the reason, a one-line helper: "The upload button stays locked until a new request is approved."

**Done when**

- [x] Looks right with a very long reason (about 400 characters), with no overflow at 375px.
- [x] Screenshot with a reason and without one.

---

## Ticket M-4 · Supported file types and upload-area helper

**Goal:** make clear which files can be uploaded, with icons and size hints. **No real upload happens**; this is purely front-end checking.

**Create:**

- `src/data/file-types.ts`
- `src/components/consent/FileTypeIcon.tsx`
- `src/components/consent/SupportedFileTypes.tsx`
- `src/lib/validate-file.ts` plus `src/test/validate-file.test.ts`

**`file-types.ts`**

```ts
import type { ContentFormat } from "@/data/upload-permissions";

// TODO: confirm with backend
export const fileTypes: Record<
  ContentFormat,
  { label: string; extensions: string[]; maxMB: number }
> = {
  video: { label: "Video", extensions: ["mp4", "webm"], maxMB: 500 },
  audio: { label: "Audio", extensions: ["mp3", "wav", "m4a"], maxMB: 100 },
  ppt: { label: "Presentation", extensions: ["ppt", "pptx"], maxMB: 50 },
  pdf: { label: "PDF", extensions: ["pdf"], maxMB: 25 },
  docx: { label: "Document", extensions: ["doc", "docx"], maxMB: 25 },
  image: { label: "Image", extensions: ["png", "jpg", "jpeg", "webp"], maxMB: 10 },
};
```

> The size limits are **placeholders**. Put a comment `// TODO: confirm with backend` above them. Don't present them as final.

**`FileTypeIcon`**: maps each format to a lucide icon (`FileVideo`, `FileAudio`, `Presentation`, `FileText`, `FileType`, `Image`), with `aria-hidden` and an optional `className`.

**`SupportedFileTypes`**: a responsive grid (2 columns on mobile, 3 on `sm`, 6 on `lg`) of small tiles: icon, label, extensions and "up to N MB".

**`validate-file.ts`**: `validateFile(file: { name: string; size: number }, format: ContentFormat): string | null`. It returns an error string or `null`:

- wrong extension → "That file type isn't allowed for Video. Use: mp4, webm."
- too big → "File is too large (max 500 MB)."
- Extension check is **case-insensitive** (`LESSON.MP4` is valid).

**Tests (at least 6):** valid file; wrong extension; uppercase extension; exactly at the limit (valid); 1 byte over the limit; a file with no extension.

**Done when**

- [x] Tests pass.
- [x] `SupportedFileTypes` is readable at 375px and 1280px.
- [x] Screenshot of the grid.

---

## Ticket M-5 · Accessibility pass (shared with Ojus; you do the workflow components)

**Checklist for your areas** (stepper, locked button, rejected card, file-type grid)

- [x] The stepper is an `<ol>`, with `aria-current="step"` on the current item.
- [x] The locked button is focusable (via the wrapper) and its reason is available to screen readers (`aria-describedby` on a hint element).
- [x] Status is never conveyed by colour alone (icon plus text).
- [x] Rejected card: the reason is real text, not an image, and has sufficient contrast.
- [x] Tab through each component using only the keyboard, and screenshot the visible focus ring.
- [x] Run Lighthouse → Accessibility and attach the score.

**Done when**

- [x] A short `docs/a11y-mandhan.md` lists what you checked, fixed and reported.

---

## Ticket M-6 · Cross-QA of Ojus's work + README and screenshots

1. Test Ojus's PRs (badge, form validation, skeleton, empty state, responsive fixes) at 375px and 1280px with the keyboard only. Log bugs as GitHub issues using the bug format below (title prefix `[Ojus-O#]`).
2. Once everything is merged, take clean screenshots for the project report: the stepper at 3 different steps, the rejected card, the locked and unlocked button, and the file-type grid. Save them in `docs/screenshots/` with names like `01-stepper-step4.png`.
3. Add a "Consent workflow (frontend)" section to `docs/FRONTEND_FEATURES.md` listing the new components in a table (component, file, purpose). Don't rewrite the existing content; append only.

---

## Bug report format (for QA)

```
Title: [Ojus-O#] Error text not linked to input
Steps: 1) Login as creator 2) ...
Expected / Actual:
Screenshot:
```

## Definition of done (every ticket)

Lint, tests and build pass, a PR with screenshots, and the lead has approved it. No edits to the files on the "don't touch" list.
