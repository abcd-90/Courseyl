"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { LandscapeIllustration } from "@/components/LandscapeHero";

export default function DashboardPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      router.push("/generate");
      return;
    }
    router.push(`/generate?url=${encodeURIComponent(url.trim())}`);
  };

  const sampleCourses = [
    {
      title: "Python for AI - Full Beginner Course",
      author: "Dave Ebbelaar",
      duration: "5h 16m",
      addedBy: "ABHISHEK",
      learningCount: 54,
      thumbnail: "https://i.ytimg.com/vi/ygXn5nV5qFc/maxresdefault.jpg",
      slug: "python-for-ai-full-beginner-course",
    },
    {
      title: "Complete Agentic AI Course In 10 Hours- Langchain, Langgraph, RAG,Vectorless RAG, Guardrails,Evals",
      author: "Krish Naik",
      duration: "11h 13m",
      addedBy: "Bhanuranjan",
      learningCount: 29,
      thumbnail: "https://i.ytimg.com/vi/rV3HJ4LEZ7k/maxresdefault.jpg",
      slug: "complete-agentic-ai-course-in-10-hours",
    },
    {
      title: "Full-Stack AI Engineering Course (FastAPI, LLMs, Docker...)",
      author: "Dave Ebbelaar",
      duration: "3h 10m",
      addedBy: "Manish",
      learningCount: 26,
      thumbnail: "https://i.ytimg.com/vi/XzjSx7u9mGw/maxresdefault.jpg",
      slug: "full-stack-ai-engineering-course",
    },
    {
      title: "Python Full Course for Beginners",
      author: "Programming with Mosh",
      duration: "2h 02m",
      addedBy: "twotakesonly",
      learningCount: 11,
      thumbnail: "https://i.ytimg.com/vi/kqtD5dpn9C8/maxresdefault.jpg",
      slug: "python-full-course-for-beginners-mosh",
    },
    {
      title: "Python Full Course for free 🐍",
      author: "Bro Code",
      duration: "12h 00m",
      addedBy: "Prince",
      learningCount: 8,
      thumbnail: "https://i.ytimg.com/vi/ix9cRaBkVe0/maxresdefault.jpg",
      slug: "python-full-course-for-free-bro-code",
    },
    {
      title: "Harvard CS50's Introduction to Programming with Python ...",
      author: "freeCodeCamp.org",
      duration: "15h 58m",
      addedBy: "Durvesh",
      learningCount: 7,
      thumbnail: "https://i.ytimg.com/vi/nLRL_NcnK-4/maxresdefault.jpg",
      slug: "harvard-cs50-introduction-to-programming-with-python",
    },
  ];

  return (
    <div className="min-h-screen flex bg-paper text-ink">
      {/* Left Application Shell Sidebar */}
      <AppSidebar />

      {/* Main Content Area matching Screenshot 3 */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full space-y-8">
        {/* Landscape Banner Card with Centered Intake Card matching Reference Screenshots 1, 2, 4 */}
        <div className="relative w-full rounded-3xl overflow-hidden border border-line dark:border-[#1c291d] bg-[#0e1311] h-[360px] sm:h-[400px] md:h-[430px] shadow-2xl flex items-center justify-center">
          <LandscapeIllustration />

          {/* Centered Intake Card matching Reference Image 2 & 4 */}
          <div className="relative z-10 px-4 w-full max-w-xl text-center">
            <div className="bg-[#121a15]/90 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 text-center space-y-4">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[0.72rem] font-medium text-ink-soft tracking-wider font-mono">
                Welcome to CourseIt
              </div>

              <h1 className="text-2xl sm:text-[2rem] font-display font-bold text-white tracking-tight leading-snug">
                What should we learn, <span className="text-[#b8c460]">12.?</span>
              </h1>

              <form onSubmit={handleGenerate} className="mt-2">
                <div className="flex items-center gap-2 p-1.5 rounded-full border border-white/15 bg-[#0a100c] shadow-inner focus-within:border-[#b8c460] focus-within:ring-2 focus-within:ring-[#b8c460]/20 transition-all">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="youtube.com/playlist?list=..."
                    className="w-full px-4 bg-transparent text-sm text-white placeholder-white/40 outline-none border-none shadow-none"
                  />
                  <button
                    type="submit"
                    className="shrink-0 px-5 py-2.5 rounded-full bg-[#b8c460] text-[#0f1611] text-xs sm:text-sm font-bold hover:bg-[#a6b350] transition-colors shadow-xs cursor-pointer"
                  >
                    Build my course
                  </button>
                </div>
              </form>

              <p className="text-[0.72rem] text-ink-soft/70">
                Courses built on Free are shared in Community. Pro and Max keep them private.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Connected Stats Cards in Lime Green matching Screenshot 3 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* Card 1: Streak */}
          <div className="relative bg-[#b8c460] text-[#0f1611] rounded-3xl p-5 overflow-hidden flex flex-col justify-between min-h-[145px] shadow-xs">
            <span className="text-[0.65rem] font-bold tracking-widest uppercase flex items-center gap-1 font-mono">
              <span>🔥</span>
              <span>STREAK</span>
            </span>
            <div className="my-auto py-1">
              <h3 className="text-3xl sm:text-4xl font-display font-bold leading-none">2 days</h3>
              <p className="text-[0.68rem] text-[#0f1611]/80 mt-1 leading-tight">
                Today counts. Come back tomorrow for 3.
              </p>
            </div>
            {/* Notch connector on right edge */}
            <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
          </div>

          {/* Card 2: Lessons this week */}
          <div className="relative bg-[#b8c460] text-[#0f1611] rounded-3xl p-5 overflow-hidden flex flex-col justify-between min-h-[145px] shadow-xs">
            {/* Notch connector on left edge */}
            <div className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
            <span className="text-[0.65rem] font-bold tracking-widest uppercase font-mono">
              LESSONS THIS WEEK
            </span>
            <div className="my-auto py-1">
              <h3 className="text-3xl sm:text-4xl font-display font-bold leading-none">0</h3>
            </div>
            <div />
            {/* Notch connector on right edge */}
            <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
          </div>

          {/* Card 3: Quiz Score */}
          <div className="relative bg-[#b8c460] text-[#0f1611] rounded-3xl p-5 overflow-hidden flex flex-col justify-between min-h-[145px] shadow-xs">
            {/* Notch connector on left edge */}
            <div className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
            <span className="text-[0.65rem] font-bold tracking-widest uppercase font-mono">
              QUIZ SCORE
            </span>
            <div className="my-auto py-1">
              <h3 className="text-3xl sm:text-4xl font-display font-bold leading-none">—</h3>
            </div>
            <div />
            {/* Notch connector on right edge */}
            <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
          </div>

          {/* Card 4: Watched this week */}
          <div className="relative bg-[#b8c460] text-[#0f1611] rounded-3xl p-5 overflow-hidden flex flex-col justify-between min-h-[145px] shadow-xs">
            {/* Notch connector on left edge */}
            <div className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
            <span className="text-[0.65rem] font-bold tracking-widest uppercase font-mono">
              WATCHED THIS WEEK
            </span>
            <div className="my-auto py-1">
              <h3 className="text-3xl sm:text-4xl font-display font-bold leading-none">0m</h3>
            </div>
            <div />
          </div>
        </div>



        {/* My courses. Section matching Screenshot 3 */}
        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-ink">
              My <span className="italic text-moss font-serif">courses.</span>
            </h2>
            <Link
              href="/courses"
              className="text-xs font-semibold text-ink-soft hover:text-ink transition-colors"
            >
              View all
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Course 1: Jon Krohn's Agentic AI Course */}
            <Link
              href="/courses/agentic-ai-engineering-workshop"
              className="group bg-surface dark:bg-[#0c120e] rounded-2xl border border-line dark:border-white/10 p-3 shadow-xs hover:border-moss/40 hover:shadow-md transition-all flex flex-col text-ink max-w-[340px]"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://i.ytimg.com/vi/LSk5KaEGVK4/maxresdefault.jpg"
                  alt="Agentic AI Engineering"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/85 text-white text-[0.65rem] font-semibold flex items-center gap-1.5 backdrop-blur-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse" />
                  <span>In progress</span>
                </div>
              </div>

              <div className="pt-3 pb-1 px-1 space-y-1.5">
                <h3 className="text-sm font-bold text-ink line-clamp-2 group-hover:text-moss transition-colors leading-snug">
                  Agentic AI Engineering: Complete 4-Hour Worksho...
                </h3>
                <p className="text-[0.68rem] font-bold text-ink-soft tracking-wider uppercase font-mono">
                  0 OF 13 LESSONS · 102 MIN A DAY
                </p>
                <div className="pt-1 flex items-center justify-between text-xs text-ink-soft border-t border-line dark:border-white/5">
                  <span className="truncate max-w-[200px]">Next: Workshop Overview &amp; Agent Def...</span>
                  <span className="font-semibold text-moss">0%</span>
                </div>
              </div>
            </Link>

            {/* Course 2: Dave Ebbelaar's Full-Stack AI Course */}
            <Link
              href="/courses/full-stack-ai-engineering-course/learn/lsn_ebb_1"
              className="group bg-surface dark:bg-[#0c120e] rounded-2xl border border-line dark:border-white/10 p-3 shadow-xs hover:border-moss/40 hover:shadow-md transition-all flex flex-col text-ink max-w-[340px]"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://i.ytimg.com/vi/XzjSx7u9mGw/maxresdefault.jpg"
                  alt="Full-Stack AI Engineering Course"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* • In progress badge matching Screenshot 3 */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/85 text-white text-[0.65rem] font-semibold flex items-center gap-1.5 backdrop-blur-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse" />
                  <span>In progress</span>
                </div>
              </div>

              <div className="pt-3 pb-1 px-1 space-y-1.5">
                <h3 className="text-sm font-bold text-ink line-clamp-2 group-hover:text-moss transition-colors leading-snug">
                  Full-Stack AI Engineering Course (FastAPI, LLMs,...
                </h3>
                <p className="text-[0.68rem] font-bold text-ink-soft tracking-wider uppercase font-mono">
                  0 OF 14 LESSONS · 90 MIN A DAY
                </p>
                <div className="pt-1 flex items-center justify-between text-xs text-ink-soft border-t border-line dark:border-white/5">
                  <span className="truncate max-w-[200px]">Next: Course Introduction &amp; Project...</span>
                  <span className="font-semibold text-moss">0%</span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Community Courses Section */}
        <div className="pt-6 border-t border-line dark:border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row items-baseline justify-between mb-5">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-ink">
              No link handy? <span className="italic text-moss font-serif">Start with one of these.</span>
            </h2>
            <span className="text-[0.7rem] font-bold text-ink-soft/70 tracking-wider uppercase mt-1 sm:mt-0 font-mono">
              Popular courses · ready now
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sampleCourses.map((course, idx) => (
              <Link
                key={idx}
                href={`/courses/${course.slug}`}
                className="group bg-surface dark:bg-[#0c120e] rounded-2xl border border-line dark:border-white/10 overflow-hidden shadow-xs hover:border-moss/40 hover:shadow-md transition-all flex flex-col text-ink"
              >
                <div className="relative aspect-video bg-[#1e2a19] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[0.65rem] font-semibold font-mono">
                    {course.duration}
                  </span>
                </div>
                <div className="p-3.5 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-ink line-clamp-2 group-hover:text-moss transition-colors leading-snug">
                      {course.title}
                    </h3>
                    <p className="text-[0.75rem] text-ink-soft mt-1">{course.author}</p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-line dark:border-white/5 flex items-center justify-between text-[0.7rem] text-ink-soft">
                    <span>added by <strong className="text-ink">{course.addedBy}</strong></span>
                    <span className="font-semibold text-moss">{course.learningCount} learning</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
