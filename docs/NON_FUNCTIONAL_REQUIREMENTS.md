# Non-Functional Requirements (NFR)

This document establishes the quality attributes, performance targets, security posture, accessibility benchmarks, and architectural constraints of the platform.

---

### 1. Performance & Latency
- **NFR-PERF-01 (Page Load):** Core web vitals shall achieve Largest Contentful Paint (LCP) < 1.8s, First Input Delay (FID) < 100ms, and Cumulative Layout Shift (CLS) < 0.05 on standard 4G and desktop broadband.
- **NFR-PERF-02 (API Response Time):** Database-backed read endpoints (course list, user profile, notes) shall respond within < 120ms (p95).
- **NFR-PERF-03 (Time to First Lesson):** For single videos under 2 hours, lesson 1 generation and availability shall complete in < 45 seconds.
- **NFR-PERF-04 (Player Synchronization):** Timestamp seek requests via note click or "Replay the Moment" shall execute in < 200ms within the YouTube IFrame player.

---

### 2. Security & Data Protection
- **NFR-SEC-01 (Authentication Security):** Session tokens shall be stored in `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
- **NFR-SEC-02 (Password Hashing):** Passwords shall be hashed using `bcrypt` with a minimum salt round work factor of 10.
- **NFR-SEC-03 (API Authorization):** Every protected endpoint shall validate the caller's JWT and verify ownership of the requested resource (e.g., users cannot edit or view private notes belonging to other users).
- **NFR-SEC-04 (Input Sanitization):** All user-submitted notes, descriptions, and URLs shall be sanitized against XSS attacks and SQL/NoSQL injection.
- **NFR-SEC-05 (Secret Hygiene):** No API keys (NVIDIA, OpenAI, JWT Secret, Database URLs) shall ever be returned in client responses or hardcoded in version control.

---

### 3. Reliability & Fault Tolerance
- **NFR-REL-01 (AI Provider Failover):** If the configured primary AI provider fails or experiences rate limits, the system shall report clear actionable errors and fallback to secondary providers or retry mechanisms.
- **NFR-REL-02 (Partial Result Resilience):** If a course generation fails halfway through a 15-lesson playlist, previously generated lessons and metadata shall remain preserved in the database.
- **NFR-REL-03 (Graceful Video Degradation):** When YouTube captions are restricted or unavailable, the user interface shall offer immediate fallback options (custom transcript input) without crashing.

---

### 4. Usability, Aesthetics & UI/UX
- **NFR-UI-01 (Visual Identity):** The UI shall adhere strictly to a crisp, modern SaaS aesthetic utilizing a white and sky-blue color scheme with neutral slate/zinc accents.
- **NFR-UI-02 (Responsive Integrity):** The layout shall adapt responsively to standard viewports: Desktop (1920px), Laptop (1440px), Tablet (1024px & 768px), and Mobile (390px). No horizontal overflow shall occur.
- **NFR-UI-03 (Distraction-Free Mode):** The lesson player view shall maximize video and lesson note clarity, minimizing extraneous header and navigation clutter during active study.

---

### 5. Accessibility & Compliance
- **NFR-A11Y-01 (WCAG 2.1 AA):** Color contrast ratios shall meet or exceed 4.5:1 for normal text and 3:1 for large headers and interactive buttons.
- **NFR-A11Y-02 (Keyboard Navigation):** All interactive buttons, modals, tabs, and quiz radio buttons shall be fully navigable via keyboard (`Tab`, `Enter`, `Space`, `Arrow` keys).

