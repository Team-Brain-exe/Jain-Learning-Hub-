# Database Utilities (development only)

Safe, repeatable scripts to seed, back up, restore, check and inspect a **local SQLite** database.
They do not change the schema, API, auth or frontend, and they are not meant for production.

All commands are run from the `backend/` folder. Scripts live in `backend/scripts/`.

## 1. Setup

```bash
cd backend
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

The scripts use only the standard library plus the existing SQLAlchemy models and `pwdlib`.
By default they work on **`backend/dev_data/`** (git-ignored), never on the app's own `learning_hub.db`.

## 2. Seed fictional data — `db_seed.py`

```bash
python scripts/db_seed.py                         # -> dev_data/seed_dev.db
python scripts/db_seed.py --db dev_data/my.db     # custom file
python scripts/db_seed.py --reset                 # remove seed_* rows, then reseed
python scripts/db_seed.py --login-password 'LongDevPassword1'   # optional, min 12 chars
```

Creates 4 faculty (+ `verified_faculty` rows), 12 students, 1 admin, 6 courses (published / in review / draft)
with modules, lessons, quizzes, enrollments, lesson progress, quiz attempts and sample certificates.

Safety:
- Every seeded id starts with `seed_`; every email ends in `@seed.example.test` (reserved, undeliverable domain).
- Re-running is **idempotent**: existing seed rows are skipped, never updated.
- Real rows are never modified. `--reset` deletes only rows whose id starts with `seed_`.
- Refuses the app's own `learning_hub.db` (or the file in `DATABASE_URL`) unless `--allow-app-db`.
- No hardcoded passwords: accounts get a random password (login disabled) unless you pass `--login-password`
  or set `SEED_LOGIN_PASSWORD`.

## 3. Backup — `db_backup.py`

```bash
python scripts/db_backup.py --source dev_data/seed_dev.db
python scripts/db_backup.py --source dev_data/seed_dev.db --dest dev_data/backups/before-test.sqlite
```

- Uses SQLite's online backup API (consistent even while the app is running); source opened read-only.
- Without `--dest`: `dev_data/backups/<name>-<timestamp>.sqlite`.
- Validates the source; **refuses to overwrite** an existing backup unless `--force`.
- Written to a temp file and moved into place only after an integrity check passes.

## 4. Restore — `db_restore.py`

```bash
python scripts/db_restore.py --backup dev_data/backups/before-test.sqlite --dest dev_data/restored.db
python scripts/db_restore.py --backup ... --dest dev_data/restored.db --force   # replace existing file
```

- Restores into a **new** file by default; replacing an existing file needs `--force`.
- Backup must be a readable SQLite file that passes `PRAGMA integrity_check`.
- The app's own `learning_hub.db` is refused (override needs `--allow-app-db` **and** `--force` — don't).
- Never point it at production data.

## 5. Health check — `db_healthcheck.py`

```bash
python scripts/db_healthcheck.py --db dev_data/restored.db
```

Checks: file reachable → `PRAGMA integrity_check` → `PRAGMA foreign_key_check` → all tables declared by the
SQLAlchemy models exist. Prints `[PASS]/[FAIL]` per check; exit code `0` = all pass, `1` = any failure.

```
  [PASS] Database reachable   .../dev_data/restored.db
  [PASS] Integrity check      ok
  [PASS] Foreign keys         no violations
  [PASS] Expected tables      all 15 present
RESULT: PASS
```

## 6. Statistics (optional) — `db_stats.py`

```bash
python scripts/db_stats.py --db dev_data/seed_dev.db
```

Read-only counts of users (by role), courses, enrollments and certificates. Aggregates only — no names or
emails. Command-line only; there is intentionally no HTTP endpoint.

## 7. Existing schema (reference — not redesigned)

The project has no migrations; tables come from SQLAlchemy models via `Base.metadata.create_all`.

| Table | Purpose | Key relationships |
|---|---|---|
| `users` | accounts (`role`: student / faculty / admin) | referenced *by id string* from other tables |
| `verified_faculty` | faculty directory used to validate permissions | matches faculty `users.id` by convention |
| `upload_permissions` | student asks faculty for permission to upload | `student_id`, `faculty_id` (strings) |
| `courses` | course + lifecycle `status` | FK `permission_id → upload_permissions.id`; `creator_id` (string) |
| `modules` | course sections | FK `course_id → courses.id` |
| `lessons` | lessons in a module | FK `module_id → modules.id`; optional FK `media_asset_id → media_assets.id` |
| `media_assets` | uploaded files metadata | FK `course_id`, `permission_id` |
| `enrollments` | student ↔ course | FK `course_id`; **unique** (`student_id`, `course_id`) |
| `lesson_progress` | per-student lesson completion | FK `lesson_id`; **unique** (`student_id`, `lesson_id`) |
| `quizzes` / `quiz_questions` / `quiz_attempts` | course quiz, questions, student attempts | FK chain `quizzes → courses`, `quiz_questions → quizzes`, `quiz_attempts → quizzes` |
| `certificates` | issued certificates | FK `course_id`; unique `certificate_code` |
| `ai_review_jobs` / `ai_findings` | AI review of course content | `ai_review_jobs → courses`; `ai_findings → ai_review_jobs`, `media_assets` |

Note: `student_id`, `creator_id`, `faculty_id`, `recipient_id` etc. are plain strings, **not** foreign keys to
`users` (existing design — flagged, not changed).

## 8. Tests

```bash
cd backend
JWT_SECRET_KEY=$(python -c "print('x'*40)") python -m pytest tests/test_db_utilities.py -v
```

(`JWT_SECRET_KEY` is needed only because the shared `conftest.py` imports the app. Windows PowerShell:
`$env:JWT_SECRET_KEY = 'x' * 40`.)

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `ERROR: Destination already exists` | Choose another name, or add `--force` (backup/restore of disposable files only). |
| `is the application's own database. Refusing` | Intended. Use a file in `dev_data/`. |
| `Not a SQLite database (bad header)` | The file is not SQLite (wrong path, corrupt, or an HTML/zip file). |
| `ModuleNotFoundError: app` / `pwdlib` | Run from `backend/` with the venv active and `pip install -r requirements.txt`. |
| Health check says tables missing | Seed the file (`db_seed.py`) or start the app once so it runs `create_all`. |
| `DATABASE_URL points at a non-SQLite database` | Utilities are SQLite-only; unset it or use a local `sqlite:///` URL. |
| `database is locked` | Close other programs using the file and retry. |
