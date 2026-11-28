#!/usr/bin/env python3
"""Restore a SQLite backup into a NEW or DISPOSABLE local database file.

* The backup must be a readable SQLite file that passes PRAGMA integrity_check.
* By default the destination must not exist.
* Replacing an existing file needs --force.
* The application's own learning_hub.db (or the file named by DATABASE_URL)
  is refused unless you ALSO pass --allow-app-db. Never use this on production.
* The backup file itself is only read, never changed.

Usage (from backend/):
    python scripts/db_restore.py --backup dev_data/backups/seed_dev-20261128-101500.sqlite \\
                                 --dest dev_data/restored.db
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from db_common import (  # noqa: E402
    DbUtilError, is_protected, require_not_production_url, resolve_path,
    safe_copy_via_backup_api, validate_sqlite_file,
)


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Restore a SQLite backup into a new/disposable file.")
    p.add_argument("--backup", "-b", required=True, help="backup file to restore from")
    p.add_argument("--dest", "-d", required=True, help="database file to create")
    p.add_argument("--force", action="store_true", help="replace the destination if it already exists")
    p.add_argument("--allow-app-db", action="store_true",
                   help="permit restoring over the app's own learning_hub.db (needs --force too)")
    args = p.parse_args(argv)
    try:
        require_not_production_url()
        backup = resolve_path(args.backup)
        dest = resolve_path(args.dest)
        validate_sqlite_file(backup, deep=True)
        if is_protected(dest) and not (args.allow_app_db and args.force):
            raise DbUtilError(f"{dest} is the application's own database. Refusing to restore over it.\n"
                              "Restore into a new file instead (recommended).")
        dest.parent.mkdir(parents=True, exist_ok=True)
        safe_copy_via_backup_api(backup, dest, force=args.force)
        print(f"Restore OK\n  backup   : {backup}\n  restored : {dest}")
        print("Tip: run  python scripts/db_healthcheck.py --db", dest)
        return 0
    except DbUtilError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
