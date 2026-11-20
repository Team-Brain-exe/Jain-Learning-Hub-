# Cross-QA of Mandhan's Components (O-6)

**QA reviewer:** Ojus · **Author:** Mandhan · **Merged in:** PR #17
**Date:** 20 Nov 2026 · **Browser:** Chromium (Playwright) at 375px and 1280px, keyboard only

The components are not wired into a route yet, so each one was rendered on a temporary local page
(not committed) with all states: stepper at step 4, the button in all 4 states, the rejected card with a
~400-character reason and with no reason or date, and the file-type grid.

## Results

| Component | 375px | 1280px | Keyboard | Notes |
|---|---|---|---|---|
| `ConsentStepper` (M-1) | ✅ | ⚠️ | ✅ | Steps 7–10 hidden off to the right at 1280px (#21) |
| `ProceedToUploadButton` (M-2) | ✅ | ✅ | ✅ | Tooltip opens on keyboard focus, ring visible; hint read twice (#22) |
| `RejectedRequestCard` (M-3) | ✅ | ✅ | ✅ | Long reason wraps, no overflow; hydration error (#18), `role="alert"` (#19) |
| `SupportedFileTypes` + `FileTypeIcon` (M-4) | ✅ | ✅ | n/a | 2 / 6 columns as specified; icons `aria-hidden` |
| `validateFile` (M-4) | | | | Unit tests pass; behaviour matches the spec |

Page-level checks: no horizontal page scroll at 375px or 1280px; every button and focusable wrapper
is at least 40px tall; `npm run test` passes (64/64).

## Contrast (computed, target ≥ 4.5:1)

| Text | Size | Ratio | Result |
|---|---|---|---|
| Actor chips: Student, System, AI | 10px | 5.52–6.05 | ✅ |
| Actor chip: **Faculty** (`text-warning` on `bg-warning/15`) | 10px | **3.38** | ❌ |
| Step titles and descriptions | 12px | 6.80 | ✅ |
| Locked-button hint | 12px | 6.37 | ✅ |
| Rejected card: date line / reason | 12 / 14px | 5.81 / 16.72 | ✅ |
| **"Submit revised request"** (`text-destructive` on tinted card) | 14px | **4.08** | ❌ |
| File grid: extensions / "Up to N MB" | 11 / 10px | 6.56 / 6.05 | ✅ |

## Bugs logged

- **#18 [Mandhan-M3] Decision date causes a hydration error.** `fmtDate` in `studio/ui.tsx` formats
  with the runtime locale, so the server writes "Nov 19, 2026" and an en-GB browser writes
  "19 Nov 2026". The root cause is the shared helper (lead-owned file), so it will affect every
  server-rendered date.
- **#19 [Mandhan-M3] Static rejected card uses `role="alert"`.** The shadcn `Alert` always sets
  `role="alert"`, so screen readers interrupt with every rejected card as soon as the page loads.
- **#20 [Mandhan-M1/M3] Two text colours below 4.5:1.** These are the Faculty actor chip and the revise
  button (table above). They come from the same theme-token problem already reported in `a11y-ojus.md`.
- **#21 [Mandhan-M1] Stepper hides steps 7–10 at 1280px.** The horizontal row overflows by ~730px.
  macOS hides scrollbars, so nothing shows that more steps exist. Also, a `currentStep` outside 1–10
  renders no current step, though the header badge clamps it.
- **#22 [Mandhan-M2] Locked hint is announced twice.** On focus, the wrapper's `aria-describedby`
  contains both the visible hint and the Radix tooltip, which hold the same text.


## Not testable yet

- Dark mode: there are still no `.dark` tokens in `src/styles.css` (see `a11y-ojus.md`).
- In-app flow (seeded requests driving the button and card): waits for the lead to wire the
  components into `creator.index.tsx`.
- Lighthouse / axe: not run this time. Contrast was computed from rendered colours instead.
