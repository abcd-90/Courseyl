import React from "react";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { CourseItFooter } from "@/components/CourseItFooter";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfa] text-[#0f1611]">
      <MarketingNavbar />

      <main className="flex-1 max-w-3xl mx-auto px-6 pt-36 pb-24">
        <span className="text-xs font-mono uppercase tracking-wider text-[#4c4c3d]">Last updated November 2026</span>
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-[#0f1611] tracking-tight mt-2">
          Privacy <em className="italic text-[#4b5e1e] font-serif">policy.</em>
        </h1>

        <div className="mt-8 space-y-6 text-[#4c4c3d] text-base leading-relaxed">
          <p>
            This policy explains what CourseIt collects when you use it, why, who it is shared with, and how you can
            see, change or delete it.
          </p>

          <h2 className="text-xl font-display font-semibold text-[#0f1611] pt-4">1. Who we are</h2>
          <p>
            CourseIt (&ldquo;we&rdquo;, &ldquo;us&rdquo;) turns YouTube videos and playlists into structured courses
            with lessons, quizzes and a study plan. CourseIt is operated by Triggerfy Services. You can reach us at{" "}
            <a href="mailto:hello@triggerfy.xyz" className="text-[#4b5e1e] underline">
              hello@triggerfy.xyz
            </a>
            .
          </p>

          <h2 className="text-xl font-display font-semibold text-[#0f1611] pt-4">2. Information we collect</h2>
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

          <h2 className="text-xl font-display font-semibold text-[#0f1611] pt-4">3. Data protection and deletion</h2>
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

