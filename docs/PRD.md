# Product Requirements Document (PRD)
## CourseIt-Style AI-Powered Video Learning Platform

### 1. Executive Summary
The platform is an intelligent, high-retention educational technology SaaS that transforms passive long-form YouTube educational content (single videos and multi-video playlists) into structured, interactive, and personalized online courses.

Unlike static video watchlists or passive transcription tools, the platform engineers a comprehensive active-learning ecosystem comprising:
- AI-driven curriculum structuring and semantic lesson segmentation.
- Streamed lesson availability (learners can start Lesson 1 immediately while the rest generates in background).
- Pre-course personalized placement tests that diagnose prior knowledge and eliminate redundant lessons to save learner time.
- YouTube IFrame-synchronized interactive lesson player with real-time timestamp navigation.
- "Replay the Moment" smart quizzes that automatically seek the video to the precise explanatory timestamp upon incorrect answers.
- Timestamped personal note-taking with interactive playback jump-points.
- Dynamic daily learning planner adapting to 30, 60, 90, or 120-minute daily study schedules.
- Multi-course community roadmaps organized by learning stages.
- Tiered subscription and usage quota governance (Free, Pro, Max) with zero-quota penalty for community course enrollments.
- Comprehensive administrative control panel for platform configuration, user moderation, AI provider management, and business analytics.

---

### 2. Market Opportunity & Problem Statement
#### The Problem:
- **Tutorial Fatigue & Abandonment:** YouTube is the world's largest repository of free education, but learners suffer from passive watching, lack of curriculum structure, and endless 4-to-20 hour uninterrupted videos.
- **Redundant Content:** Learners often waste hours watching introductory sections on concepts they already know.
- **Zero Accountability:** Watching YouTube offers no comprehension checks, note-taking integration, or adaptive pacing.

#### The Solution:
A SaaS learning environment that parses video metadata and audio transcripts, executes multi-tier LLM analysis (supporting NVIDIA Nemotron, OpenAI, and compatible providers), and outputs a structured course with interactive quizzes, timestamp-seekable notes, placement tests, and daily study roadmaps.

---

### 3. Product Vision & Value Proposition
- **For Learners:** Turn overwhelming 10-hour tutorials into bite-sized 15-minute lessons with guaranteed mastery through active recall and instant video review.
- **For Self-Taught Developers & Professionals:** Skip what you know, focus on knowledge gaps, and maintain daily learning streaks.
- **For Creators & Curators:** Package high-value YouTube playlists into shareable learning roadmaps and community courses.

---

### 4. Target Personas
1. **The Career Switcher / Self-Taught Dev:** Needs structured, disciplined progress with measurable daily study goals and active quizzes.
2. **The Time-Constrained Professional:** Has 30–60 minutes daily; wants to take a placement test to bypass known fundamentals and jump directly to advanced topics.
3. **The Lifelong Learner:** Curates playlists on diverse subjects, takes timestamped notes, and builds community roadmaps.
4. **Platform Administrator:** Monitors AI costs, manages API keys and provider models, oversees user accounts, and adjusts subscription tiers.

---

### 5. Core Feature Matrix
| Capability | Free Tier | Pro Tier ($19/mo) | Max Tier ($49/mo) |
| :--- | :--- | :--- | :--- |
| **New Course Generation** | 1 course / month | 5 courses / month | 20 courses / month |
| **Max Video/Playlist Duration** | 6 Hours | 10 Hours | 20 Hours |
| **Total Generation Video Time** | 6 Hours / month | 30 Hours / month | 100 Hours / month |
| **Community Course Access** | Unlimited Free | Unlimited Free | Unlimited Free |
| **Placement Testing** | Yes | Yes | Yes |
| **Replay the Moment Quizzes** | Yes | Yes | Yes |
| **Timestamped Study Notes** | Yes | Yes | Yes |
| **Custom Roadmaps** | Up to 3 | Unlimited | Unlimited |
| **Build Priority** | Standard | High | Highest |
| **Retry Failed Lessons** | No | Yes | Yes |

---

### 6. Success Metrics & KPIs
- **Course Generation Success Rate:** > 98% with automatic retry and error reporting.
- **Time to First Lesson (TTFL):** < 45 seconds for single videos under 2 hours.
- **Active Learning Retention:** Average quiz completion rate > 75% per lesson.
- **Daily Goal Adherence:** Percentage of users maintaining a > 3-day study streak.
- **Community Reuse Efficiency:** Over 60% of active enrollments coming from pre-generated community courses (0 marginal AI cost).

