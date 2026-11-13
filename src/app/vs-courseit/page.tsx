import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { CourseItFooter } from "@/components/CourseItFooter";
import { Check, X, ArrowRight, Sparkles, Zap, ShieldCheck, PlayCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "CourseIt Alternative — Why Courseyl is the #1 Choice for Learning from YouTube",
  description:
    "Comparing CourseIt vs Courseyl? See why learners choose Courseyl for unlimited multi-hour marathon videos, smart placement tests, interactive notes, and zero paywalls.",
  keywords: [
    "CourseIt",
    "courseit.xyz",
    "CourseIt alternative",
    "CourseIt vs Courseyl",
    "Courseyl vs CourseIt",
    "best CourseIt alternative",
    "YouTube to course converter",
    "free AI course generator",
  ],
  alternates: {
    canonical: "/vs-courseit",
  },
  openGraph: {
    title: "CourseIt Alternative — Why Courseyl is the #1 Choice",
    description:
      "Looking for a CourseIt alternative? Compare Courseyl vs CourseIt and see why learners switch.",
    url: "https://courseyl.online/vs-courseit",
  },
};

export default function VsCourseItPage() {
  const comparisonItems = [
    {
      feature: "Full Video Duration Distribution",
      courseyl: "Supports 15h–24h+ marathon YouTube videos with full chapter distribution",
      courseit: "Capped to shorter 1-hour durations or truncated chapters",
      highlight: true,
    },
    {
      feature: "Curriculum-Grounded Placement Tests",
      courseyl: "Adaptive tests with 100% deduplicated options & smart lesson skipping",
      courseit: "Basic quiz questions without deep deduplication",
      highlight: true,
    },
    {
      feature: "Paced Daily Learning Plans",
      courseyl: "Customizable daily study pace (30m, 60m, 90m, 120m) with day bins",
      courseit: "Fixed pacing structures",
      highlight: false,
    },
    {
      feature: "Integrated Study Notes & Progress Tracking",
      courseyl: "Per-lesson rich markdown notes with automatic cloud sync",
      courseit: "Basic text notes",
      highlight: false,
    },
    {
      feature: "Light & Dark Mode Glassmorphism",
      courseyl: "Refined theme switcher with signature frosted glassmorphism",
      courseit: "Single-theme interface",
      highlight: false,
    },
    {
      feature: "Free Community Access & Course Discovery",
      courseyl: "100% free community sharing and public course enrollment",
      courseit: "Strict limits on course exploration",
      highlight: true,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfa] dark:bg-[#0a0f0c] text-[#0f1611] dark:text-[#f1f3ea] transition-colors">
      <MarketingNavbar />

      <main className="flex-1 max-w-5xl mx-auto px-6 pt-36 pb-24 w-full">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#4b5e1e]/10 text-[#4b5e1e] dark:bg-[#4b5e1e]/20 dark:text-[#a3b86c]">
            <Sparkles className="w-3.5 h-3.5" />
            The Modern Alternative to CourseIt
          </div>

          <h1 className="text-4xl sm:text-6xl font-display font-bold tracking-tight text-[#0f1611] dark:text-white">
            Looking for a{" "}
            <span className="text-[#4b5e1e] dark:text-[#a3b86c]">CourseIt</span>{" "}
            alternative?
          </h1>

          <p className="text-lg sm:text-xl text-[#4c4c3d] dark:text-[#a9aba0] leading-relaxed pt-2">
            Meet <strong>Courseyl</strong> — designed from the ground up to turn multi-hour YouTube videos into
            structured interactive courses with placement tests, bite-sized lessons, and zero artificial limits.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#4b5e1e] hover:bg-[#3d4d18] text-white font-medium text-base shadow-sm transition-all hover:scale-[1.02]"
            >
              Start Learning on Courseyl
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-[#0f1611]/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 font-medium text-base transition-colors"
            >
              Explore Public Courses
            </Link>
          </div>
        </div>

        {/* Comparison Matrix Table */}
        <section className="mt-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-display font-bold tracking-tight text-[#0f1611] dark:text-white">
              Courseyl vs CourseIt at a Glance
            </h2>
            <p className="text-sm text-[#4c4c3d] dark:text-[#a9aba0] mt-1">
              See how Courseyl gives you more control, better video partitioning, and higher quality tests.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#0f1611]/10 dark:border-white/10 shadow-sm bg-white dark:bg-[#111714]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#0f1611]/10 dark:border-white/10 bg-[#f6f8ec] dark:bg-[#17201b]">
                  <th className="py-4 px-6 text-sm font-semibold text-[#0f1611] dark:text-white w-2/5">
                    Feature & Capability
                  </th>
                  <th className="py-4 px-6 text-sm font-semibold text-[#4b5e1e] dark:text-[#a3b86c] w-3/10">
                    Courseyl (courseyl.online)
                  </th>
                  <th className="py-4 px-6 text-sm font-semibold text-[#737368] dark:text-[#8d9082] w-3/10">
                    CourseIt (courseit.xyz)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0f1611]/5 dark:divide-white/5 text-sm">
                {comparisonItems.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] ${
                      item.highlight ? "bg-[#4b5e1e]/[0.02] dark:bg-[#4b5e1e]/[0.05]" : ""
                    }`}
                  >
                    <td className="py-4 px-6 font-medium text-[#0f1611] dark:text-white">
                      {item.feature}
                    </td>
                    <td className="py-4 px-6 text-[#0f1611] dark:text-[#e4e6dc] font-medium">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#4b5e1e] shrink-0 mt-0.5" />
                        <span>{item.courseyl}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[#737368] dark:text-[#8d9082]">
                      <div className="flex items-start gap-2">
                        <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <span>{item.courseit}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 3 Value Pillars */}
        <section className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl border border-[#0f1611]/10 dark:border-white/10 bg-white/70 dark:bg-[#111714]/70 backdrop-blur-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#4b5e1e]/10 text-[#4b5e1e] dark:bg-[#4b5e1e]/20 dark:text-[#a3b86c] flex items-center justify-center">
              <PlayCircle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-display font-semibold text-[#0f1611] dark:text-white">
              24-Hour Marathon Handling
            </h3>
            <p className="text-sm text-[#4c4c3d] dark:text-[#a9aba0] leading-relaxed">
              Don&apos;t get cut off after 60 minutes. Courseyl mathematically distributes multi-hour deep-dive coding
              and science marathons across their complete duration.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[#0f1611]/10 dark:border-white/10 bg-white/70 dark:bg-[#111714]/70 backdrop-blur-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#4b5e1e]/10 text-[#4b5e1e] dark:bg-[#4b5e1e]/20 dark:text-[#a3b86c] flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-display font-semibold text-[#0f1611] dark:text-white">
              Smart Placement Testing
            </h3>
            <p className="text-sm text-[#4c4c3d] dark:text-[#a9aba0] leading-relaxed">
              Already know JavaScript basics or Python loops? Take a quick placement test with 100% unique options and
              skip straight to what you need to learn.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[#0f1611]/10 dark:border-white/10 bg-white/70 dark:bg-[#111714]/70 backdrop-blur-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#4b5e1e]/10 text-[#4b5e1e] dark:bg-[#4b5e1e]/20 dark:text-[#a3b86c] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-display font-semibold text-[#0f1611] dark:text-white">
              Zero Distraction Experience
            </h3>
            <p className="text-sm text-[#4c4c3d] dark:text-[#a9aba0] leading-relaxed">
              Learn without rabbit holes, algorithmic clickbait, or distracting comment sections. Pure structured focus
              directly inside YouTube&apos;s clean player.
            </p>
          </div>
        </section>

        {/* FAQs */}
        <section className="mt-20 max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-display font-bold text-center text-[#0f1611] dark:text-white">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4 pt-4">
            <div className="p-5 rounded-xl border border-[#0f1611]/10 dark:border-white/10 bg-white dark:bg-[#111714]">
              <h4 className="font-semibold text-base text-[#0f1611] dark:text-white">
                Is Courseyl free compared to CourseIt?
              </h4>
              <p className="text-sm text-[#4c4c3d] dark:text-[#a9aba0] mt-1.5 leading-relaxed">
                Yes! Courseyl allows you to browse, join, and learn from all community-built courses 100% free with no
                credit card required.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-[#0f1611]/10 dark:border-white/10 bg-white dark:bg-[#111714]">
              <h4 className="font-semibold text-base text-[#0f1611] dark:text-white">
                Can I convert long YouTube videos that CourseIt struggles with?
              </h4>
              <p className="text-sm text-[#4c4c3d] dark:text-[#a9aba0] mt-1.5 leading-relaxed">
                Absolutely. Courseyl is specially optimized to handle lengthy marathons up to 24+ hours, preserving
                every single chapter and lesson timestamp proportionally.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-[#0f1611]/10 dark:border-white/10 bg-white dark:bg-[#111714]">
              <h4 className="font-semibold text-base text-[#0f1611] dark:text-white">
                How do I get started on Courseyl?
              </h4>
              <p className="text-sm text-[#4c4c3d] dark:text-[#a9aba0] mt-1.5 leading-relaxed">
                Simply paste any YouTube link or playlist into your Courseyl dashboard to generate your first structured
                course in seconds.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="mt-20 text-center p-10 rounded-3xl bg-[#f6f8ec] dark:bg-[#151c17] border border-[#4b5e1e]/20 space-y-4">
          <h3 className="text-2xl sm:text-3xl font-display font-bold text-[#0f1611] dark:text-white">
            Ready to upgrade your YouTube learning?
          </h3>
          <p className="text-sm sm:text-base text-[#4c4c3d] dark:text-[#a9aba0] max-w-lg mx-auto">
            Switch to Courseyl today and experience faster course generation, deeper placement tests, and zero duration
            limits.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#4b5e1e] hover:bg-[#3d4d18] text-white font-medium text-sm transition-transform hover:scale-105"
            >
              Try Courseyl Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <CourseItFooter />
    </div>
  );
}

