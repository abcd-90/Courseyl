# User Roles and Permissions

This document specifies the Role-Based Access Control (RBAC) architecture, permissions matrix, and route guards implemented across the platform.

---

### 1. User Roles
The platform defines two primary system roles and three subscription status tiers:

1. **`USER` (Default Registered Member):**
   - Learner who can generate courses (within subscription limits), take courses, take placement tests, save notes, take quizzes, create roadmaps, and manage their own profile and billing.
2. **`ADMIN` (Platform Administrator):**
   - Superuser who possesses all `USER` rights plus full platform oversight: managing all user accounts, reviewing all courses, moderating content, configuring AI providers and models, inspecting system logs, and adjusting platform configurations.

---

### 2. Permissions Matrix

| Resource / Action | Anonymous Visitor | Free Tier User | Pro Tier User | Max Tier User | Administrator |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Browse Public Courses** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Course Detail Page** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Browse Public Roadmaps** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Pricing Page** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Enroll in Public Courses** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Generate New Course (YouTube)** | ❌ | ✅ (1/mo, max 6h) | ✅ (5/mo, max 10h) | ✅ (20/mo, max 20h) | ✅ (Unlimited) |
| **Retry Failed Lessons** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Take Placement Test** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Watch Interactive Player** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Create Timestamped Notes** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Attempt Quizzes & "Replay"** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Configure Daily Study Plan** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Create Custom Roadmaps** | ❌ | ✅ (Max 3) | ✅ (Unlimited) | ✅ (Unlimited) | ✅ (Unlimited) |
| **Upgrade / Manage Subscription**| ❌ | ✅ | ✅ | ✅ | ✅ |
| **View Admin Dashboard** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Manage / Suspend Users** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Delete Any Course** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Configure AI Providers** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Inspect System Logs** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Edit Platform Settings** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

### 3. Route Guard & Authorization Architecture
- **Public Routes:**
  - `/` (Landing page)
  - `/community` (Course directory)
  - `/roadmaps` (Roadmap catalog)
  - `/pricing` (Pricing & plan comparison)
  - `/login`, `/register` (Authentication)
- **Protected User Routes (Require Authenticated Session):**
  - `/dashboard` (Personal learning center)
  - `/generate` (New course creator)
  - `/courses/:id` (Enrolled course overview)
  - `/courses/:id/learn/:lessonId` (Distraction-free player & quiz workspace)
  - `/courses/:id/placement-test` (Diagnostic placement assessment)
  - `/notes` (Aggregated timestamped notes)
  - `/planner` (Daily study schedule & streak management)
  - `/roadmaps/new` (Custom roadmap builder)
  - `/settings` (Profile & learning preferences)
  - `/billing` (Subscription & usage meters)
- **Protected Admin Routes (Require Role == `ADMIN`):**
  - `/admin` (Admin overview & KPIs)
  - `/admin/users` (User moderation & role assignment)
  - `/admin/courses` (Course moderation & error inspection)
  - `/admin/ai` (AI provider settings & logs)
  - `/admin/settings` (Global platform settings & branding)

