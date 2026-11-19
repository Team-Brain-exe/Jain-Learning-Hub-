from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine, SessionLocal
from app.models.upload_permission import VerifiedFaculty
from app.models.course import Course, Module, Lesson, MediaAsset
from app.models.ai_review import AIReviewJob, AIFinding
from app.models.learning import Enrollment, LessonProgress, Quiz, QuizQuestion, QuizAttempt
from app.models.certificate import Certificate
from app.routers import upload_permissions, courses, uploads, learning, certificates, ai_reviews

# Create DB tables
Base.metadata.create_all(bind=engine)

# Seed initial verified faculty members for local testing
def seed_initial_faculty():
    db = SessionLocal()
    try:
        if not db.query(VerifiedFaculty).first():
            faculty_members = [
                VerifiedFaculty(
                    id="fac_cs_01",
                    name="Dr. Ramesh Rao",
                    email="ramesh.rao@jainuniversity.ac.in",
                    department="Computer Science & Engineering",
                    is_active=True,
                ),
                VerifiedFaculty(
                    id="fac_ai_02",
                    name="Prof. Sunita Sharma",
                    email="sunita.sharma@jainuniversity.ac.in",
                    department="Artificial Intelligence & Data Science",
                    is_active=True,
                ),
            ]
            db.add_all(faculty_members)
            db.commit()
    finally:
        db.close()

seed_initial_faculty()

app = FastAPI(
    title="JAIN FET Learning Hub API",
    version="1.0.0",
    description="Feature APIs for JAIN FET Learning Hub - Faculty Consent, Course Content & Certification"
)

# CORS configuration for Arya's React/Lovable frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "jain-learning-hub-backend"}

# Register Haripriya's Phase 1, Phase 2, Phase 3, Phase 4 & Phase 5 routers
app.include_router(upload_permissions.router)
app.include_router(courses.router)
app.include_router(uploads.router)
app.include_router(learning.router)
app.include_router(certificates.router)
app.include_router(ai_reviews.router)

