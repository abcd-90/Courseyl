import React from "react";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { CourseItFooter } from "@/components/CourseItFooter";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <MarketingNavbar />

      <main className="flex-1 max-w-3xl mx-auto px-6 pt-36 pb-24">
        <span className="text-xs font-mono uppercase tracking-wider text-ink-soft">Last updated November 2026</span>
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-ink tracking-tight mt-2">
          Privacy <em className="italic text-moss font-serif">policy.</em>
        </h1>

        <div className="mt-8 space-y-6 text-ink-soft text-base leading-relaxed">
          <p>
            This policy explains what Courseyl collects when you use it, why, who it is shared with, and how you can
            see, change or delete it.
          </p>

          <h2 className="text-xl font-display font-semibold text-ink pt-4">1. Who we are</h2>
          <p>
            Courseyl (&ldquo;we&rdquo;, &ldquo;us&rdquo;) turns YouTube videos and playlists into structured courses
            with lessons, quizzes and a study plan. You can reach us at{" "}
            <a href="mailto:thecourseyl@gmail.com" className="text-moss underline">
              thecourseyl@gmail.com
            </a>
            .
          </p>

          <h2 className="text-xl font-display font-semibold text-ink pt-4">2. Information we collect</h2>
          <p>
            <strong>Account details:</strong> When you sign in, we store your profile identifier, email address, name,
            and avatar. We never sell your personal data.
          </p>
          <p>
            <strong>What you add:</strong> The YouTube links you turn into courses, your notes, quiz answers, chosen
            pace, and study progress.
          </p>
          <p>
            <strong>YouTube data:</strong> For the videos you add, we use public metadata (titles, channel names,
            durations, chapters, thumbnails and captions). Videos play in YouTube&apos;s own player, so creators retain
            their views.
          </p>

          <h2 className="text-xl font-display font-semibold text-ink pt-4">3. Data protection and deletion</h2>
          <p>
            You can delete your account or any course you have generated at any time directly from Settings. We believe
            in total learner sovereignty.
          </p>
        </div>
      </main>

      <CourseItFooter />
    </div>
  );
}

