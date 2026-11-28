#!/usr/bin/env python3
"""Seed a LOCAL SQLite database with clearly fictional demo data.

Safety rules
------------
* Default target is a dedicated file: backend/dev_data/seed_dev.db
* The app's own database (learning_hub.db) is refused unless --allow-app-db.
* Every row created has an id starting with ``seed_`` and every email ends in
  ``@seed.example.test`` (a reserved, undeliverable domain), so seed rows are
  easy to recognise and can never collide with real accounts.
* Re-running is idempotent: existing seed rows are skipped, nothing is updated.
  Real (non-seed) rows are never modified or deleted.
* ``--reset`` deletes ONLY rows whose ids start with ``seed_``, then reseeds.
* No credentials are hardcoded: accounts get a random throw-away password
  unless you provide one via --login-password or SEED_LOGIN_PASSWORD.

Usage (from the backend/ folder):
    python scripts/db_seed.py
    python scripts/db_seed.py --db dev_data/my_test.db --reset
"""
from __future__ import annotations

import argparse
import os
import secrets
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from db_common import (  # noqa: E402
    DEFAULT_SEED_DB, DbUtilError, is_protected, require_not_production_url, resolve_path,
)

from sqlalchemy import create_engine, event  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.database import Base  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.upload_permission import UploadPermission, VerifiedFaculty, PermissionStatus  # noqa: E402
from app.models.course import Course, Module, Lesson, CourseLifecycleStatus  # noqa: E402
from app.models.learning import (  # noqa: E402
    Enrollment, LessonProgress, Quiz, QuizQuestion, QuizAttempt,
)
from app.models.certificate import Certificate, CertificateType  # noqa: E402
import app.models.ai_review  # noqa: E402,F401  (registers tables for create_all)

SEED_PREFIX = "seed_"
EMAIL_DOMAIN = "seed.example.test"
BASE_TIME = datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)  # fixed => deterministic

FACULTY = [
    ("Dr. Meera Iyer", "Computer Science & Engineering"),
    ("Prof. Rohan Deshmukh", "Artificial Intelligence & Data Science"),
    ("Dr. Kavya Nair", "Humanities & Jain Studies"),
    ("Prof. Imran Qureshi", "Management Studies"),
]
STUDENTS = [
    "Aditi Verma", "Karan Mehta", "Sneha Pillai", "Vihaan Gupta", "Ishita Bose", "Rahul Menon",
    "Diya Shetty", "Arjun Reddy", "Neha Kulkarni", "Siddharth Jain", "Pooja Hegde", "Yash Agarwal",
]
ADMIN = ("seed_admin_01", "Seed Admin")

# slug, title, category, level, status, creator(student idx), faculty idx, modules
COURSES = [
    ("python-basics", "Python Basics for Beginners", "academic", "beginner", "PUBLISHED", 0, 0,
     [("Getting Started", ["Installing Python", "Variables and Types"]),
      ("Control Flow", ["If Statements", "Loops in Python"])]),
    ("data-structures", "Data Structures Made Simple", "academic", "intermediate", "PUBLISHED", 1, 0,
     [("Linear Structures", ["Arrays and Lists", "Stacks and Queues"]),
      ("Trees", ["Binary Trees", "Tree Traversals"])]),
    ("ahimsa-in-daily-life", "Ahimsa in Daily Life", "non-academic", "beginner", "PUBLISHED", 2, 2,
     [("Foundations", ["What is Ahimsa?", "History and Context"]),
      ("Practice", ["Mindful Consumption", "Compassionate Communication"])]),
    ("intro-to-machine-learning", "Introduction to Machine Learning", "academic", "advanced", "PUBLISHED", 3, 1,
     [("Concepts", ["Supervised vs Unsupervised", "Training and Testing"]),
      ("First Models", ["Linear Regression", "Decision Trees"])]),
    ("campus-startup-pitching", "Campus Startup Pitching 101", "non-academic", "beginner", "FACULTY_REVIEW", 4, 3,
     [("Pitch Basics", ["Finding Your Story", "Slide Structure"])]),
    ("study-habits", "Effective Study Habits", "non-academic", "beginner", "DRAFT", 5, 2,
     [("Planning", ["Weekly Planning"])]),
]

QUIZ_BANK = [
    ("Which option best describes the main goal of this course?", ["Memorisation", "Understanding core ideas", "Speed", "None"], 1),
    ("Practice makes progress. True or false?", ["True", "False", "Sometimes", "Unsure"], 0),
    ("Pick the correct statement.", ["A is correct", "B is correct", "C is correct", "D is correct"], 2),
]


def sid(*parts) -> str:
    return SEED_PREFIX + "_".join(str(p) for p in parts)


