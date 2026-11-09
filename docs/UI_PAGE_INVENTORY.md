# UI Page Inventory & Component Structure

This document catalogs every page, modal, drawer, and shared component across the application.

---

### Public & Marketing Views
1. **`/` (Homepage):**
   - Hero banner with headline, interactive YouTube URL entry bar, and dynamic course previews.
   - Core value proposition: "Turn any YouTube video into an interactive course".
   - Key feature showcases: Lesson Splitting, Placement Tests, "Replay the Moment", Roadmaps, and Planner.
   - Interactive live demo snippet.
   - Testimonials, FAQ accordion, footer links.
2. **`/pricing` (Pricing & Plans):**
   - Monthly / Annual toggle (2 months free on annual).
   - Detailed plan cards for Free, Pro ($19/mo), and Max ($49/mo).
   - Feature comparison grid.
   - Direct upgrade CTA triggers.
3. **`/community` (Explore Courses):**
   - Filter bar: Search input, categories (Dev, Design, Business, AI), difficulty, duration.
   - Course cards with badges, duration, lesson count, student count, and creator info.
4. **`/roadmaps` (Community Roadmaps):**
   - Multi-course pathway cards with stages, total courses, and learner enrollment counts.
5. **`/login` & `/register`:**
   - Sleek authentication cards with sky-blue accents, social buttons, and validation alerts.

---

### Authenticated Learner Views
6. **`/dashboard` (Learner Command Center):**
   - Personalized welcome banner with daily streak counter and quick action to generate a course.
   - Active courses carousel / grid with visual progress bars.
   - Today's study task list based on the daily planner.
   - Quick stats: Total learning hours, lessons completed, quiz accuracy.
7. **`/generate` (Course Generator Studio):**
   - YouTube URL input bar with real-time validation.
   - Build options: Manual transcript override, difficulty preference.
   - Real-time generation progress tracker with streaming Lesson 1 alert.
8. **`/courses/:id` (Course Overview & Curriculum):**
   - Course header: Title, author, duration, difficulty, enroll button / progress bar.
   - Placement test callout banner.
   - Full chapter and lesson curriculum tree with skipped badges and duration.
9. **`/courses/:id/placement-test` (Diagnostic Assessment):**
   - 6-10 question diagnostic test.
   - Instant scoring breakdown with list of mastered topics and bypassed lessons.
10. **`/courses/:id/learn/:lessonId` (Distraction-Free Learning Workspace):**
    - High-performance embedded YouTube IFrame player.
    - Top progress bar and quick navigation (Previous / Next / Mark Complete).
    - Multi-tab utility sidebar:
      - Tab 1: AI Study Notes & Summary.
      - Tab 2: Comprehension Quiz with "Replay the Moment" seeking.
      - Tab 3: Personal Timestamped Notes with jump-to-time pills.
11. **`/planner` (Daily Study Planner):**
    - Study goal selector (30, 60, 90, 120 min).
    - Streak calendar visualization.
    - Day-by-day lesson allocations.
12. **`/notes` (All My Study Notes):**
    - Filterable collection of notes across all courses.
    - Clickable timestamp pills that jump straight to the exact course and player second.
13. **`/roadmaps/new` & `/roadmaps/:id` (Roadmap Builder & Viewer):**
    - Visual stage builder adding and reordering courses.
    - Roadmap progress tracking.
14. **`/settings` (Profile & Preferences):**
    - Profile picture, display name, daily study goal, password reset, account deletion.
15. **`/billing` (Usage & Subscription Management):**
    - Active plan card, monthly hours and build allowance progress meters.
    - Upgrade/downgrade buttons triggering sandbox checkout modal.
    - Invoice history table.

---

### Administrator Control Center Views
16. **`/admin` (Admin Overview):**
    - KPI cards: Total registered users, total courses, generation jobs, active subscribers.
17. **`/admin/users` (User Moderation):**
    - Searchable table of users with role badges, suspension toggle, and usage inspection.
18. **`/admin/courses` (Course Moderation):**
    - Global course table with visibility toggle (Public/Private), delete action, and error log viewer.
19. **`/admin/ai` (AI Provider & Engine Configuration):**
    - Model selection (Nemotron, OpenAI, Local Mock), API key status, temperature, and job execution logs.
20. **`/admin/settings` (Site Branding & Platform Config):**
    - Site title, announcements, feature flags.

