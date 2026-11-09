# API Endpoint Specification

This document specifies the RESTful endpoints for the CourseIt-Style platform.

---

### Authentication (`/api/auth/*`)
- **`POST /api/auth/register`**
  - Body: `{ email, password, name }`
  - Response: `{ user: { id, email, role, profile }, token }`
- **`POST /api/auth/login`**
  - Body: `{ email, password }`
  - Response: `{ user: { id, email, role, profile }, token }`
- **`POST /api/auth/logout`**
  - Response: `{ success: true }`
- **`GET /api/auth/me`**
  - Headers: Cookie session / Authorization
  - Response: `{ user, profile, subscription }`

---

### Courses & Generation (`/api/courses/*`)
- **`GET /api/courses`**
  - Query: `?search=&category=&difficulty=&page=1&limit=12`
  - Response: `{ courses: Course[], total: number }`
- **`POST /api/courses/generate`**
  - Body: `{ url: string, manualTranscript?: string }`
  - Response: `{ courseId: string, jobId: string, status: string, message: string }`
- **`GET /api/courses/:id`**
  - Response: `{ course: CourseWithChaptersAndLessons, userEnrollment?: Enrollment }`
- **`POST /api/courses/:id/enroll`**
  - Response: `{ enrollment: Enrollment }`
- **`GET /api/courses/:id/jobs/:jobId`**
  - Response: `{ job: GenerationJob, readyLessons: Lesson[] }`

---

### Placement Testing (`/api/courses/:id/placement-test`)
- **`GET /api/courses/:id/placement-test`**
  - Response: `{ questions: PlacementQuestion[] }`
- **`POST /api/courses/:id/placement-test/submit`**
  - Body: `{ answers: { questionId: string, selectedOption: number }[] }`
  - Response: `{ scorePercentage: number, skippedLessonIds: string[], masteredTopics: string[] }`
- **`POST /api/courses/:id/lessons/:lessonId/toggle-skip`**
  - Body: `{ isSkipped: boolean }`
  - Response: `{ success: true, isSkipped: boolean }`

---

### Learning Workspace, Notes & Quizzes (`/api/lessons/*`)
- **`GET /api/lessons/:id`**
  - Response: `{ lesson, notes: StudyNote[], quizQuestions: QuizQuestion[], progress: LessonProgress }`
- **`POST /api/lessons/:id/progress`**
  - Body: `{ isCompleted: boolean, lastPlaybackSeconds: number }`
  - Response: `{ progress: LessonProgress, courseProgressPercentage: number }`
- **`POST /api/lessons/:id/notes`**
  - Body: `{ timestampSeconds: number, content: string }`
  - Response: `{ note: StudyNote }`
- **`DELETE /api/lessons/:id/notes/:noteId`**
  - Response: `{ success: true }`
- **`POST /api/lessons/:id/quiz/submit`**
  - Body: `{ answers: { questionId: string, selectedOption: number }[] }`
  - Response: `{ score: number, results: { questionId: string, isCorrect: boolean, explanation: string, replayTimestamp: number }[] }`

---

### Daily Planner & Notes Aggregation
- **`GET /api/planner`**
  - Response: `{ targetMinutes: number, streakDays: number, dailyTasks: ScheduledLesson[] }`
- **`PUT /api/planner/goal`**
  - Body: `{ dailyStudyMinutes: number }`
  - Response: `{ success: true, dailyStudyMinutes: number }`
- **`GET /api/notes`**
  - Response: `{ notes: (StudyNote & { lesson: { title, course: { id, title } } })[] }`

---

### Roadmaps (`/api/roadmaps/*`)
- **`GET /api/roadmaps`**
  - Response: `{ roadmaps: Roadmap[] }`
- **`POST /api/roadmaps`**
  - Body: `{ title, description, stages: { title, courseIds: string[] }[] }`
  - Response: `{ roadmap: Roadmap }`
- **`GET /api/roadmaps/:id`**
  - Response: `{ roadmap: RoadmapWithStages, userProgress: number }`
- **`POST /api/roadmaps/:id/enroll`**
  - Response: `{ success: true }`

---

### Subscriptions & Billing (`/api/billing/*`)
- **`GET /api/billing`**
  - Response: `{ subscription: Subscription, usage: { coursesUsed, hoursUsed, hoursLimit } }`
- **`POST /api/billing/checkout`**
  - Body: `{ tier: "PRO" | "MAX", billingCycle: "MONTHLY" | "YEARLY" }`
  - Response: `{ success: true, subscription: Subscription }`
- **`POST /api/billing/cancel`**
  - Response: `{ success: true }`

---

### Admin (`/api/admin/*`)
- **`GET /api/admin/metrics`**
  - Response: `{ totalUsers, totalCourses, totalHours, aiJobsCount, successRate }`
- **`GET /api/admin/users`**
  - Response: `{ users: UserWithProfile[] }`
- **`PATCH /api/admin/users/:id`**
  - Body: `{ role?: string, isSuspended?: boolean }`
- **`GET /api/admin/courses`**
  - Response: `{ courses: Course[] }`
- **`DELETE /api/admin/courses/:id`**
  - Response: `{ success: true }`
- **`GET /api/admin/ai-config`**
  - Response: `{ provider, model, maxTokens }`
- **`POST /api/admin/ai-config`**
  - Body: `{ provider, model, maxTokens }`

