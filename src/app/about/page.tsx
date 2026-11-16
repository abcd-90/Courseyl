import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { CourseItFooter } from "@/components/CourseItFooter";
import { AboutHeroIllustration } from "@/components/about/AboutHeroIllustration";
import { FounderSignature } from "@/components/about/FounderSignature";
import { LearningLaptopIllustration } from "@/components/about/LearningLaptopIllustration";
import {
  Sparkles,
  Star,
  Play,
  ArrowDown,
  ArrowRight,
  GraduationCap,
  Code2,
  Briefcase,
  User,
  Search,
  Calendar,
  PlayCircle,
  Zap,
  BarChart3,
  ShieldCheck,
  Heart,
  CheckCircle2,
  Mail,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Courseyl & Founder Mr. Sami — Engineered for Serious Learners",
  description:
    "Learn about Courseyl's mission to transform YouTube into structured, interactive courses. Founded by Mr. Sami, software architect & full-stack developer.",
  alternates: {
    canonical: "https://www.courseyl.online/about",
  },
  openGraph: {
    title: "About Courseyl & Founder Mr. Sami — Engineered for Serious Learners",
    description:
      "Transforming YouTube videos into structured interactive courses with placement tests, smart quiz replay, and time-stamped notes.",
    url: "https://www.courseyl.online/about",
  },
};

