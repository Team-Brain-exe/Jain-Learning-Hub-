#!/usr/bin/env python3
"""Health check for a LOCAL SQLite database. Read-only.

Checks: (1) file reachable/readable, (2) PRAGMA integrity_check,
(3) PRAGMA foreign_key_check, (4) every table declared by the SQLAlchemy models exists.
Prints PASS/FAIL per check and exits 0 (all pass) or 1 (any fail).

Usage (from backend/):
    python scripts/db_healthcheck.py --db dev_data/seed_dev.db
    python scripts/db_healthcheck.py            # uses DATABASE_URL, else backend/learning_hub.db
"""
from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from db_common import (  # noqa: E402
    BACKEND_DIR, DbUtilError, expected_tables, require_not_production_url,
    resolve_path, sqlite_path_from_url, validate_sqlite_file, _ro_connect,
)


def default_db() -> Path:
    url = os.getenv("DATABASE_URL", "")
    return sqlite_path_from_url(url) or (BACKEND_DIR / "learning_hub.db")


def run_checks(path: Path) -> list[tuple[str, bool, str]]:
    results: list[tuple[str, bool, str]] = []

    try:
        validate_sqlite_file(path)
        results.append(("Database reachable", True, str(path)))
    except DbUtilError as exc:
        results.append(("Database reachable", False, str(exc)))
        return results  # nothing else can run

    conn = _ro_connect(path)
    try:
        try:
            rows = conn.execute("PRAGMA integrity_check").fetchall()
            ok = rows == [("ok",)]
            results.append(("Integrity check", ok, "ok" if ok else "; ".join(str(r[0]) for r in rows[:5])))
        except sqlite3.Error as exc:
            results.append(("Integrity check", False, str(exc)))

        try:
            bad = conn.execute("PRAGMA foreign_key_check").fetchall()
            results.append(("Foreign keys", not bad,
                            "no violations" if not bad else f"{len(bad)} violation(s), first: {bad[0]}"))
        except sqlite3.Error as exc:
            results.append(("Foreign keys", False, str(exc)))

        try:
            present = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            wanted = expected_tables()
            missing = [t for t in wanted if t not in present]
            results.append(("Expected tables", not missing,
                            f"all {len(wanted)} present" if not missing else "missing: " + ", ".join(missing)))
        except sqlite3.Error as exc:
            results.append(("Expected tables", False, str(exc)))
    finally:
        conn.close()
    return results


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Health-check a local SQLite database (read-only).")
    p.add_argument("--db", help="SQLite file to check (default: DATABASE_URL or backend/learning_hub.db)")
    args = p.parse_args(argv)
    try:
        require_not_production_url()
    except DbUtilError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    path = resolve_path(args.db) if args.db else default_db()
    results = run_checks(path)
    print(f"Health check: {path}")
    for name, ok, detail in results:
        print(f"  [{'PASS' if ok else 'FAIL'}] {name:<20} {detail}")
    passed = all(ok for _, ok, _ in results)
    print("RESULT: " + ("PASS" if passed else "FAIL"))
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
