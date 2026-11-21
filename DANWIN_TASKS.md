# Jain Learning Hub — Danwin's Work Plan

**Role:** Backend developer — Enrollment, Learning, Quizzes & Certificates  
**Coordination:** Aparna (authentication/consent/integration), Haripriya (course publication), Arya (frontend), Prit (AI validation)

## Scope
Own the **post-publication student learning flow**, including enrollment, progress, quizzes, course completion and certificates. Existing backend code and tests may already cover parts of this; **verify before implementing anything new**.

## Tasks

- [x] Review the merged backend routes, schemas, models and tests for enrollment, lessons, quiz attempts, progress and certificates.
- [x] Verify that students can browse/enroll in **published** courses, while draft or unapproved courses cannot be enrolled in.
- [x] Verify lesson completion tracking and per-course learner progress, including authorization and enrollment checks.
- [x] Verify quiz questions, answer submission, scoring, pass thresholds and protections against forged answers or unauthorized attempts.
- [x] Confirm the course-completion eligibility rules (required lessons and passing quizzes) and handle edge cases such as incomplete learning.
- [x] Verify course-completion certificate issuance, certificate data, duplicate handling and public verification endpoints.
- [x] Verify **peer-educator certificate** eligibility for approved course creators, including appropriate role restrictions.
- [x] Add or update automated tests for enrollment, progress, quizzes, certificates and security boundaries.
- [x] Share endpoint URLs, example request/response payloads and required auth with Arya and Aparna.

## Deliverables
1. Verified published-course enrollment and lesson-progress APIs.
2. Verified quiz attempts, grading and completion logic.
3. Verified course-completion and peer-educator certificate workflows.
4. Automated tests passing for Danwin-owned modules and a short frontend API handoff.

## Suggested branch
`feature/danwin-learning-certificates`

## Coordination rules
- Work from the latest merged branch; make changes on a feature branch and open a PR.
- Do not modify Aparna's JWT/consent implementation without coordinating.
- Do not own course creation, uploads, faculty review or publication transitions; Haripriya owns those.
- Confirm course and lesson data contracts with Haripriya before changing shared models.
- Certificates should be issued only when backend eligibility checks succeed, never based solely on a frontend claim.

## Definition of done
A student can enroll in a published course, complete lessons, attempt quizzes, meet completion requirements and receive a verifiable certificate; eligible approved course creators can receive peer-educator certificates; relevant tests pass.
