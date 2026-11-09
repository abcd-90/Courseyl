# CourseIt — AI-Powered Active Learning Platform

[![Next.js 16](https://img.shields.io/badge/Next.js-16.1.6-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![Prisma ORM 7](https://img.shields.io/badge/Prisma-7.10.1-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS 4](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> **CourseIt** transforms long, unstructured YouTube video lectures and playlists into bite-sized, high-retention online courses. Features semantic lesson segmentation, diagnostic placement testing to shrink study time, smart quizzes with **"Replay the Moment"** instant video reviews, timestamped study notes, adaptive daily study planning (30–120 mins), multi-course roadmaps, community course discovery with 0 quota penalty, tiered quotas (Free, Pro, Max), and a full administrator control center.

---

## 🌟 Executive Summary & Key Highlights

- **Not a Landing-Page Clone:** A complete, end-to-end engineered learning platform with full database persistence, real authentication, background course synthesis, and YouTube IFrame player synchronization.
- **Diagnostic Placement Tests:** 2-minute diagnostic quizzes before starting a course evaluate pre-existing knowledge and automatically exclude mastered lessons, shrinking estimated study hours. Learners can manually restore skipped lessons at any time.
- **Smart Quizzes & "Replay the Moment":** Incorrect quiz answers show detailed rationales and surface a one-click button that seeks the embedded YouTube player directly to the exact timestamp where the instructor explained that concept.
- **Timestamped Personal Study Notes:** Capture insights while watching with auto-detected timestamps. Click any timestamp pill in the lesson view or central `/notes` page to jump the video directly to that instant.
- **Adaptive Daily Study Planner:** Choose 30m, 60m, 90m, or 120m daily availability. CourseIt dynamically allocates lesson tasks across enrolled courses, updating daily checklists and study streaks.
- **Multi-Course Roadmaps:** Create and enroll in structured multi-stage career paths linking multiple courses together with aggregate progress tracking.
- **Community Discovery (0 Quota Penalty):** Enrolling and learning from existing community courses is 100% free forever and never deducts from a user's monthly build quota.
- **Tiered Subscriptions & Sandbox Billing:** Transparent Free ($0), Pro ($19/mo or $190/yr), and Max ($49/mo or $490/yr) quotas with a sandbox checkout flow that simulates real-world plan upgrades and quota resets.
- **AI Synthesis Pipeline:** Multi-provider architecture supporting NVIDIA Nemotron, OpenAI GPT-4o, and an offline local deterministic curriculum engine with real-time SSE progress updates.
- **Modern Clean SaaS Aesthetics:** Crisp white background with sky-blue accents (`#0284c7`), refined borders, and zero clutter.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 16.1.6 (App Router, Server Components & Server Actions) |
| **Language** | TypeScript 5.9 with strict type checking |
| **Styling & Icons** | Tailwind CSS 4.0, Lucide React icons |
| **Database ORM** | Prisma ORM 7.10.1 with `@prisma/adapter-better-sqlite3` and `better-sqlite3` |
| **Database Engine** | SQLite (`dev.db`), fully swappable to PostgreSQL via `DATABASE_URL` |
| **Authentication** | Secure HTTP-only cookie sessions with salted PBKDF2 cryptographic hashing |
| **Media & Video** | YouTube IFrame Player API with real-time imperative `seekTo(sec)` synchronization |
| **AI Providers** | Modular AI orchestrator: NVIDIA Nemotron, OpenAI API, and Local Synthesizer |
| **Testing & QA** | Chrome DevTools Protocol MCP with live headless browser verification across desktop and mobile |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v20.x or higher
- **npm** v10.x or higher

### 2. Clone and Install
```bash
git clone https://github.com/your-username/courseit.git
cd courseit
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Database Connection (SQLite default, can be replaced with PostgreSQL)
DATABASE_URL="file:./dev.db"

# Session Security Secret
SESSION_SECRET="courseit-super-secret-jwt-encryption-key-production-grade"

# Base URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional AI Providers (Defaults to Local Deterministic Synthesizer if omitted)
# NVIDIA_API_KEY="nvapi-..."
# OPENAI_API_KEY="sk-..."
```

### 4. Database Initialization & Seeding
```bash
# Push Prisma schema to SQLite
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Seed sample courses, multi-course roadmaps, and demo accounts
npx tsx scripts/seed.ts
```

### 5. Run the Application
```bash
# Development Mode:
npm run dev

# Production Build & Start:
npm run build
npm run start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Pre-Configured Demo Credentials

The database seed provides ready-to-test accounts with 1-click login buttons on `/login`:

| Account | Email | Password | Role | Tier & Features |
|---|---|---|---|---|
| **Admin** | `admin@courseit.xyz` | `AdminPassword123!` | `ADMIN` | Max Tier, Full access to `/admin` control center, user promotion, course moderation, and AI provider toggles |
| **Learner** | `learner@courseit.xyz` | `LearnerPassword123!` | `USER` | Pro Tier, Active 5-day streak, pre-enrolled courses, and saved timestamped notes |

*You can also register any new user account via `/register` with immediate Free Tier quota and automatic session creation.*

---

## 📖 Feature Directory & Architecture

### Complete System Specification
All architectural blueprints, database schemas, and product specifications are saved under [`/docs`](file:///d:/Compressed/CourseIt/docs):
- [`docs/PRD.md`](file:///d:/Compressed/CourseIt/docs/PRD.md) — Product Requirements Document
- [`docs/FEATURE_INVENTORY.md`](file:///d:/Compressed/CourseIt/docs/FEATURE_INVENTORY.md) — Feature Matrix
- [`docs/USER_JOURNEYS.md`](file:///d:/Compressed/CourseIt/docs/USER_JOURNEYS.md) — Core Learner & Admin Journey Maps
- [`docs/ROLES_AND_PERMISSIONS.md`](file:///d:/Compressed/CourseIt/docs/ROLES_AND_PERMISSIONS.md) — RBAC Security Policies
- [`docs/FUNCTIONAL_REQUIREMENTS.md`](file:///d:/Compressed/CourseIt/docs/FUNCTIONAL_REQUIREMENTS.md) — Functional Specifications
- [`docs/NON_FUNCTIONAL_REQUIREMENTS.md`](file:///d:/Compressed/CourseIt/docs/NON_FUNCTIONAL_REQUIREMENTS.md) — Latency, Reliability, & Security
- [`docs/DATABASE_ERD.md`](file:///d:/Compressed/CourseIt/docs/DATABASE_ERD.md) — Entity Relationship Diagram & Prisma Models
- [`docs/SYSTEM_ARCHITECTURE.md`](file:///d:/Compressed/CourseIt/docs/SYSTEM_ARCHITECTURE.md) — High-Level Component & Service Architecture
- [`docs/AI_PROCESSING_WORKFLOW.md`](file:///d:/Compressed/CourseIt/docs/AI_PROCESSING_WORKFLOW.md) — Video Ingestion & Curriculum Pipeline
- [`docs/API_SPECIFICATION.md`](file:///d:/Compressed/CourseIt/docs/API_SPECIFICATION.md) — Full REST API Endpoints Specification
- [`docs/UI_PAGE_INVENTORY.md`](file:///d:/Compressed/CourseIt/docs/UI_PAGE_INVENTORY.md) — Sitemap & UI Components
- [`docs/ACCEPTANCE_CRITERIA.md`](file:///d:/Compressed/CourseIt/docs/ACCEPTANCE_CRITERIA.md) — Gherkin Acceptance Scenarios
- [`docs/TESTING_STRATEGY.md`](file:///d:/Compressed/CourseIt/docs/TESTING_STRATEGY.md) — QA Automation & Browser Matrix

---

## 🧪 Verified Browser Test Workflows

The platform has been rigorously tested using Chrome DevTools across all key flows:

1. **User Registration & Cookie Authentication:** Created `jordan.blake@example.com` and established a secure HTTP-only session cookie.
2. **Course Synthesis:** Processed `https://www.youtube.com/watch?v=kqtD5dpn9C8` into a 4-lesson curriculum across 2 chapters with instant first-lesson streaming.
3. **Diagnostic Placement Test:** Scored 100% on the placement quiz, verifying automatic calculation of skipped lessons and estimated study time shrinking.
4. **Manual Lesson Unskip:** Restored Lesson 1 from the course outline tree.
5. **Video Playback & Timestamp Seeking:** Embedded YouTube IFrame API synchronized with custom timestamp pills.
6. **Timestamped Notes:** Created a note at `0:44` on Lesson 1, verified persistence in SQLite, and verified central aggregation in `/notes` with direct seek buttons.
7. **Smart Quizzes & "Replay the Moment":** Intentionally submitted a wrong answer, verified failure feedback and rationale, clicked "Replay at 2:30" to jump the video, retook the quiz with 100% score, and verified automatic lesson completion.
8. **Adaptive Daily Planner:** Configured a 90-minute study goal on `/planner`, verified daily checklist allocation and streak tracking.
9. **Community & Roadmaps:** Explored public courses on `/community`, enrolled in the *Full-Stack AI Software Engineer Career Track*, and created a new roadmap (*Modern Python & Web Automation Specialist*).
10. **Tiered Billing & Quotas:** Tested monthly/yearly pricing toggles, upgraded to Pro in the sandbox checkout modal, and verified instant quota updates (1/5 builds used, 30h allowance) on `/billing`.
11. **Admin Control Center:** Signed in as `admin@courseit.xyz`, reviewed platform metrics (3 users, 8 lessons, 100% job success), inspected user accounts on `/admin/users`, managed courses on `/admin/courses`, and verified AI provider configuration on `/admin/ai`.
12. **Multi-Device Responsiveness:** Verified zero horizontal scroll and fluid layout across Desktop (1920x1080), Laptop (1440x900), Tablet (1024x768, 768x1024), and Mobile (390x844 with slide-out drawer).

---

## 🔒 Security & Privacy

- **Authorized YouTube Access:** Strictly adheres to YouTube API terms of service. Captions and video metadata are extracted via sanctioned public endpoints; videos are embedded through the official YouTube IFrame Player without bypassing content protections.
- **Credential Storage:** User passwords are never stored in plaintext. They are salted and hashed using PBKDF2 (`100,000` iterations, SHA-512).
- **Session Tokens:** Stateless, tamper-proof session tokens stored inside `SameSite=Lax`, `HttpOnly` cookies.
- **RBAC Guardrails:** Administrative routes (`/admin/*`) and API endpoints strictly verify the authenticated user's `role === "ADMIN"` before granting access.

---

## 📄 License
This project is open-source software licensed under the [MIT License](LICENSE).
