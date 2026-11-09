# Product Acceptance Criteria

This document defines the strict pass/fail criteria required for every module before final delivery.

---

### Module 1: Authentication & User Management
- [ ] User can sign up with email and password (minimum 8 characters).
- [ ] Duplicate email registration returns a descriptive 400 error.
- [ ] Valid credentials yield an authenticated session; invalid credentials return 401 error.
- [ ] Logout invalidates the session and redirects to login or homepage.
- [ ] User profile updates (display name, daily study goal) persist across page reloads.

---

### Module 2 & 3: YouTube Ingestion & AI Course Generation
- [ ] Valid YouTube video link extracts genuine video ID, title, author, and duration.
- [ ] Duplicate URL redirects to existing course without consuming quota.
- [ ] Quota check blocks generation if monthly allowance is exhausted or video exceeds tier max duration.
- [ ] Long video is split into at least 3 distinct lessons with valid start and end timestamps.
- [ ] Lesson 1 is synthesized and marked `READY` before remaining lessons finish, fulfilling the streaming requirement.
- [ ] Background job records errors gracefully and reports status if video is private or captions unavailable.

---

### Module 4 & 6: Curriculum & Video Player Workspace
- [ ] Curriculum tree displays all chapters and lessons with correct durations.
- [ ] Embedded YouTube player plays the exact video at lesson start timestamp.
- [ ] Player controls allow marking lesson as completed, which updates overall course progress percentage.
- [ ] Navigation buttons ("Next Lesson", "Previous Lesson") function properly.

---

### Module 5: Diagnostic Placement Test
- [ ] Pre-course placement test generates diagnostic questions based on course topics.
- [ ] User submission correctly calculates score percentage.
- [ ] Mastered topics (>= 80%) mark corresponding lessons as `SKIPPED`.
- [ ] Estimated course study duration updates dynamically based on remaining active lessons.
- [ ] User can manually toggle unskip on any lesson.

---

### Module 7: Smart Quiz Engine & "Replay the Moment"
- [ ] Quiz questions render multiple-choice answers for each lesson.
- [ ] Submitting answers displays immediate feedback with green/red status and written explanations.
- [ ] For incorrect answers, "Replay the Moment" button appears with the timestamp.
- [ ] Clicking "Replay the Moment" seeks the YouTube video to that exact timestamp.
- [ ] Quiz attempts and scores persist in the database.

---

### Module 8: Timestamped Study Notes
- [ ] User can write and save a note while video is playing.
- [ ] Current video playback seconds are automatically attached to the note.
- [ ] Clicking a note timestamp seeks the video to that second.
- [ ] User can edit and delete notes.
- [ ] Notes for the user are accessible from the global `/notes` dashboard.

---

### Module 9: Daily Learning Planner
- [ ] User can select 30, 60, 90, or 120 minutes daily goal.
- [ ] Schedule allocates lessons into daily tasks.
- [ ] Completing lessons increments daily minutes and maintains streak.

---

### Module 10 & 11: Community Courses & Roadmaps
- [ ] Public courses appear in community catalog with search and filters.
- [ ] Users can enroll in public courses without consuming generation quota.
- [ ] Users can create multi-course roadmaps with stages.
- [ ] Other users can enroll in public roadmaps with independent progress tracking.

---

### Module 12: Subscriptions & Usage Management
- [ ] Free, Pro ($19), and Max ($49) plans are displayed with accurate limits.
- [ ] Sandbox upgrade flow upgrades user tier and adjusts generation quota instantly.
- [ ] Invoice log reflects subscription events.

---

### Module 13: Administrator Control Center
- [ ] Non-admin users are blocked with 403 Forbidden on `/admin/*`.
- [ ] Admin can view, search, and suspend users.
- [ ] Admin can toggle course public/private status and delete courses.
- [ ] Admin can switch AI provider (Nemotron / OpenAI / Local) and view job logs.
- [ ] Telemetry displays accurate counts from the database.

