# System Architecture Specification

This document details the macro and micro architecture of the CourseIt-Style platform, including component boundaries, data flow, queue architecture, and subsystem interactions.

---

### High-Level Architectural Diagram (Mermaid)

```mermaid
flowchart TD
    subgraph Client["Client Tier (Web Browser)"]
        UI["Next.js App Router (React + TS + Tailwind)"]
        YT["YouTube IFrame Player API"]
        State["Client State & React Query"]
    end

    subgraph Edge["Edge / Routing Layer"]
        Middleware["Next.js Auth & Role Middleware"]
        APIRoutes["Next.js Server API Routes (/api/*)"]
    end

    subgraph CoreServices["Backend Service Layer"]
        AuthSvc["Authentication & Session Service"]
        CourseSvc["Course & Curriculum Service"]
        PlayerSvc["Learning Progress & Sync Service"]
        QuizSvc["Quiz & 'Replay the Moment' Engine"]
        TestSvc["Placement Test Evaluation Service"]
        PlannerSvc["Daily Learning Planner Service"]
        RoadmapSvc["Roadmap Orchestrator"]
        BillingSvc["Quota Governance & Sandbox Billing"]
        AdminSvc["Admin Control & Telemetry Service"]
    end

    subgraph ProcessingPipeline["AI & Background Processing Pipeline"]
        Queue["Job Processing Engine (Async Worker)"]
        YTIngest["YouTube Metadata & Transcript Extractor"]
        AIEngine["AI Provider Abstraction Layer"]
        Nemotron["NVIDIA Nemotron Provider"]
        OpenAI["OpenAI Compatible Provider"]
        MockAI["Deterministic Fallback Engine"]
    end

    subgraph DataPersistence["Persistence Tier"]
        DB[(Prisma ORM + SQLite / PostgreSQL)]
    end

    %% Connections
    UI <--> Middleware
    Middleware <--> APIRoutes
    APIRoutes <--> CoreServices
    CoreServices <--> DB
    YT <--> UI

    CourseSvc --> Queue
    Queue --> YTIngest
    Queue --> AIEngine
    AIEngine --> Nemotron
    AIEngine --> OpenAI
    AIEngine --> MockAI
    AIEngine --> CourseSvc
    Queue --> DB
```

---

### Component Breakdown

1. **Frontend Presentation Layer (Next.js 15 App Router):**
   - Modern React with Server Components (RSC) and Client Components where interactive state is required.
   - Styled with Tailwind CSS using a professional sky-blue and white design system.
   - Embeds the official YouTube IFrame Player API for native video playback, time-tracking, and frame-accurate seeking.

2. **API & Business Logic Layer:**
   - Server-side RESTful API routes under `/api/`.
   - Comprehensive request validation, role enforcement, and error normalization.
   - Authentication via secure, HTTP-only JWT cookies with bcrypt password encryption.

3. **AI Pipeline & Course Generator:**
   - Modular AI abstraction layer (`aiProvider.ts`) with adapter pattern supporting NVIDIA Nemotron, OpenAI, and a reliable fallback synthesizer.
   - Multi-phase curriculum construction:
     1. Metadata retrieval (title, author, thumbnail, duration).
     2. Transcript extraction (captions API or provided text).
     3. Chapter/lesson semantic topic segmentation.
     4. Lesson enrichment (summaries, key concepts, definitions).
     5. Quiz and timestamp generation ("Replay the Moment" integration).
     6. Placement test generation.
   - **Streaming First Lesson (TTFL):** Lesson 1 is synthesized and marked `READY` in the database immediately, allowing the learner to start watching without waiting for a 20-lesson playlist to finish building.

4. **Persistence Layer (Prisma ORM):**
   - SQLite for zero-config local reliability, fully swappable to PostgreSQL via environment variables.
   - Clean relational model with cascade constraints, foreign keys, and indexes on frequent lookup fields (`slug`, `userId`, `courseId`).

