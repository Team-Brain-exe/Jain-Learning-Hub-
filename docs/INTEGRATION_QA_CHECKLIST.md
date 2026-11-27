# Integration QA Checklist

Merge coordinator: Arya Krishna | Updated: 27 Nov 2026
Repo: Team-Brain-exe/Jain-Learning-Hub-

All results below are from actual runs on the date above, not historical counts.

## Baseline: main at 5f8c2f7 (PR #36)

| Check | Result |
|---|---|
| Frontend `npx vitest run` | 313 passed, 40 files, 0 failed |
| `npm run build` | Passed |
| Backend `python -m pytest -q` | 101 passed, 0 failed |

Note: `npm ci` reports 9 dependency vulnerabilities (7 moderate, 2 high). Not fixed here; `npm audit fix --force` can break the build. For the project lead to decide.

## Pull requests

| PR | Owner | Status | Evidence |
|---|---|---|---|
| #36 My Learning redesign | Manthan | Merged (before this review) | Included in baseline above |
| #40 Backend authentication and student consent | Danwin | **Merged** (commit 115a10f) | Tested at a45dcd7 before merge: trial merge clean; frontend 313 passed; build passed; backend 118 passed (101 + 17 new in `test_auth.py`); secrets scan clean; consent form and permission status page checked in the browser |
| #34 Safe database utility scripts and tests | Arya | **Open**, awaiting project lead review | See "Database utilities" below |
| Haripriya | Haripriya | No open PR; her branches are not in the unmerged list, so the work is in main | `git branch -r --no-merged upstream/main` |
| Prit | Prit | No open PR; same as above | Same |

## Database utilities (PR #34)

Run on throwaway files in `/tmp`, from branch tip 127d691:

- Seed: 17 users, 6 courses, 32 enrollments, 8 certificates created; second run created 0 (idempotent).
- Backup: OK; second backup to the same file refused ("Destination already exists").
- Restore into a new file: OK.
- Health check: PASS (reachable, integrity ok, no foreign key violations, all 15 tables present).
- Stats: counts only, no personal data.
- Tests: 23 passed (`tests/test_db_utilities.py`).
- No `.db`, `.sqlite` or backup files and no secrets in the PR file list; working tree clean after the run.
- Scope: 10 new or ignore files; no existing app code, schema or API changed.

## Open items and blockers

1. **Manthan's weekly goal fix is not in main.** Commit 96cc638 ("fix(learning): track weekly lesson goal progress") was merged by PR #39 into `feature/manthan-my-learning-redesign` after PR #36 went to main. It changes 5 files (+389 / -59), including `src/routes/my-learning.tsx`, `src/hooks/use-enrollment.ts` and a new `src/test/weekly-goal.test.ts`. A trial merge into main is clean. Needs a PR to main and frontend review. Owner: Manthan / project lead.
2. **Danwin's #40, follow-up questions (non-blocking):** the title mentions backend auth but the diff only adds `test_auth.py`; `StudentPermissionStatus.tsx` was largely rewritten.
3. **Process:** main has no required-review rule (PR #40 showed "review is not required to merge"). Frontend PRs can merge without frontend review. For the project lead to decide.
4. **Stale branches, no action expected:** `Prit-ai`, `feat/ojus-o2`, `feat/ojus-o3`, `feat/ojus-o5`, `feat/ojus-permission-row`, `ojus-pr-screenshots`.

## Still to do

| Item | Status |
|---|---|
| Re-run frontend, build and backend tests on main after #40 (115a10f) | Pending |
| Merge #34 after project lead review | Pending |
| Persistence test: records survive a backend restart | Not started |
| UI consistency pass over the merged app | Partly done (consent pages only) |
| CORS, secrets and deployment database, with backend owners | Not started. Snapshot still uses SQLite; confirm the intended deployment database with the team before any change |
