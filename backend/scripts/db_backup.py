#!/usr/bin/env python3
"""Create a consistent backup of a LOCAL SQLite database.

Uses SQLite's online backup API, so the copy is consistent even if the app is
running. Never overwrites an existing backup unless --force is given. The
source database is opened read-only and is never modified.

Usage (from backend/):
    python scripts/db_backup.py --source dev_data/seed_dev.db
    python scripts/db_backup.py --source dev_data/seed_dev.db --dest dev_data/backups/before-test.sqlite
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from db_common import (  # noqa: E402
    DEFAULT_BACKUP_DIR, DEFAULT_SEED_DB, DbUtilError, require_not_production_url,
    resolve_path, safe_copy_via_backup_api, validate_sqlite_file,
)


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Back up a local SQLite database.")
    p.add_argument("--source", "-s", default=str(DEFAULT_SEED_DB), help="SQLite database to back up")
    p.add_argument("--dest", "-d", help="backup file to create (default: dev_data/backups/<name>-<timestamp>.sqlite)")
    p.add_argument("--force", action="store_true", help="overwrite the destination if it exists")
    args = p.parse_args(argv)
    try:
        require_not_production_url()
        src = resolve_path(args.source)
        validate_sqlite_file(src)
        if args.dest:
            dst = resolve_path(args.dest)
        else:
            DEFAULT_BACKUP_DIR.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            dst = DEFAULT_BACKUP_DIR / f"{src.stem}-{stamp}.sqlite"
        dst.parent.mkdir(parents=True, exist_ok=True)
        safe_copy_via_backup_api(src, dst, force=args.force)
        print(f"Backup OK\n  source : {src}\n  backup : {dst}\n  size   : {dst.stat().st_size} bytes")
        return 0
    except DbUtilError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
