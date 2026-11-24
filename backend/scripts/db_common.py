"""Shared helpers for the development-only database utilities.

These helpers only use the standard library (``sqlite3``) plus, in a couple of
places, the existing SQLAlchemy models. They never modify the application
schema.
"""
from __future__ import annotations

import os
import sqlite3
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:  # allow `python scripts/xxx.py` from backend/
    sys.path.insert(0, str(BACKEND_DIR))

SQLITE_HEADER = b"SQLite format 3\x00"

# Default location for disposable files created by these utilities.
DEV_DATA_DIR = BACKEND_DIR / "dev_data"
DEFAULT_SEED_DB = DEV_DATA_DIR / "seed_dev.db"
DEFAULT_BACKUP_DIR = DEV_DATA_DIR / "backups"


class DbUtilError(Exception):
    """A friendly, expected error (bad path, refused overwrite, ...)."""


def resolve_path(value: str | os.PathLike) -> Path:
    return Path(value).expanduser().resolve()


def sqlite_path_from_url(url: str) -> Path | None:
    """Return the file path for a ``sqlite:///...`` URL, else None."""
    prefix = "sqlite:///"
    if not url.startswith(prefix):
        return None
    raw = url[len(prefix):]
    if raw in ("", ":memory:"):
        return None
    return resolve_path(raw)


def protected_paths() -> set[Path]:
    """Database files the running application may be using.

    The app hardcodes ``./learning_hub.db`` (relative to its working
    directory); ``DATABASE_URL`` is honoured too if someone sets it. These are
    treated as "real" data: utilities refuse to write to them unless the
    caller passes an explicit ``--allow-app-db`` flag.
    """
    paths = {BACKEND_DIR / "learning_hub.db", Path.cwd() / "learning_hub.db"}
    env_url = os.getenv("DATABASE_URL", "")
    env_path = sqlite_path_from_url(env_url) if env_url else None
    if env_path:
        paths.add(env_path)
    return {p.resolve() for p in paths}


def is_protected(path: Path) -> bool:
    return path.resolve() in protected_paths()


def require_not_production_url() -> None:
    """Refuse to run if DATABASE_URL points at a non-SQLite server."""
    url = os.getenv("DATABASE_URL", "")
    if url and not url.startswith("sqlite"):
        raise DbUtilError(
            "DATABASE_URL points at a non-SQLite database. These utilities are "
            "SQLite-only and development-only; refusing to run."
        )


def _ro_connect(path: Path) -> sqlite3.Connection:
    return sqlite3.connect(f"{path.as_uri()}?mode=ro", uri=True)


def validate_sqlite_file(path: Path, deep: bool = False) -> None:
    """Raise DbUtilError unless *path* is a readable SQLite database.

    ``deep=True`` also runs ``PRAGMA integrity_check``.
    """
    if not path.exists():
        raise DbUtilError(f"File not found: {path}")
    if not path.is_file():
        raise DbUtilError(f"Not a regular file: {path}")
    try:
        with open(path, "rb") as fh:
            header = fh.read(16)
    except OSError as exc:
        raise DbUtilError(f"Cannot read {path}: {exc}") from exc
    if header != SQLITE_HEADER:
        raise DbUtilError(f"Not a SQLite database (bad header): {path}")
    try:
        conn = _ro_connect(path)
        try:
            conn.execute("SELECT count(*) FROM sqlite_master").fetchone()
            if deep:
                rows = conn.execute("PRAGMA integrity_check").fetchall()
                if rows != [("ok",)]:
                    detail = "; ".join(str(r[0]) for r in rows[:5])
                    raise DbUtilError(f"Integrity check failed for {path}: {detail}")
        finally:
            conn.close()
    except sqlite3.Error as exc:
        raise DbUtilError(f"{path} is not a readable SQLite database: {exc}") from exc


def safe_copy_via_backup_api(src: Path, dst: Path, force: bool) -> None:
    """Copy *src* to *dst* with SQLite's online backup API.

    The copy is written to a temp file next to *dst* and moved into place only
    once complete, so a failure never leaves a half-written or clobbered file.
    """
    if src.resolve() == dst.resolve():
        raise DbUtilError("Source and destination are the same file.")
    if not dst.parent.exists():
        raise DbUtilError(f"Destination folder does not exist: {dst.parent}")
    if dst.is_dir():
        raise DbUtilError(f"Destination is a directory, expected a file: {dst}")
    if dst.exists() and not force:
        raise DbUtilError(f"Destination already exists: {dst}\nUse --force to overwrite it.")

    tmp = dst.with_name(dst.name + ".partial")
    if tmp.exists():
        tmp.unlink()
    src_conn = _ro_connect(src)
    try:
        dst_conn = sqlite3.connect(tmp)
        try:
            src_conn.backup(dst_conn)
        finally:
            dst_conn.close()
    except Exception:
        if tmp.exists():
            tmp.unlink()
        raise
    finally:
        src_conn.close()

    try:
        validate_sqlite_file(tmp, deep=True)
    except DbUtilError:
        tmp.unlink(missing_ok=True)
        raise
    # Stale WAL/SHM sidecars from an overwritten database must not be replayed
    # into the new file.
    for suffix in ("-wal", "-shm", "-journal"):
        Path(str(dst) + suffix).unlink(missing_ok=True)
    os.replace(tmp, dst)


def expected_tables() -> list[str]:
    """Table names declared by the application's SQLAlchemy models."""
    import app.models.user  # noqa: F401
    import app.models.upload_permission  # noqa: F401
    import app.models.course  # noqa: F401
    import app.models.ai_review  # noqa: F401
    import app.models.learning  # noqa: F401
    import app.models.certificate  # noqa: F401
    from app.database import Base

    return sorted(Base.metadata.tables.keys())
