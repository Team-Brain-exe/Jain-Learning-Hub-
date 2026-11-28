"""Tests for the development-only database utilities in backend/scripts/.

Everything runs against temporary files; no real database is touched.
"""
import sqlite3
import sys
from pathlib import Path

import pytest

SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
sys.path.insert(0, str(SCRIPTS))

import db_backup  # noqa: E402
import db_common  # noqa: E402
import db_healthcheck  # noqa: E402
import db_restore  # noqa: E402
import db_seed  # noqa: E402
import db_stats  # noqa: E402


def counts(path):
    conn = sqlite3.connect(path)
    try:
        return {t: conn.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
                for t in ("users", "courses", "enrollments", "certificates", "verified_faculty")}
    finally:
        conn.close()


@pytest.fixture
def seeded(tmp_path):
    db = tmp_path / "seed.db"
    assert db_seed.main(["--db", str(db)]) == 0
    return db


# ---------- seed ----------
def test_seed_creates_data_and_is_idempotent(seeded):
    first = counts(seeded)
    assert first["users"] > 0 and first["courses"] > 0 and first["enrollments"] > 0
    assert db_seed.main(["--db", str(seeded)]) == 0
    assert counts(seeded) == first


def test_seed_uses_only_fictional_identifiers(seeded):
    conn = sqlite3.connect(seeded)
    emails = [r[0] for r in conn.execute("SELECT email FROM users")]
    ids = [r[0] for r in conn.execute("SELECT id FROM users")]
    conn.close()
    assert all(e.endswith("@seed.example.test") for e in emails)
    assert all(i.startswith("seed_") for i in ids)


def test_seed_does_not_touch_real_rows_and_reset_only_removes_seed_rows(seeded):
    conn = sqlite3.connect(seeded)
    conn.execute("INSERT INTO users (id,name,email,password_hash,role,is_active,created_at) "
                 "VALUES ('real_1','Real Person','real@example.org','h','student',1,'2026-01-01')")
    conn.commit(); conn.close()
    before = counts(seeded)["users"]
    assert db_seed.main(["--db", str(seeded)]) == 0
    assert counts(seeded)["users"] == before
    assert db_seed.main(["--db", str(seeded), "--reset"]) == 0
    conn = sqlite3.connect(seeded)
    assert conn.execute("SELECT name FROM users WHERE id='real_1'").fetchone() == ("Real Person",)
    assert conn.execute("SELECT count(*) FROM users").fetchone()[0] == before
    conn.close()


def test_seed_skips_user_when_email_belongs_to_someone_else(tmp_path):
    db = tmp_path / "s.db"
    assert db_seed.main(["--db", str(db)]) == 0
    conn = sqlite3.connect(db)
    conn.execute("DELETE FROM users WHERE id='seed_student_01'")
    conn.execute("INSERT INTO users (id,name,email,password_hash,role,is_active,created_at) "
                 "VALUES ('other','X','student.01@seed.example.test','h','student',1,'2026-01-01')")
    conn.commit(); conn.close()
    assert db_seed.main(["--db", str(db)]) == 0  # must not crash on the unique email
    conn = sqlite3.connect(db)
    assert conn.execute("SELECT id FROM users WHERE email='student.01@seed.example.test'").fetchone() == ("other",)
    conn.close()


def test_seed_refuses_app_database(monkeypatch, tmp_path):
    app_db = tmp_path / "learning_hub.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{app_db}")
    assert db_seed.main(["--db", str(app_db)]) == 2
    assert not app_db.exists()


def test_seed_refuses_non_sqlite_database_url(monkeypatch, tmp_path):
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pw@host/db")
    assert db_seed.main(["--db", str(tmp_path / "x.db")]) == 2


def test_seed_rejects_short_password(tmp_path):
    assert db_seed.main(["--db", str(tmp_path / "x.db"), "--login-password", "short"]) == 2


def test_seed_enforces_foreign_keys(seeded):
    conn = sqlite3.connect(seeded)
    assert conn.execute("PRAGMA foreign_key_check").fetchall() == []
    conn.close()


# ---------- backup ----------
def test_backup_creates_valid_copy(seeded, tmp_path):
    dest = tmp_path / "bk" / "b.sqlite"
    assert db_backup.main(["--source", str(seeded), "--dest", str(dest)]) == 0
    assert counts(dest) == counts(seeded)