class Seeder:
    def __init__(self, session: Session):
        self.s = session
        self.created: dict[str, int] = {}
        self.skipped: dict[str, int] = {}

    def ensure(self, model, pk: str, **fields):
        name = model.__tablename__
        if self.s.get(model, pk) is not None:
            self.skipped[name] = self.skipped.get(name, 0) + 1
            return None
        obj = model(id=pk, **fields)
        self.s.add(obj)
        self.s.flush()  # surface constraint errors immediately
        self.created[name] = self.created.get(name, 0) + 1
        return obj


def make_hasher():
    from pwdlib import PasswordHash  # same library/algorithm the app uses
    return PasswordHash.recommended()


def reset_seed_rows(session: Session) -> int:
    """Delete only rows whose own id starts with 'seed_' (children first)."""
    order = [Certificate, QuizAttempt, QuizQuestion, Quiz, LessonProgress, Enrollment,
             Lesson, Module, Course, UploadPermission, VerifiedFaculty, User]
    total = 0
    for model in order:
        total += session.query(model).filter(model.id.startswith(SEED_PREFIX, autoescape=True)) \
            .delete(synchronize_session=False)
    session.commit()
    return total


def seed(session: Session, password: str) -> Seeder:
    sd = Seeder(session)
    hasher = make_hasher()
    pw_hash = hasher.hash(password)

    def at(days=0, hours=0):
        return BASE_TIME + timedelta(days=days, hours=hours)

    def add_user(uid, name, role):
        email = f"{uid.removeprefix(SEED_PREFIX)}@{EMAIL_DOMAIN}".replace("_", ".")
        clash = session.query(User).filter(User.email == email, User.id != uid).first()
        if clash:
            print(f"  ! email {email} already used by another user; skipping {uid}")
            return
        sd.ensure(User, uid, name=name, email=email, password_hash=pw_hash,
                  role=role, is_active=True, created_at=at())

    faculty_ids = []
    for i, (name, dept) in enumerate(FACULTY, 1):
        fid = sid("fac", f"{i:02d}")
        faculty_ids.append(fid)
        email = f"fac.{i:02d}@{EMAIL_DOMAIN}"
        if not session.query(VerifiedFaculty).filter(VerifiedFaculty.email == email, VerifiedFaculty.id != fid).first():
            sd.ensure(VerifiedFaculty, fid, name=name, email=email, department=dept, is_active=True)
        add_user(fid, name, "faculty")

    student_ids = []
    for i, name in enumerate(STUDENTS, 1):
        stid = sid("student", f"{i:02d}")
        student_ids.append(stid)
        add_user(stid, name, "student")
    add_user(ADMIN[0], ADMIN[1], "admin")

    published = []  # (course_id, [lesson ids], quiz_id)
    for ci, (slug, title, cat, level, status, creator, fac, modules) in enumerate(COURSES, 1):
        cid = sid("course", f"{ci:02d}")
        perm_id = sid("perm", f"{ci:02d}")
        approved = status in ("PUBLISHED", "FACULTY_REVIEW")
        sd.ensure(UploadPermission, perm_id, student_id=student_ids[creator], faculty_id=faculty_ids[fac],
                  title=title, content_type=cat, format="pptx",
                  description="Fictional seed permission request.",
                  consent_declared=True, consent_declared_at=at(ci),
                  status=PermissionStatus.APPROVED if approved else PermissionStatus.PENDING,
                  remarks="Approved (seed data)." if approved else None,
                  decision_timestamp=at(ci, 2) if approved else None,
                  created_at=at(ci), updated_at=at(ci))
        sd.ensure(Course, cid, creator_id=student_ids[creator], permission_id=perm_id, title=title,
                  slug=f"seed-{slug}", description=f"Fictional demo course: {title}.", category=cat,
                  level=level, status=CourseLifecycleStatus[status],
                  faculty_reviewer_id=faculty_ids[fac] if approved else None,
                  review_remarks="Looks good (seed data)." if status == "PUBLISHED" else None,
                  created_at=at(ci), updated_at=at(ci))
        lesson_ids = []
        for mi, (mtitle, lessons) in enumerate(modules, 1):
            mid = sid("mod", f"{ci:02d}", mi)
            sd.ensure(Module, mid, course_id=cid, title=mtitle,
                      description=f"{mtitle} module.", order_index=mi)
            for li, ltitle in enumerate(lessons, 1):
                lid = sid("lesson", f"{ci:02d}", mi, li)
                lesson_ids.append(lid)
                sd.ensure(Lesson, lid, module_id=mid, title=ltitle,
                          content=f"Fictional lesson content for '{ltitle}'.",
                          duration_minutes=10 + 5 * li, order_index=li)
        if status == "PUBLISHED":
            qid = sid("quiz", f"{ci:02d}")
            sd.ensure(Quiz, qid, course_id=cid, title=f"{title} - Final Quiz", passing_score_percentage=70.0)
            for qi, (text, opts, correct) in enumerate(QUIZ_BANK, 1):
                import json
                sd.ensure(QuizQuestion, sid("qq", f"{ci:02d}", qi), quiz_id=qid, question_text=text,
                          options_json=json.dumps(opts), correct_option_index=correct, order_index=qi)
            published.append((cid, title, lesson_ids, qid))

    # Enrollments, progress, quiz attempts, certificates (published courses only)
    cert_n = 0
    for si, stid in enumerate(student_ids):
        sname = STUDENTS[si]
        for pi, (cid, title, lesson_ids, qid) in enumerate(published):
            if (si + pi) % 3 == 0:
                continue  # not every student takes every course
            completed = (si * 7 + pi) % 4 == 0
            sd.ensure(Enrollment, sid("enr", f"{si+1:02d}", f"{pi+1:02d}"), student_id=stid, course_id=cid,
                      enrolled_at=at(10 + si), completed_at=at(20 + si) if completed else None)
            done_count = len(lesson_ids) if completed else (si + pi) % len(lesson_ids)
            for li, lid in enumerate(lesson_ids):
                if li < done_count:
                    sd.ensure(LessonProgress, sid("lp", f"{si+1:02d}", f"{pi+1:02d}", li + 1), student_id=stid,
                              lesson_id=lid, is_completed=True, completed_at=at(12 + si, li))
            if completed or (si + pi) % 5 == 0:
                score = 85.0 + (si % 4) * 5 if completed else 50.0
                sd.ensure(QuizAttempt, sid("qa", f"{si+1:02d}", f"{pi+1:02d}"), quiz_id=qid, student_id=stid,
                          score_percentage=score, passed=score >= 70.0, attempted_at=at(19 + si))
            if completed:
                cert_n += 1
                code = f"SEED-CERT-{cert_n:04d}"
                sd.ensure(Certificate, sid("cert", f"{cert_n:04d}"), certificate_code=code, recipient_id=stid,
                          recipient_name=sname, certificate_type=CertificateType.COURSE_COMPLETION,
                          course_id=cid, title=f"Certificate of Completion - {title}", issuer_id=ADMIN[0],
                          is_sample=True, verification_url=f"https://example.test/verify/{code}",
                          qr_code_data=f"https://example.test/verify/{code}", issued_at=at(21 + si))
    session.commit()
    return sd


