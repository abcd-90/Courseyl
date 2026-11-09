# Testing Strategy & Quality Assurance Plan

This document establishes the testing methodology across all phases of the project, including automated test suites, integration tests, and live browser verification.

---

### 1. Test Levels

#### A. Unit & Service Tests
- **Authentication Service:**
  - Password hashing and verification.
  - JWT issuance, verification, and expiration.
- **YouTube Parser:**
  - Parsing normal watch URLs, short URLs (`youtu.be`), playlist URLs, and invalid strings.
  - Duration formatting (`HH:MM:SS` conversion).
- **AI Synthesis Adapter:**
  - Schema validation for generated courses, lessons, and quizzes.
  - Fallback provider handling when API keys are unconfigured or fail.
- **Placement Test Engine:**
  - Topic score aggregation and lesson skip threshold logic (>= 80%).

#### B. Integration & API Tests
- **Auth Flow:**
  - Signup -> Login -> Set Cookie -> Get `/api/auth/me` -> Logout -> 401 on protected endpoint.
- **Course Generation Flow:**
  - Post `/api/courses/generate` -> Quota check -> Create Job -> Stream Lesson 1 -> Background completion -> Verify DB records.
- **Interactive Learning Flow:**
  - Progress update -> Timestamp note creation -> Seek trigger -> Quiz submit -> "Replay the Moment" timestamp verification.
- **Billing & Quota Enforcement:**
  - Free tier limit enforcement -> Upgrade via Sandbox Checkout -> Limit update verified.

#### C. Live Browser Automated & E2E Tests (Chrome DevTools MCP)
- Real browser tests verifying:
  - Homepage render and responsive layout (1920px, 1440px, 1024px, 768px, 390px).
  - Complete user registration and login.
  - Pasting a YouTube video and generating a course.
  - Inspecting real-time progress and Lesson 1 streaming availability.
  - Playing the embedded YouTube player.
  - Adding a timestamped note and clicking it to seek video.
  - Submitting an incorrect quiz answer and verifying "Replay the Moment" seeks the player.
  - Submitting a correct answer and checking quiz score.
  - Taking a placement test and verifying skipped lessons.
  - Enrolling in a community course.
  - Creating and viewing a multi-course roadmap.
  - Upgrading to Pro in sandbox checkout.
  - Admin dashboard navigation and metrics inspection.

---

### 2. Defect Severity & Exit Criteria
- **Severity 1 (Critical):** Crash, data loss, security bypass, or broken core learning flow. *Zero permitted at delivery.*
- **Severity 2 (High):** Major feature impairment or broken responsive layout. *Zero permitted at delivery.*
- **Severity 3 (Medium):** Minor cosmetic glitch or non-blocking edge case. *Remediated prior to delivery.*

