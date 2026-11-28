#!/usr/bin/env python3
"""Read-only counts of users, courses, enrollments and certificates.

Prints aggregate numbers only - no names, emails or other personal data.
This is a command-line tool; there is deliberately no HTTP endpoint.

Usage (from backend/):
    python scripts/db_stats.py --db dev_data/seed_dev.db
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from db_common import (  # noqa: E402
    DbUtilError, _ro_connect, require_not_production_url, resolve_path, validate_sqlite_file,
)
from db_healthcheck import default_db  # noqa: E402


def collect(path: Path) -> dict:
    validate_sqlite_file(path)
    conn = _ro_connect(path)
    try:
        def count(sql):
            try:
                return conn.execute(sql).fetchone()[0]
            except sqlite3.OperationalError:
                return None  # table missing
        return {
            "users (total)": count("SELECT count(*) FROM users"),
            "  students": count("SELECT count(*) FROM users WHERE role='student'"),
            "  faculty": count("SELECT count(*) FROM users WHERE role='faculty'"),
            "  admins": count("SELECT count(*) FROM users WHERE role='admin'"),
            "courses (total)": count("SELECT count(*) FROM courses"),
            "  published": count("SELECT count(*) FROM courses WHERE status='PUBLISHED'"),
            "enrollments": count("SELECT count(*) FROM enrollments"),
            "  completed": count("SELECT count(*) FROM enrollments WHERE completed_at IS NOT NULL"),
            "certificates": count("SELECT count(*) FROM certificates"),
        }
    finally:
        conn.close()


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Read-only database statistics.")
    p.add_argument("--db", help="SQLite file (default: DATABASE_URL or backend/learning_hub.db)")
    args = p.parse_args(argv)
    try:
        require_not_production_url()
        path = resolve_path(args.db) if args.db else default_db()
        print(f"Statistics: {path}")
        for label, value in collect(path).items():
            print(f"  {label:<18} {'(table missing)' if value is None else value}")
        return 0
    except DbUtilError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
