# Functional Requirements

This document enumerates the detailed functional requirements across all subsystems of the application.

---

### 1. Authentication & Account Management (FR-AUTH)
- **FR-AUTH-01:** System shall permit users to register via Email and Password with minimum 8 characters.
- **FR-AUTH-02:** System shall securely hash passwords using bcrypt (cost factor >= 10).
- **FR-AUTH-03:** System shall verify uniqueness of email addresses upon signup.
- **FR-AUTH-04:** System shall issue a secure, HTTP-only JWT session cookie upon valid login.
- **FR-AUTH-05:** System shall support OAuth registration/login paths for Google and GitHub.
- **FR-AUTH-06:** System shall permit users to edit profile information (Display Name, Bio, Avatar).
- **FR-AUTH-07:** System shall allow users to delete their account and cascade-delete personal notes, attempts, and private roadmaps.

---

### 2. YouTube Ingestion & Course Generation (FR-GEN)
- **FR-GEN-01:** System shall accept and validate YouTube video and playlist URLs.
- **FR-GEN-02:** System shall extract YouTube metadata including videoId, title, duration in seconds, author channel, and thumbnail URL.
- **FR-GEN-03:** System shall check whether the YouTube URL has already been generated. If so, link user to the course with zero quota reduction.
- **FR-GEN-04:** System shall verify that the user's monthly generation quota is not exhausted and that total video duration does not exceed their tier limit (Free: 6h, Pro: 10h, Max: 20h).
- **FR-GEN-05:** System shall attempt transcript retrieval. If captions are missing or disabled, provide an alternative text upload fallback.
- **FR-GEN-06:** System shall segment long videos (> 15 minutes) into logical lessons with defined start and end timestamps.
- **FR-GEN-07:** System shall synthesize executive summaries, key concepts, and practical definitions for each generated lesson.
- **FR-GEN-08:** System shall generate 3-5 multiple-choice questions per lesson, including correct answer index, explanation, and video timestamp.
- **FR-GEN-09:** System shall make Lesson 1 available (`READY`) immediately while subsequent lessons generate in the background.

---

### 3. Diagnostic Placement Testing (FR-TEST)
- **FR-TEST-01:** System shall generate 6-10 diagnostic assessment questions covering core topics of the generated course.
- **FR-TEST-02:** System shall compute user score per topic. Topics scoring >= 80% shall have their corresponding lessons marked `SKIPPED`.
- **FR-TEST-03:** System shall display a diagnostic results summary to the user indicating mastered concepts and bypassed lessons.
- **FR-TEST-04:** System shall recalculate the estimated course completion time based solely on non-skipped lessons.
- **FR-TEST-05:** System shall provide a toggle for users to manually unskip/restore any bypassed lesson at any time.

---

### 4. Interactive Video Player & Learning Workspace (FR-PLAY)
- **FR-PLAY-01:** System shall embed the YouTube video using the YouTube IFrame Player API.
- **FR-PLAY-02:** System shall initialize playback at the lesson's `startSeconds` and notify user when `endSeconds` is reached.
- **FR-PLAY-03:** System shall track playback progress and persist `lastWatchedSeconds`.
- **FR-PLAY-04:** System shall display lesson navigation controls ("Previous", "Next", and sidebar drawer with completion indicators).
- **FR-PLAY-05:** System shall provide a toggle to mark the lesson as `COMPLETED`.

---

### 5. Smart Quizzes & "Replay the Moment" (FR-QUIZ)
- **FR-QUIZ-01:** System shall render lesson quizzes with multiple choice options.
- **FR-QUIZ-02:** System shall provide immediate visual feedback upon answer submission (green for correct, red for incorrect).
- **FR-QUIZ-03:** System shall display a written explanation explaining why the answer is correct or incorrect.
- **FR-QUIZ-04:** For incorrect submissions, system shall render a "Replay the Moment" button with the specific timestamp.
- **FR-QUIZ-05:** Clicking "Replay the Moment" shall seek the active YouTube player directly to that second and focus the video player.
- **FR-QUIZ-06:** System shall persist all quiz attempts with score percentage and timestamp.

---

### 6. Timestamped Note-Taking (FR-NOTE)
- **FR-NOTE-01:** System shall allow users to type and save notes during video playback.
- **FR-NOTE-02:** System shall automatically attach the current player playback position (seconds) to the note.
- **FR-NOTE-03:** System shall format timestamps as `MM:SS` or `HH:MM:SS` clickable pills.
- **FR-NOTE-04:** Clicking any timestamp pill shall seek the YouTube video to that precise moment.
- **FR-NOTE-05:** System shall support editing and deleting personal notes.
- **FR-NOTE-06:** System shall provide an aggregated "All My Notes" view on the user dashboard.

---

### 7. Daily Learning Planner & Habit Tracking (FR-PLAN)
- **FR-PLAN-01:** System shall allow users to configure daily study target: 30, 60, 90, or 120 minutes.
- **FR-PLAN-02:** System shall generate an adaptive study schedule allocating lessons into daily learning tasks.
- **FR-PLAN-03:** System shall automatically update the schedule when lessons are completed or skipped.
- **FR-PLAN-04:** System shall increment daily study time upon lesson completion.
- **FR-PLAN-05:** System shall maintain an active streak counter if the user achieves their daily goal on consecutive days.

---

### 8. Course Discovery & Roadmaps (FR-DISC)
- **FR-DISC-01:** System shall provide a searchable and filterable community catalog of public courses.
- **FR-DISC-02:** System shall allow any authenticated user to enroll in any public course free of charge without consuming generation quota.
- **FR-DISC-03:** System shall allow users to create multi-course roadmaps divided into sequential stages.
- **FR-DISC-04:** System shall generate unique shareable links for roadmaps.
- **FR-DISC-05:** System shall track enrolled user roadmap progress independently without modifying creator data.

---

### 9. Subscriptions, Quotas & Sandbox Billing (FR-BILL)
- **FR-BILL-01:** System shall maintain Free, Pro ($19/mo), and Max ($49/mo) plan tiers.
- **FR-BILL-02:** System shall record total video hours generated per user within a rolling 30-day window.
- **FR-BILL-03:** System shall prevent generation if requested video length exceeds the user's tier limit.
- **FR-BILL-04:** System shall provide a sandbox checkout flow allowing users to test upgrades, downgrades, and cancellations.
- **FR-BILL-05:** System shall maintain an immutable invoice and transaction history log.

---

### 10. Admin Control Center (FR-ADM)
- **FR-ADM-01:** System shall restrict `/admin` routes to users with `role: "ADMIN"`.
- **FR-ADM-02:** System shall permit administrators to list, search, filter, and suspend user accounts.
- **FR-ADM-03:** System shall permit administrators to inspect all courses, toggle public/private status, or delete courses.
- **FR-ADM-04:** System shall allow administrators to switch AI providers (Nemotron, OpenAI, Local Mock) and configure model parameters.
- **FR-ADM-05:** System shall display telemetry dashboards featuring total users, active courses, total learning hours, and AI success rates.

