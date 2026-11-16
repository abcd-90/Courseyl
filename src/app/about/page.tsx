import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { CourseItFooter } from "@/components/CourseItFooter";
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Mail,
  ArrowRight,
  Code2,
  GraduationCap,
  MapPin,
  Laptop,
  Heart,
  Globe2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Courseyl & Founder Mr. Sami — Full-Stack AI Learning Platform",
  description:
    "Courseyl was founded and developed by Mr. Sami, a 20-year-old Full-Stack Web Developer & Software Engineer from Multan, Pakistan. Learn about our mission and cutting-edge features.",
  alternates: {
    canonical: "https://www.courseyl.online/about",
  },
  openGraph: {
    title: "About Courseyl & Founder Mr. Sami — The Story Behind the Platform",
    description:
      "Built by Mr. Sami from Multan, Pakistan. Transforming YouTube into structured, interactive courses with placement tests, smart quiz replay, and timestamped notes.",
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

  const devHighlights = [
    {
      icon: <GraduationCap className="w-5 h-5 text-[#4b5e1e] dark:text-[#a3b86c]" />,
      label: "Education",
      value: "University Student (3rd Semester)",
    },
    {
      icon: <MapPin className="w-5 h-5 text-[#4b5e1e] dark:text-[#a3b86c]" />,
      label: "Location",
      value: "Multan, Punjab, Pakistan",
    },
    {
      icon: <Laptop className="w-5 h-5 text-[#4b5e1e] dark:text-[#a3b86c]" />,
      label: "Expertise",
      value: "Full-Stack Web & AI Apps, SaaS & Systems",
    },
    {
      icon: <Globe2 className="w-5 h-5 text-[#4b5e1e] dark:text-[#a3b86c]" />,
      label: "Age",
      value: "20 Years Old",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfa] dark:bg-[#0a0f0c] text-[#0f1611] dark:text-[#f1f3ea] transition-colors">
      <MarketingNavbar />

      <main className="flex-1 max-w-4xl mx-auto px-6 pt-36 pb-24 w-full">
        {/* Mission Hero */}
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
            <strong> Courseyl</strong> turns those videos into complete, interactive courses you actually finish.
          </p>
        </div>

        {/* Founder & Lead Developer Spotlight */}
        <div className="mt-14 p-8 sm:p-10 rounded-3xl border border-black/10 dark:border-white/10 bg-gradient-to-br from-[#4b5e1e]/10 via-white/70 to-transparent dark:from-[#4b5e1e]/20 dark:via-[#141b16]/80 dark:to-transparent shadow-sm">
          <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-[#4b5e1e] dark:text-[#a3b86c] mb-3">
            <ShieldCheck className="w-4 h-4" />
            Founder & Lead Engineer
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-black/10 dark:border-white/10">
            <div>
              <h2 className="text-3xl font-display font-bold text-[#0f1611] dark:text-white flex items-center gap-3">
                Mr. Sami
                <span className="text-base font-sans font-normal text-ink-soft dark:text-white/60">
                  (Sheikh Sami)
                </span>
              </h2>
              <p className="text-base text-[#4b5e1e] dark:text-[#a3b86c] font-medium mt-1">
                Founder, Software Architect & Full-Stack Developer
              </p>
            </div>

            <a
              href="mailto:sheikhsami3082@gmail.com"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#4b5e1e]/30 dark:border-[#a3b86c]/30 bg-white/80 dark:bg-black/30 hover:bg-[#4b5e1e] hover:text-white dark:hover:bg-[#a3b86c] dark:hover:text-black font-medium text-xs transition-all shadow-xs"
            >
              <Mail className="w-3.5 h-3.5" />
              sheikhsami3082@gmail.com
            </a>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-black/10 dark:border-white/10">
            {devHighlights.map((stat, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs font-medium text-[#4c4c3d] dark:text-[#a9aba0]">
                  {stat.icon}
                  {stat.label}
                </div>
                <div className="text-sm font-semibold text-[#0f1611] dark:text-white">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Story & Biography */}
          <div className="mt-6 space-y-4 text-base text-[#4c4c3d] dark:text-[#a9aba0] leading-relaxed">
            <p>
              I&apos;m <strong>Mr. Sami (Sheikh Sami)</strong>, a 20-year-old Full-Stack Web Developer and Software
              Engineering university student (currently in my 3rd semester) based in <strong>Multan, Pakistan</strong>.
            </p>
            <p>
              As an active developer specializing in modern web applications, scalable SaaS software, and AI-powered
              educational tools, I built Courseyl to solve a personal pain point: saving 15-hour marathon coding
              tutorials to &ldquo;Watch Later&rdquo;, only to get sidetracked by YouTube&apos;s recommendations twenty
              minutes in.
            </p>
            <p>
              Courseyl was crafted from the ground up using state-of-the-art Next.js, TypeScript, PostgreSQL, and deep
              AI prompt engineering. My goal is to empower self-paced students across Pakistan and worldwide with
              world-class learning features — completely free, distraction-free, and grounded in active learning.
            </p>
          </div>
        </div>

        {/* Core Features Grid */}
        <div className="mt-14">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-[#0f1611] dark:text-white">
                Engineered for Serious Learners
              </h2>
              <p className="text-sm text-[#4c4c3d] dark:text-[#a9aba0] mt-1">
                Every feature in Courseyl is designed to save time and boost retention.
              </p>
            </div>
          </div>

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

        {/* Creator Rights & Fair Use Note */}
        <div className="mt-14 p-6 rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/5">
          <h3 className="font-semibold text-base text-[#0f1611] dark:text-white flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" />
            Respecting Original YouTube Creators
          </h3>
          <p className="text-sm text-[#4c4c3d] dark:text-[#a9aba0] mt-2 leading-relaxed">
            All video playback on Courseyl happens directly through the official YouTube embedded player. We never
            re-host or strip creator videos. Content creators receive 100% of their views, watch time, and channel
            attribution while learners gain an enhanced, distraction-free study environment.
          </p>
        </div>

        {/* Contact and Call to action */}
        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/5">
          <div>
            <h3 className="font-semibold text-base text-[#0f1611] dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#4b5e1e] dark:text-[#a3b86c]" />
              Have Questions or Feedback?
            </h3>
            <p className="text-sm text-[#4c4c3d] dark:text-[#a9aba0] mt-1">
              Connect directly with Mr. Sami at{" "}
              <a
                href="mailto:sheikhsami3082@gmail.com"
                className="text-[#4b5e1e] dark:text-[#a3b86c] underline underline-offset-4 font-medium"
              >
                sheikhsami3082@gmail.com
              </a>{" "}
              or{" "}
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4b5e1e] hover:bg-[#3d4d18] text-white font-medium text-sm transition-all shadow-sm shrink-0"
          >
            Start Learning Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <CourseItFooter />
    </div>
  );
}
