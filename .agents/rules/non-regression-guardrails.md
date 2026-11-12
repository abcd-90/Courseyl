---
trigger: always_on
---

# Courseyl Production Non-Regression Guardrails

This codebase serves production learners. Whenever modifying features, UI, or backend pipelines, **NEVER break or regress** these verified invariants:

1. **Course-Specific Video Playback:**
   - Every generated and curated lesson in `/learn/[lessonId]` and `/api/lessons/[id]` MUST resolve and play that specific course's `lesson.youtubeVideoId` or `course.source.youtubeId` — never fall back to another course's hardcoded video ID unless the ID is invalid or in the broken-ID blocklist.

2. **Clean, Non-Broken Thumbnails:**
   - Always normalize rendered thumbnails through `getCleanThumbnailUrl()` (`src/lib/thumbnail.ts`), preserving verified `hqdefault`/`maxresdefault` URLs and avoiding broken placeholder video IDs across `Dashboard`, `Community`, `AppSidebar` Recents, `Courses`, and `Admin Studio`.

3. **Full Video Duration Distribution:**
   - Multi-hour YouTube videos (including 15h–24h+ marathons) MUST partition chapters and lessons proportionally across the video's full `totalDurationSeconds` (`src/lib/ai/courseGenerator.ts`), never capped to short 1-hour windows or truncating later timestamps.

4. **User Profile Full Name Sync:**
   - Updating `displayName` in `/settings` must immediately update `/api/auth/me` and broadcast `"user-updated"` so `AppSidebar` and `/dashboard` reflect the updated full name without stale email prefixes.

5. **Fixed Left Sidebar Layout:**
   - Keep `AppSidebar` fixed/sticky on desktop (`lg:h-screen lg:sticky lg:top-0`) so navigation, Recents, and quota controls stay pinned while main page content scrolls.

6. **Hero Demo Video Integrity:**
   - Keep `public/video/product-demo-video.mp4` and its poster `/video/product-demo-poster.jpg` intact and playing cleanly in `/` Section 2 (`tour`).

7. **Live Community Sync:**
   - `/community` and `/` Popular Courses must fetch live `/api/courses` with `cache: "no-store"` so newly published or edited courses appear immediately.

8. **Database Connection Pooling & Admin Security:**
   - Keep Supabase pooler (`DATABASE_URL` / `@/lib/db`) usage efficient without leaking transactions on long serverless runs.
   - Keep `/admin` blocked (`notFound()` 404 decoy) and require `user.role === "ADMIN"` on all `/studio-hub` & `/api/admin/*` endpoints.
   - Preserve Admin Studio's safe user deletion pipeline (`DELETE /api/admin/users` blocking self-delete & last-admin delete while purging both `User` and `AuthVerificationToken` rows in a transaction).

9. **Verification Before Pushing:**
   - Run `npm run build` (`prisma generate && next build`) and confirm zero TypeScript or Next.js build errors after edits.

10. **Simple & Authentic Auth Surface (Google OAuth + Verified Email Only):**
    - Keep authentication strictly scoped to **Google OAuth** and **Verified Email** (`Continue with Google` + `Continue with Email`) — never re-add unrequested third-party OAuth clutter (such as GitHub or X buttons/routes) onto `/login` or `/studio-hub`.
    - NEVER conditionally hide or break the `/login` **`Sign in` | `Create account`** (`Full name`, `Email address`, `Set password`) workflow behind `allowNewSignups` or plan flag changes; keep both tabs permanently visible (showing a notice inside `Create account` if signups are intentionally paused) and require confirmation in `/studio-hub` before pausing `allowNewSignups`.
    - NEVER couple the post-verification redirect (`window.location.assign(destination)`) inside the `/api/auth/email/status` polling `useEffect` whose cleanup (`[step, verifySynced]`) sets `cancelled = true`; always run redirect timers in a dedicated `useEffect([verifySynced])` so cross-device verification reliably lands on `/dashboard` without getting stuck on `"Redirecting to dashboard…"`.
    - NEVER issue a `courseit_session` cookie or mark a user `emailVerified: true` on raw `/api/auth/email` or `/api/auth/register` submissions before inbox ownership is proven.
    - Enforce syntax, typo/dummy/disposable blocking, and live DNS MX validation (`validateRealEmailAddress`) before dispatching any verification link via custom SMTP/Resend or Supabase fallback.
    - Require `bcrypt` password verification on `/api/auth/login` (`403` for unverified users), verify `accessToken` server-side on `/api/auth/social`, enforce CSRF `state` nonces on Google OAuth, and preserve zero-OTP 1-click verification + cross-device session sync (`courseyl_pending_verify` + `/api/auth/email/status` atomic claim) so both the clicking device and the waiting `/login` tab open `/dashboard` automatically.

11. **Light & Dark Mode Glassmorphism Auth UI Consistency:**
    - Never hardcode single-mode dark backgrounds (`bg-[#0e1311]`) or single-theme text colors on `/login`, `/register`, `/auth/callback`, `/privacy`, or `/terms`.
    - Keep `/login` (both Sign-In, Email view, and `Check your inbox.` states) synchronized with the live `MarketingNavbar` theme switch (`dark:` Tailwind variants + sunrise/starlight `LandscapeIllustration` backdrop) using crystal translucent frosted glassmorphism (`bg-white/25` / `dark:bg-[#0e1722]/45`, `backdrop-blur-xl`, sheer frosted pill buttons) without top-navbar overlap, and accessible `bg-paper text-ink` surfaces on legal/auth helper pages.

12. **Curriculum-Grounded Placement Test Integrity & Strict Option Deduplication:**
    - Placement tests must NEVER emit generic filler or template boilerplates ("core architectural objective", "an anti-pattern that bypasses input checks", "deprecated legacy syntax", "purely cosmetic label", etc.).
    - Every question within a placement test MUST have 100% unique, non-repeating options across the entire test set — NEVER reuse the same distractors or answer options across multiple questions.
    - Question and option text must be clean plain text without literal markdown bold markers (`**...**` or `__...__`).
    - Database-persisted placement questions must pass `hasLowQualityPlacementSet()`; any low-quality set must dynamically regenerate on the fly without breaking user test submission.

13. **ReDoS-Safe YouTube Metadata & Chapter Ingestion:**
    - YouTube description parsing in `parseChaptersFromDescription` (`src/lib/youtube.ts`) must NEVER use nested regex quantifiers or vulnerable exponential backtracking patterns on divider lines (e.g. `---...---`).
    - Video metadata extraction must resolve cleanly and quickly (< 3 seconds) without blocking generation or stalling the live build pipeline at 15%.

14. **Production Workflow & Feature Lock:**
    - All existing learning flows, quiz modal UX, watch telemetry (`POST /api/watch`), study notes, course generator pipeline, user deletion cascade, home page course layout, lesson player day bins, placement test engine, and dashboard metrics are verified and LOCKED.
    - NEVER alter, refactor, or touch these stable workflows or files unless the user explicitly asks for a specific change.
