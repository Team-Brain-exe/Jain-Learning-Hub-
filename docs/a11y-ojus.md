# Accessibility pass: consent form, `/creator`, `/login`, `/faculty` (Ojus, ticket O-5)

Checked on 19 Nov 2026 against the local dev server (Chromium 1248, light theme).
Tools: Lighthouse 12 (Accessibility category), axe-core 4.10 (WCAG 2 A/AA + best practices),
a scripted keyboard walk (Tab × 25 per page), and computed-colour contrast measurements.

## Lighthouse accessibility scores

| Page | Signed in as | Score | Failing audits |
|---|---|---|---|
| Consent form (`ConsentForm`, after a submit attempt) | Ananya Rao (creator) | **100** | none |
| `/creator` | Ananya Rao (creator) | **100** | none |
| `/login` | signed out | **100** | none |
| `/faculty` | Dr. Meera Iyer (reviewer) | **100** | none |
| Upload-request list (`PermissionRow` + `UploadPermissionBadge`, all 3 statuses) | creator | **96** | `color-contrast` (badges, see below) |

The consent form isn't mounted on a route yet (the lead does that), so it was audited by
mounting it on a temporary local page. That page was not committed.

## Checklist

| Check | Result | Notes |
|---|---|---|
| Every input has a visible label | ✅ | Consent form uses `Field` (wrapping `<label>`) for every input. The checkbox has its own `<label htmlFor>`. `/login` inputs are wrapped in labels. |
| Errors connected to inputs | ✅ (fixed in O-2) | Invalid inputs get `aria-invalid="true"` and `aria-describedby` pointing at the `FieldError` id. `FieldError` has `role="alert"`, so it is announced when it appears. Covered by `src/test/consent-form.test.tsx` (`toHaveAccessibleDescription`). |
| Errors not shown mid-typing | ✅ | `react-hook-form` `mode: "onTouched"`: errors appear after blur or a submit attempt. On submit, focus moves to the first invalid field. |
| Tab order follows visual order | ✅ | Header → page actions → list rows → footer on all four pages. Consent form: title → category → format → description → email → proposal → declaration → submit. |
| Focus ring always visible | ✅ | No `outline: none` on interactive elements in these areas. The header search input has `outline-none` but its wrapper shows a `focus-within` ring. |
| Icon-only buttons have `aria-label` | ✅ | Header: "Open menu", "Search", "Notifications…", "Account", "Help". The new components only use icons next to text, with `aria-hidden="true"`. |
| Status not conveyed by colour alone | ✅ | `UploadPermissionBadge` always shows the label text and an icon. |
| Loading state announced | ✅ | `PermissionListSkeleton` is `aria-busy="true"` with an sr-only "Loading your requests…" (`role="status"`); the placeholder rows are `aria-hidden`. |

## Contrast (measured, target ≥ 4.5:1 for normal text)

| Pair | Ratio | Result |
|---|---|---|
| `text-muted-foreground` on `bg-card` | **6.80:1** | ✅ pass |
| `text-warning` on `bg-warning/15` (Pending badge) | **3.38:1** | ❌ fail |
| `text-success` on `bg-success/15` (Approved badge) | **4.07:1** | ❌ fail |
| `text-destructive` on `bg-destructive/10` (Rejected badge) | **3.97–4.02:1** | ❌ fail |
| `text-destructive` error text on `bg-card` | passes axe | ✅ |

## Reported to the lead (not changed by me: theme tokens are off-limits)

1. **Status badge colours fail WCAG AA.** All three tint combinations above are below 4.5:1 at
   12px. This affects the new `UploadPermissionBadge` and the existing `StatusBadge` in
   `src/components/studio/ui.tsx`, which uses the same classes. Possible fixes for the lead:
   darken `--warning`, `--success` and `--destructive`
   in `src/styles.css`, or use a darker text shade on the tinted badge backgrounds.
2. **There is no dark theme.** `src/styles.css` declares the `dark` variant but has no `.dark { … }`
   token block, so adding `class="dark"` changes nothing. The stretch "dark-mode check" can't be
   done until dark tokens exist.
3. **Shared `input` class is 37–38px tall** (`src/components/studio/ui.tsx`), just under the
   ~40px tap target, which shows up in the builder at 375px. It's a one-word change (`py-2` →
   `py-2.5`), but `ui.tsx` is shared, so it's left for the lead.

## Fixed

- Consent form a11y wiring (labels, `aria-invalid`, `aria-describedby`, `role="alert"`): ticket O-2.
- Tap targets under 40px on `/faculty` filter chips, back links, `/login` "Continue as guest" and
  the header account button, plus a 3px horizontal page scroll at 768px from the footer email:
  ticket O-4.