def test_backup_refuses_overwrite_without_force(seeded, tmp_path):
    dest = tmp_path / "b.sqlite"
    dest.write_bytes(b"precious")
    assert db_backup.main(["--source", str(seeded), "--dest", str(dest)]) == 2
    assert dest.read_bytes() == b"precious"
    assert db_backup.main(["--source", str(seeded), "--dest", str(dest), "--force"]) == 0
    assert counts(dest) == counts(seeded)


def test_backup_validates_source(tmp_path):
    assert db_backup.main(["--source", str(tmp_path / "missing.db"), "--dest", str(tmp_path / "o")]) == 2
    junk = tmp_path / "junk.db"
    junk.write_text("not a database")
    assert db_backup.main(["--source", str(junk), "--dest", str(tmp_path / "o")]) == 2


def test_backup_same_file_rejected(seeded):
    assert db_backup.main(["--source", str(seeded), "--dest", str(seeded), "--force"]) == 2


def test_backup_leaves_no_partial_file(seeded, tmp_path):
    dest = tmp_path / "b.sqlite"
    db_backup.main(["--source", str(seeded), "--dest", str(dest)])
    assert not list(tmp_path.glob("*.partial"))


# ---------- restore ----------
def test_restore_to_new_file(seeded, tmp_path):
    bk = tmp_path / "b.sqlite"
    db_backup.main(["--source", str(seeded), "--dest", str(bk)])
    out = tmp_path / "restored.db"
    assert db_restore.main(["--backup", str(bk), "--dest", str(out)]) == 0
    assert counts(out) == counts(seeded)


def test_restore_requires_force_to_replace(seeded, tmp_path):
    bk = tmp_path / "b.sqlite"
    db_backup.main(["--source", str(seeded), "--dest", str(bk)])
    out = tmp_path / "existing.db"
    out.write_bytes(b"keep me")
    assert db_restore.main(["--backup", str(bk), "--dest", str(out)]) == 2
    assert out.read_bytes() == b"keep me"
    assert db_restore.main(["--backup", str(bk), "--dest", str(out), "--force"]) == 0
    assert counts(out) == counts(seeded)


def test_restore_rejects_invalid_backup(tmp_path):
    bad = tmp_path / "bad.sqlite"
    bad.write_text("garbage")
    out = tmp_path / "out.db"
    assert db_restore.main(["--backup", str(bad), "--dest", str(out)]) == 2
    assert not out.exists()


def test_restore_refuses_app_database_even_with_force(seeded, tmp_path, monkeypatch):
    app_db = tmp_path / "learning_hub.db"
    app_db.write_bytes(b"real data")
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{app_db}")
    bk = tmp_path / "b.sqlite"
    db_backup.main(["--source", str(seeded), "--dest", str(bk)])
    assert db_restore.main(["--backup", str(bk), "--dest", str(app_db), "--force"]) == 2
    assert app_db.read_bytes() == b"real data"


# ---------- health check ----------
def test_healthcheck_passes_on_seeded_db(seeded):
    assert db_healthcheck.main(["--db", str(seeded)]) == 0


def test_healthcheck_fails_when_missing(tmp_path):
    assert db_healthcheck.main(["--db", str(tmp_path / "nope.db")]) == 1


def test_healthcheck_fails_on_missing_tables(tmp_path):
    db = tmp_path / "empty.db"
    sqlite3.connect(db).execute("CREATE TABLE users (id TEXT)").connection.commit()
    assert db_healthcheck.main(["--db", str(db)]) == 1


def test_healthcheck_fails_on_non_sqlite_file(tmp_path):
    junk = tmp_path / "junk.db"
    junk.write_text("hello")
    assert db_healthcheck.main(["--db", str(junk)]) == 1


def test_healthcheck_expected_tables_come_from_models():
    tables = db_common.expected_tables()
    for t in ("users", "courses", "enrollments", "certificates", "verified_faculty"):
        assert t in tables


# ---------- stats ----------
def test_stats_counts_and_exposes_no_personal_data(seeded, capsys):
    assert db_stats.main(["--db", str(seeded)]) == 0
    out = capsys.readouterr().out
    assert "users (total)" in out and "certificates" in out
    assert "@" not in out  # no emails
    assert "Aditi" not in out  # no names
