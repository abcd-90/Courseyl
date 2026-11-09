# User Journey Maps

This document outlines the detailed end-to-end user journeys across the key workflows of the platform.

---

### Journey 1: New Learner Registration & Onboarding
```mermaid
flowchart TD
    A[Visitor Lands on Homepage] --> B{Account Exists?}
    B -- No --> C[Click 'Get Started' / 'Sign Up']
    C --> D[Enter Name, Email & Password]
    D --> E[Submit Registration]
    E --> F[Create User & Assign Free Tier Plan]
    F --> G[Redirect to Onboarding / Preferences]
    G --> H[Choose Daily Study Goal: 30 / 60 / 90 / 120 min]
    H --> I[Dashboard Landing: Welcome & Quick Action Card]
    B -- Yes --> J[Click 'Log In']
    J --> K[Enter Credentials]
    K --> I
```

---

### Journey 2: YouTube Course Generation (Single Video / Playlist)
```mermaid
flowchart TD
    A[User on Dashboard or Generator Page] --> B[Paste YouTube URL]
    B --> C{URL Valid & Supported?}
    C -- No --> D[Display Validation Error: Invalid YouTube URL]
    C -- Yes --> E{URL Already Generated on Platform?}
    E -- Yes --> F[Display Notice: Course exists! Instant enrollment without using quota]
    F --> G[Redirect to Course Overview]
    E -- No --> H{User Has Remaining Build Quota?}
    H -- No --> I[Show Quota Exceeded Modal with Upgrade Prompt]
    H -- Yes --> J[Extract Video/Playlist Metadata & Transcript]
    J --> K{Transcript Available?}
    K -- No --> L[Prompt for Manual Transcript / Text Input or Fallback Analysis]
    K -- Yes --> M[Initiate AI Pipeline & Background Job]
    M --> N[Generate Course Structure & Lesson 1]
    N --> O[Stream Lesson 1: Marked READY for instant learning]
    O --> P[Background Worker Finishes Remaining Lessons & Quizzes]
    P --> Q[Course Status updated to COMPLETED]
```

---

### Journey 3: Diagnostic Placement Test & Adaptive Curriculum
```mermaid
flowchart TD
    A[User Enrolls in Course] --> B[Course Overview Displays 'Take Placement Test' Banner]
    B --> C[User Clicks 'Start Placement Test']
    C --> D[Modal Displays 6-10 Diagnostic Concept Questions]
    D --> E[User Selects Answers & Submits Test]
    E --> F[Backend Evaluates Knowledge Areas]
    F --> G{Topics Scored >= 80%?}
    G -- Yes --> H[Mark Corresponding Lessons as SKIPPED]
    G -- No --> I[Keep All Lessons as Active]
    H --> J[Display Score Breakdown & List of Skipped Lessons]
    I --> J
    J --> K[Recalculate Estimated Study Time]
    K --> L[User Can Manually Toggle Unskip on Any Lesson at Any Time]
```

---

### Journey 4: Distraction-Free Lesson Player & "Replay the Moment"
```mermaid
flowchart TD
    A[User Opens Lesson] --> B[Embedded YouTube Player Loads Video at Lesson startSeconds]
    B --> C[User Watches Lesson]
    C --> D[User Types Note at 03:45 -> Clicks 'Add Note']
    D --> E[Note Saved with 03:45 Timestamp Pill]
    E --> F[Clicking Note Pill Seeks Video directly to 03:45]
    C --> G[User Finishes Video & Opens Quiz Tab]
    G --> H[User Submits Answer to Question 1]
    H --> I{Answer Correct?}
    I -- Yes --> J[Green Checkmark + Success Explanation + Score Updated]
    I -- No --> K[Red X + Explanation + 'Replay the Moment' Button]
    K --> L[User Clicks 'Replay the Moment']
    L --> M[YouTube Player Seeks to Concept Timestamp e.g. 02:18]
    M --> N[User Reviews Concept & Retakes Question]
```

---

### Journey 5: Daily Study Planner & Streaks
```mermaid
flowchart TD
    A[User Configures Daily Study Time: e.g. 60 Min] --> B[System Distributes Active Lessons into Daily Schedule]
    B --> C[User Logs In Today]
    C --> D[Dashboard Displays Today's Study Tasks]
    D --> E[User Completes Today's Scheduled Lessons]
    E --> F[Increment Daily Study Minutes]
    F --> G{Daily Goal Met?}
    G -- Yes --> H[Update Learning Streak +1 Fire Badge]
    G -- No --> I[Display Remaining Minutes Needed]
```

---

### Journey 6: Community Course Discovery & Roadmaps
```mermaid
flowchart TD
    A[User Navigates to Community Catalog] --> B[Search / Filter by Topic, Difficulty, Duration]
    B --> C[Select Course -> View Course Detail Page]
    C --> D[Click 'Enroll Free' -> Instant Enrollment without Generation Quota]
    D --> E[Course Added to User's Active Dashboard]
    E --> F[User Navigates to Roadmaps Section]
    F --> G[Click 'Create Roadmap' -> Add Stages e.g. Basics -> Advanced]
    G --> H[Attach Enrolled or Public Courses to Stages]
    H --> I[Publish Roadmap -> Generate Unique Shareable URL]
    I --> J[Other Learners Open Link & Enroll Independently]
```

---

### Journey 7: Subscription Upgrades & Billing Governance
```mermaid
flowchart TD
    A[Free User Approaches Limits or Clicks 'Upgrade'] --> B[Billing Page Displays Free, Pro ($19), Max ($49)]
    B --> C[User Selects Plan & Billing Frequency: Monthly / Yearly]
    C --> D[Sandbox Checkout Interface Launches]
    D --> E[User Confirms Upgrade Simulation]
    E --> F[Update User Subscription Tier & Reset Monthly Quota]
    F --> G[New Limits Reflected on Dashboard Instantly]
```

---

### Journey 8: Platform Administration
```mermaid
flowchart TD
    A[Admin Logs In & Navigates to /admin] --> B[Admin Dashboard Displays Key Metrics]
    B --> C[Manage Users: Search, Suspend, Change Roles]
    B --> D[Manage Courses: Inspect Status, Delete, Toggle Public/Private]
    B --> E[Manage AI Config: Select Nemotron / OpenAI, Adjust Parameters]
    B --> F[Inspect AI Job Logs: Monitor Duration, Retries, Failures]
    B --> G[Platform Settings: Edit Branding, Announcements, Pricing]
```