def build_parser():
    p = argparse.ArgumentParser(description="Seed a local SQLite DB with fictional data.")
    p.add_argument("--db", default=str(DEFAULT_SEED_DB), help=f"SQLite file to seed (default: {DEFAULT_SEED_DB})")
    p.add_argument("--reset", action="store_true", help="delete existing seed_* rows first, then reseed")
    p.add_argument("--login-password", default=os.getenv("SEED_LOGIN_PASSWORD"),
                   help="password for all seeded accounts (min 12 chars). Default: random, unusable")
    p.add_argument("--allow-app-db", action="store_true",
                   help="permit seeding the app's own learning_hub.db (adds seed_* rows only)")
    return p


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    try:
        require_not_production_url()
        path = resolve_path(args.db)
        if is_protected(path) and not args.allow_app_db:
            raise DbUtilError(f"{path} is the application's own database. Refusing.\n"
                              "Use a dedicated file (default) or pass --allow-app-db.")
        if path.suffix.lower() not in (".db", ".sqlite", ".sqlite3"):
            raise DbUtilError("Database file should end in .db, .sqlite or .sqlite3")
        if args.login_password and len(args.login_password) < 12:
            raise DbUtilError("--login-password must be at least 12 characters.")
        path.parent.mkdir(parents=True, exist_ok=True)
        password = args.login_password or secrets.token_urlsafe(24)

        engine = create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})

        @event.listens_for(engine, "connect")
        def _fk_on(dbapi_conn, _):  # enforce foreign keys while seeding
            dbapi_conn.execute("PRAGMA foreign_keys=ON")

        Base.metadata.create_all(bind=engine)  # only creates MISSING tables; never alters existing
        with Session(engine) as session:
            if args.reset:
                print(f"Reset: removed {reset_seed_rows(session)} seed row(s)")
            result = seed(session, password)
        print(f"Seeded: {path}")
        for table in sorted(set(result.created) | set(result.skipped)):
            print(f"  {table:<16} created={result.created.get(table, 0):<4} already-present={result.skipped.get(table, 0)}")
        if not args.login_password:
            print("Note: seeded accounts use a random password (login disabled). "
                  "Pass --login-password to set one.")
        return 0
    except DbUtilError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