export default function AboutPage() {
  const metaGrid = [
    {
      icon: <GraduationCap className="w-4 h-4 text-[#365314] dark:text-[#a3b86c]" />,
      label: "University",
      value: "Emerson University (Multan)",
    },
    {
      icon: <Code2 className="w-4 h-4 text-[#365314] dark:text-[#a3b86c]" />,
      label: "Expertise",
      value: "Modern Web Development",
    },
    {
      icon: <Briefcase className="w-4 h-4 text-[#365314] dark:text-[#a3b86c]" />,
      label: "Experience",
      value: "Full Stack Web, UX Apps, SaaS & Startups",
    },
    {
      icon: <User className="w-4 h-4 text-[#365314] dark:text-[#a3b86c]" />,
      label: "Age",
      value: "20 Years Old",
    },
  ];

  const features = [
    {
      icon: <Search className="w-5 h-5 text-[#365314] dark:text-[#a3b86c]" />,
      title: "Diagnostic Placement Tests",
      desc: "Assess what you know and get the perfect learning path without repeating basics.",
    },
    {
      icon: <Calendar className="w-5 h-5 text-[#365314] dark:text-[#a3b86c]" />,
      title: "Structured Learning Support",
      desc: "Get step-by-step guidance and daily paced milestones you can stick with.",
    },
    {
      icon: <PlayCircle className="w-5 h-5 text-[#365314] dark:text-[#a3b86c]" />,
      title: "Time-Stamped Notes & Short Video Jump",
      desc: "Quickly find key points in long multi-hour videos and jump to exact timestamps.",
    },
    {
      icon: <Zap className="w-5 h-5 text-[#365314] dark:text-[#a3b86c]" />,
      title: "Smart Quiz Engine",
      desc: "Test your knowledge with adaptive active-recall quizzes and instant video replay.",
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-[#365314] dark:text-[#a3b86c]" />,
      title: "Interactive, Free Learning Space",
      desc: "Learn with no cost, anytime, anywhere in an ad-free, distraction-free environment.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-[#365314] dark:text-[#a3b86c]" />,
      title: "Community Course Sharing",
      desc: "Explore public courses contributed by learners and educators worldwide.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfa] dark:bg-[#0a0f0c] text-[#0f1611] dark:text-[#f1f3ea] transition-colors selection:bg-[#365314]/20 selection:text-[#365314] dark:selection:text-[#a3b86c]">
      <MarketingNavbar />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-36 pb-24 w-full">
        {/* ========================================================
            1. HERO SECTION
           ======================================================== */}
        <section className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Subtle ambient light glow */}
          <div className="absolute -top-16 -left-16 w-96 h-96 bg-[#ecf5d6]/50 dark:bg-[#365314]/10 rounded-full blur-3xl pointer-events-none -z-10" />

          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#ecf5d6] text-[#365314] dark:bg-[#365314]/25 dark:text-[#a3b86c] border border-[#365314]/15 dark:border-[#a3b86c]/20 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              Our Mission & Story
            </div>

            <h1 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-[#0f1611] dark:text-white leading-[1.12]">
              About <span className="text-[#365314] dark:text-[#a3b86c]">Courseyl</span>
            </h1>

            <p className="text-base sm:text-lg text-[#4c4c3d] dark:text-[#a9aba0] leading-relaxed max-w-2xl">
              The best teachers in the world share knowledge freely on YouTube. But, long videos often lack structure:
              no study plan, no diagnostic checks, and no way to prove you actually understood. Courseyl turns those
              videos into complete, interactive courses you actually finish.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#365314] hover:bg-[#283e0f] text-white font-medium text-sm sm:text-base shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-current" />
                Explore Courses
              </Link>

              <a
                href="#founder-section"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-black/15 dark:border-white/15 bg-white/70 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 text-[#0f1611] dark:text-white font-medium text-sm sm:text-base transition-all"
              >
                <ArrowDown className="w-4 h-4" />
                Learn More
              </a>
            </div>
          </div>

          {/* Right Hero Visual / Interactive 3D Showcase */}
          <div className="lg:col-span-5 relative flex items-center justify-center pt-6 lg:pt-0">
            <AboutHeroIllustration />
          </div>
        </section>

        {/* ========================================================
            2. FOUNDER & LEAD INSTRUCTOR CARD
           ======================================================== */}
        <section id="founder-section" className="mt-20 sm:mt-24 scroll-mt-28">
          <div className="relative rounded-3xl border border-[#365314]/15 dark:border-white/10 bg-white/80 dark:bg-[#121a14]/80 backdrop-blur-md p-6 sm:p-10 shadow-sm overflow-hidden">
            {/* Ambient wash */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#ecf5d6]/40 via-transparent to-transparent dark:from-[#365314]/15 pointer-events-none -z-10" />

            {/* Founder Card Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-black/5 dark:border-white/10">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#ecf5d6] text-[#365314] dark:bg-[#365314]/25 dark:text-[#a3b86c] border border-[#365314]/15">
                  <Star className="w-3 h-3 fill-current" />
                  FOUNDER & LEAD INSTRUCTOR
                </div>

                <div className="pt-1">
                  <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#0f1611] dark:text-white">
                    Mr. Sami
                  </h2>
                </div>

                <p className="text-sm sm:text-base font-medium text-[#365314] dark:text-[#a3b86c]">
                  Founder, Software Architect & Full-Stack Developer
                </p>
              </div>

              {/* Founder Photo */}
              <div className="shrink-0 flex items-center gap-4">
                <div className="relative w-28 sm:w-32 h-36 sm:h-40 rounded-2xl overflow-hidden border-2 border-[#365314]/20 dark:border-[#a3b86c]/30 shadow-md bg-[#5a7924]">
                  <Image
                    src="/images/about/mr-sami@2x.png"
                    alt="Mr. Sami - Founder of Courseyl"
                    fill
                    sizes="(max-width: 640px) 112px, 128px"
                    className="object-cover object-top select-none"
                  />
                </div>
              </div>
            </div>

            {/* 4-Item Quick Profile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 py-6 border-b border-black/5 dark:border-white/10">
              {metaGrid.map((item, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-[#fbfcf8] dark:bg-[#161f18]/60 flex items-start gap-3.5 shadow-2xs"
                >
                  <div className="p-2.5 rounded-xl bg-[#ecf5d6] dark:bg-[#365314]/30 text-[#365314] dark:text-[#a3b86c] shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[0.7rem] font-bold uppercase tracking-wider text-[#4c4c3d]/70 dark:text-[#a9aba0]">
                      {item.label}
                    </div>
                    <div className="text-xs sm:text-[0.88rem] font-semibold text-[#0f1611] dark:text-white leading-snug mt-1 break-words">
                      {item.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Founder Bio Story & Digital Signature */}
            <div className="pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              <div className="md:col-span-9 space-y-4 text-sm sm:text-base text-[#4c4c3d] dark:text-[#a9aba0] leading-relaxed">
                <p>
                  As an active developer passionate in modern web applications, scalable SaaS solutions, and AI-powered
                  education tools, I built Courseyl to help students learn better through structured courses and interactive
                  content — just like YouTube, but complete and organized.
                </p>
                <p>
                  Courseyl was created from the simple goal of making the best of the internet&apos;s knowledge accessible,
                  affordable, and easy to follow. Our mission is to empower learners worldwide with high-quality education.
                </p>
              </div>

              {/* Digital Signature Component */}
              <div className="md:col-span-3 flex md:justify-end items-center pt-2 md:pt-0">
                <FounderSignature />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            3. ENGINEERED FOR SERIOUS LEARNERS (FEATURES GRID)
           ======================================================== */}
        <section className="mt-24 sm:mt-28">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#ecf5d6] text-[#365314] dark:bg-[#365314]/25 dark:text-[#a3b86c] border border-[#365314]/15">
              Built for Learners
            </div>

            <h2 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-[#0f1611] dark:text-white">
              Engineered for{" "}
              <span className="text-[#365314] dark:text-[#a3b86c]">Serious Learners</span>
            </h2>

            <p className="text-sm sm:text-base text-[#4c4c3d] dark:text-[#a9aba0]">
              Powerful features to help you learn smarter and faster.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="group p-6 rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-[#141b16]/70 backdrop-blur-sm hover:border-[#365314]/25 dark:hover:border-[#a3b86c]/30 hover:shadow-md transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-[#ecf5d6] dark:bg-[#365314]/30 flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
                  {feat.icon}
                </div>

                <h3 className="font-semibold text-base text-[#0f1611] dark:text-white">
                  {feat.title}
                </h3>

                <p className="mt-2 text-xs sm:text-sm text-[#4c4c3d] dark:text-[#a9aba0] leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================
            4. RESPECTING ORIGINAL YOUTUBE CONTENT (BOTTOM CTA)
           ======================================================== */}
        <section className="mt-20 sm:mt-24">
          <div className="relative rounded-3xl border border-[#365314]/20 dark:border-white/10 bg-gradient-to-r from-[#edf4d8]/90 via-[#f8fbf0]/90 to-[#edf4d8]/90 dark:from-[#1b261e]/90 dark:via-[#141d16]/90 dark:to-[#1b261e]/90 p-6 sm:p-10 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8 overflow-hidden">
            {/* Left Content with Laptop Graphic */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 max-w-2xl text-center sm:text-left">
              <div className="w-28 sm:w-36 shrink-0 select-none">
                <LearningLaptopIllustration />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-display font-bold text-[#0f1611] dark:text-white flex items-center justify-center sm:justify-start gap-2">
                  <Heart className="w-5 h-5 text-rose-500 fill-rose-500 shrink-0" />
                  Accepting Original YouTube Content
                </h3>

                <p className="text-xs sm:text-sm text-[#4c4c3d] dark:text-[#a9aba0] leading-relaxed">
                  If we add playlists on Courseyl specifically through official YouTube videos encoded there, we need to
                  copy those videos, allow users to learn, save, and share them — so the content is easily accessible to
                  all. Creators retain 100% of their views and attribution.
                </p>

                <div className="pt-2">
                  <a
                    href="mailto:thecourseyl@gmail.com"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#365314] dark:text-[#a3b86c] hover:underline underline-offset-4"
                  >
                    + Have Questions or Feedback?
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-3 w-full sm:w-auto shrink-0">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#365314] hover:bg-[#283e0f] text-white font-medium text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Learning Free
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="mailto:sheikhsami3082@gmail.com"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-xs sm:text-sm font-medium text-[#0f1611] dark:text-white transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[#365314] dark:text-[#a3b86c]" />
                Contact Us
              </a>
            </div>
          </div>
        </section>
      </main>

      <CourseItFooter />
    </div>
  );
}
