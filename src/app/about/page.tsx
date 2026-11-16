import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { CourseItFooter } from "@/components/CourseItFooter";
import { Sparkles, CheckCircle2, ShieldCheck, Mail, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About Courseyl — Transforming YouTube into Interactive Courses",
  description:
    "Courseyl transforms YouTube videos and playlists into structured courses with diagnostic placement tests, smart timestamped notes, active recall quizzes, and personalized pacing.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Courseyl — The Smartest Way to Learn from YouTube",
    description:
      "Learn how Courseyl empowers students and professionals with adaptive placement tests, timestamped notes, and smart quizzes.",
    url: "https://www.courseyl.online/about",
  },
};

export default function AboutPage() {
  const features = [
    {
      title: "Diagnostic Placement Tests",
      desc: "Analyze full course curricula and skip lessons you already understand, saving dozens of hours.",
    },
    {
      title: "15h–24h+ Marathon Video Support",
      desc: "Even mammoth developer and academic lectures get divided proportionally with full chapter precision.",
    },
    {
      title: "Timestamped Notes & Smart Video Jump",
      desc: "Cloud-synced study notes pinned to exact video seconds for rapid concept revision.",
    },
    {
      title: "Smart Quiz Replay",
      desc: "Active recall quizzes that instantly jump you to the exact video timestamp when you need clarity.",
    },
    {
      title: "Distraction-Free Learning Space",
      desc: "Focus purely on content without YouTube algorithm traps, recommendations, or comment drama.",
    },
    {
      title: "Community Course Sharing",
      desc: "Explore public community courses curated by learners worldwide or share your own.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfa] dark:bg-[#0a0f0c] text-[#0f1611] dark:text-[#f1f3ea] transition-colors">
      <MarketingNavbar />

      <main className="flex-1 max-w-4xl mx-auto px-6 pt-36 pb-24 w-full">
        {/* Hero */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#4b5e1e]/10 text-[#4b5e1e] dark:bg-[#4b5e1e]/20 dark:text-[#a3b86c]">
            <Sparkles className="w-3.5 h-3.5" />
            Our Mission & Story
          </div>

          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight text-[#0f1611] dark:text-white">
            About <span className="text-[#4b5e1e] dark:text-[#a3b86c]">Courseyl</span>
          </h1>

          <p className="text-lg sm:text-xl text-[#4c4c3d] dark:text-[#a9aba0] leading-relaxed pt-2">
            The best teachers in the world share knowledge freely on YouTube. But long videos often lack structure:
            no study plan, no diagnostic checks, and no way to prove you actually understood.
            <strong> Courseyl</strong> turns those videos into complete, interactive courses.
          </p>
        </div>

        {/* Core Features Grid */}
        <div className="mt-12">
          <h2 className="text-2xl font-display font-bold text-[#0f1611] dark:text-white mb-6">
            Engineered for Deep Learning
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-[#141b16]/60 backdrop-blur-sm"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#4b5e1e] dark:text-[#a3b86c] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-base text-[#0f1611] dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#4c4c3d] dark:text-[#a9aba0] mt-1 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Who is building it */}
        <div className="mt-14 p-8 rounded-3xl border border-black/5 dark:border-white/10 bg-gradient-to-br from-[#4b5e1e]/5 to-transparent dark:from-[#4b5e1e]/15 dark:to-transparent">
          <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-[#4b5e1e] dark:text-[#a3b86c] mb-2">
            <ShieldCheck className="w-4 h-4" />
            Verified & Dedicated Team
          </div>
          <h2 className="text-2xl font-display font-bold text-[#0f1611] dark:text-white">
            Who is behind Courseyl?
          </h2>
          <div className="mt-4 space-y-3 text-base text-[#4c4c3d] dark:text-[#a9aba0] leading-relaxed">
            <p>
              Courseyl was founded and is actively developed by <strong>Mr. Sami</strong> and an independent team of
              software engineers and passionate educators.
            </p>
            <p>
              We built Courseyl out of frustration with saving 10-hour tutorial marathons to &ldquo;Watch Later&rdquo; and
              getting distracted by YouTube&apos;s recommendations after twenty minutes. We believe that self-paced learners
              deserve the structure of premier university courses — without having to pay hundreds of dollars for gated platforms.
            </p>
            <p>
              Videos on Courseyl play via the official YouTube embedded player, ensuring original creators receive their full
              views and attribution.
            </p>
          </div>
        </div>

        {/* Contact and Call to action */}
        <div className="mt-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/5">
          <div>
            <h3 className="font-semibold text-base text-[#0f1611] dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#4b5e1e] dark:text-[#a3b86c]" />
              Need to get in touch?
            </h3>
            <p className="text-sm text-[#4c4c3d] dark:text-[#a9aba0] mt-1">
              Have questions or feedback? Reach out to our team at{" "}
              <a
                href="mailto:thecourseyl@gmail.com"
                className="text-[#4b5e1e] dark:text-[#a3b86c] underline underline-offset-4 font-medium"
              >
                thecourseyl@gmail.com
              </a>
              .
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#4b5e1e] hover:bg-[#3d4d18] text-white font-medium text-sm transition-all shadow-sm shrink-0"
          >
            Start Learning
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <CourseItFooter />
    </div>
  );
}
