"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { LandscapeIllustration } from "@/components/LandscapeHero";
import { getCleanThumbnailUrl } from "@/lib/thumbnail";

export default function DashboardPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [popularCourses, setPopularCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = () => {
      fetch("/api/auth/me", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.authenticated && data.user) {
            setCurrentUser(data.user);
          }
        })
        .catch(() => {});
    };

    fetchUserData();

    // 2. Fetch live enrolled courses
    fetch("/api/courses?enrolled=true", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.courses && Array.isArray(data.courses) && data.courses.length > 0) {
          setMyCourses(data.courses);
        } else {
          setMyCourses([]);
        }
      })
      .catch(() => {
        setMyCourses([]);
      })
      .finally(() => setLoading(false));

    // 3. Fetch real popular community courses
    fetch("/api/courses?limit=6", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.courses && Array.isArray(data.courses) && data.courses.length > 0) {
          setPopularCourses(data.courses);
        }
      })
      .catch(() => {});

    const handleUserUpdated = (e: any) => {
      if (e.detail) {
        setCurrentUser(e.detail);
      } else {
        fetchUserData();
      }
    };

    window.addEventListener("user-updated", handleUserUpdated);
    window.addEventListener("focus", fetchUserData);
    return () => {
      window.removeEventListener("user-updated", handleUserUpdated);
      window.removeEventListener("focus", fetchUserData);
    };
  }, []);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      router.push("/generate");
      return;
    }
    router.push(`/generate?url=${encodeURIComponent(url.trim())}`);
  };

  const displayName =
    currentUser?.profile?.displayName ||
    currentUser?.displayName ||
    currentUser?.name ||
    currentUser?.email?.split("@")[0] ||
    "Learner";
  const streakDays = currentUser?.profile?.currentStreakDays || 1;

  const sampleCourses = [
    {
      title: "Python for AI - Full Beginner Course",
      author: "Dave Ebbelaar",
      duration: "5h 16m",
      addedBy: "ABHISHEK",
      learningCount: 54,
      thumbnail: "https://i.ytimg.com/vi/ygXn5nV5qFc/maxresdefault.jpg",
      slug: "python-for-ai-full-beginner-course-py81a",
    },
    {
      title: "Complete Agentic AI Course In 10 Hours- Langchain, Langgraph, RAG,Vectorless RAG, Guardrails,Evals",
      author: "Krish Naik",
      duration: "11h 13m",
      addedBy: "Bhanuranjan",
      learningCount: 29,
      thumbnail: "https://i.ytimg.com/vi/eynUbHweaQM/maxresdefault.jpg",
      slug: "complete-agentic-ai-course-in-10-hours-langchain-langgraph-rag-mcp-ag92f",
    },
    {
      title: "Full-Stack AI Engineering Course (FastAPI, LLMs, Docker...)",
      author: "Dave Ebbelaar",
      duration: "3h 10m",
      addedBy: "Manish",
      learningCount: 26,
      thumbnail: "https://i.ytimg.com/vi/i_LwzRVP7bg/maxresdefault.jpg",
      slug: "full-stack-ai-engineering-course-fastapi-llms-docker-supabase-fs77m",
    },
    {
      title: "Harvard CS50's Introduction to Programming with Python ...",
      author: "freeCodeCamp.org",
      duration: "15h 58m",
      addedBy: "Durvesh",
      learningCount: 120,
      thumbnail: "https://i.ytimg.com/vi/nLRL_NcnK-4/maxresdefault.jpg",
      slug: "harvard-cs50s-introduction-to-programming-with-python-cs50p",
    },
    {
      title: "Learn Ethical Hacking from ZERO to ADVANCED | 35+ Hours Practical Course",
      author: "Cyber Mind Space",
      duration: "35h 00m",
      addedBy: "Security Expert",
      learningCount: 16,
      thumbnail: "https://i.ytimg.com/vi/3Kq1MIfTWCE/hqdefault.jpg",
      slug: "learn-ethical-hacking-from-zero-to-advanced-35-hours-dgwh",
    },
    {
      title: "Generative AI Full Course 2026 | LLMs, RAG, AI Agents & Projects",
      author: "Coding With Sagar",
      duration: "10h 30m",
      addedBy: "Sami",
      learningCount: 18,
      thumbnail: "https://i.ytimg.com/vi/3iFMc6ELt7k/hqdefault.jpg",
      slug: "generative-ai-full-course-2026-llms-rag-ai-agents-projects-sagar-chouksey-ictge",
    },
  ];

  const displayedPopular =
    popularCourses.length > 0
      ? popularCourses.map((c) => ({
          title: c.title,
          author: c.creator || "Instructor",
          duration: c.duration,
          addedBy: c.creatorName || "Creator",
          learningCount: c.enrollmentCount || 1,
          thumbnail: getCleanThumbnailUrl(c.thumbnailUrl, c.slug, c.source?.youtubeId || c.youtubeId),
          slug: c.slug,
        }))
      : sampleCourses;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-paper text-ink">
      {/* Application Shell Sidebar (Responsive: Top bar & drawer on mobile/tablet, fixed static sidebar on desktop lg+) */}
      <AppSidebar />

      {/* Main Content Area */}
      <main className="w-full min-w-0 flex-1 p-3.5 sm:p-6 md:p-8 space-y-6 sm:space-y-8 overflow-y-auto max-w-7xl">
        {/* Landscape Banner Card with Centered Intake Card */}
        <div className="relative w-full rounded-3xl overflow-hidden border border-[#0f1611]/10 dark:border-[#1c291d] bg-[#fcfcfa] dark:bg-[#0e1311] min-h-[300px] sm:min-h-[360px] md:h-[430px] shadow-lg flex items-center justify-center p-3 sm:p-6">
          <LandscapeIllustration />

          {/* Centered Intake Card (Frosted white card matching reference site) */}
          <div className="relative z-10 w-full max-w-xl text-center px-1">
            <div className="bg-white/95 dark:bg-[#121a15]/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-[#0f1611]/10 dark:border-white/10 shadow-xl p-5 sm:p-8 text-center space-y-3 sm:space-y-4">
              <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#e4e9c6] dark:bg-white/10 text-[0.7rem] sm:text-[0.72rem] font-semibold text-[#4b5e1e] dark:text-[#b8c460] tracking-wide font-mono">
                Welcome to Courseyl
              </div>

              <h1 className="text-xl sm:text-2xl md:text-[2rem] font-display font-bold text-[#0f1611] dark:text-white tracking-tight leading-snug">
                What should we learn, <span className="text-[#4b5e1e] dark:text-[#b8c460] italic font-serif">{displayName}?</span>
              </h1>

              <form onSubmit={handleGenerate} className="mt-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 rounded-2xl sm:rounded-full border border-[#0f1611]/15 dark:border-white/15 bg-[#fcfcfa] dark:bg-[#0a100c] shadow-inner focus-within:border-[#4b5e1e] dark:focus-within:border-[#b8c460] focus-within:ring-2 focus-within:ring-[#4b5e1e]/20 transition-all">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="youtube.com/playlist?list=..."
                    className="w-full px-3.5 sm:px-4 py-2 sm:py-0 bg-transparent text-xs sm:text-sm text-[#0f1611] dark:text-white placeholder-[#0f1611]/40 dark:placeholder-white/40 outline-none border-none shadow-none"
                  />
                  <button
                    type="submit"
                    className="shrink-0 px-5 py-2.5 rounded-full bg-[#b8c460] text-[#0f1611] text-xs sm:text-sm font-bold hover:bg-[#a6b350] transition-colors shadow-xs cursor-pointer text-center"
                  >
                    Build my course
                  </button>
                </div>
              </form>

              <p className="text-[0.68rem] sm:text-[0.72rem] text-[#4c4c3d]/70 dark:text-ink-soft/70">
                Courses built on Free are shared in Community. Pro and Max keep them private.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Connected Stats Cards in Lime Green */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Card 1: Streak */}
          <div className="relative bg-[#b8c460] text-[#0f1611] rounded-3xl p-3.5 sm:p-5 overflow-hidden flex flex-col justify-between min-h-[120px] sm:min-h-[145px] shadow-xs">
            <span className="text-[0.6rem] sm:text-[0.65rem] font-bold tracking-widest uppercase flex items-center gap-1 font-mono">
              <span>🔥</span>
              <span>STREAK</span>
            </span>
            <div className="my-auto py-1">
              <h3 className="text-xl sm:text-3xl md:text-4xl font-display font-bold leading-tight whitespace-nowrap">
                {streakDays} {streakDays === 1 ? "day" : "days"}
              </h3>
              <p className="text-[0.62rem] sm:text-[0.68rem] text-[#0f1611]/80 mt-1 leading-tight">
                Today counts. Come back tomorrow for {streakDays + 1}.
              </p>
            </div>
            {/* Notch connector on right edge */}
            <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
          </div>

          {/* Card 2: Lessons this week */}
          <div className="relative bg-[#b8c460] text-[#0f1611] rounded-3xl p-3.5 sm:p-5 overflow-hidden flex flex-col justify-between min-h-[120px] sm:min-h-[145px] shadow-xs">
            <div className="hidden lg:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
            <span className="text-[0.6rem] sm:text-[0.65rem] font-bold tracking-widest uppercase font-mono">
              LESSONS THIS WEEK
            </span>
            <div className="my-auto py-1">
              <h3 className="text-xl sm:text-3xl md:text-4xl font-display font-bold leading-tight">0</h3>
            </div>
            <div />
            <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
          </div>

          {/* Card 3: Quiz Score */}
          <div className="relative bg-[#b8c460] text-[#0f1611] rounded-3xl p-3.5 sm:p-5 overflow-hidden flex flex-col justify-between min-h-[120px] sm:min-h-[145px] shadow-xs">
            <div className="hidden lg:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
            <span className="text-[0.6rem] sm:text-[0.65rem] font-bold tracking-widest uppercase font-mono">
              QUIZ SCORE
            </span>
            <div className="my-auto py-1">
              <h3 className="text-xl sm:text-3xl md:text-4xl font-display font-bold leading-tight">—</h3>
            </div>
            <div />
            <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
          </div>

          {/* Card 4: Watched this week */}
          <div className="relative bg-[#b8c460] text-[#0f1611] rounded-3xl p-3.5 sm:p-5 overflow-hidden flex flex-col justify-between min-h-[120px] sm:min-h-[145px] shadow-xs">
            <div className="hidden lg:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
            <span className="text-[0.6rem] sm:text-[0.65rem] font-bold tracking-widest uppercase font-mono">
              WATCHED THIS WEEK
            </span>
            <div className="my-auto py-1">
              <h3 className="text-xl sm:text-3xl md:text-4xl font-display font-bold leading-tight">0m</h3>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {myCourses.length > 0 ? (
              myCourses.slice(0, 3).map((c: any) => (
                <Link
                  key={c.id || c.slug}
                  href={`/courses/${c.slug}`}
                  className="group bg-white dark:bg-[#141b16] rounded-2xl border border-line dark:border-white/10 p-3.5 shadow-sm hover:border-[#4b5e1e]/40 dark:hover:border-[#b8c460]/40 hover:shadow-md transition-all flex flex-col text-ink w-full"
                >
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.thumbnailUrl || "https://i.ytimg.com/vi/ygXn5nV5qFc/maxresdefault.jpg"}
                      alt={c.title}
                      onError={(e: any) => {
                        e.currentTarget.src = "https://i.ytimg.com/vi/ygXn5nV5qFc/hqdefault.jpg";
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/85 text-white text-[0.65rem] font-semibold flex items-center gap-1.5 backdrop-blur-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse" />
                      <span>{c.progressPercentage && c.progressPercentage > 0 ? "In progress" : "Start now"}</span>
                    </div>
                  </div>

                  <div className="pt-3 pb-1 px-1 space-y-1.5">
                    <h3 className="text-sm font-bold text-ink line-clamp-2 group-hover:text-moss transition-colors leading-snug">
                      {c.title}
                    </h3>
                    <p className="text-[0.68rem] font-bold text-ink-soft tracking-wider uppercase font-mono">
                      {c.lessonCount ? `0 OF ${c.lessonCount} LESSONS` : "13 LESSONS"} · {c.duration || "90 MIN"}
                    </p>
                    <div className="pt-1 flex items-center justify-between text-xs text-ink-soft border-t border-line dark:border-white/5">
                      <span className="truncate max-w-[200px]">{c.creator || "Instructor"}</span>
                      <span className="font-semibold text-moss">{c.progressPercentage || 0}%</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-12 px-6 text-center bg-surface dark:bg-[#0c120e] rounded-3xl border border-line dark:border-white/10 shadow-xs flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-lime-soft dark:bg-[#182315] border border-line dark:border-[#26371a] text-moss dark:text-[#b8c460] flex items-center justify-center shadow-xs">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">No courses started yet</h3>
                  <p className="text-xs text-ink-soft max-w-sm mt-1 leading-relaxed">
                    Paste a YouTube link in the banner above to create your first course, or pick from our community catalog below!
                  </p>
                </div>
                <Link
                  href="/generate"
                  className="px-4 py-2 rounded-full bg-[#b8c460] text-[#0f1611] font-semibold text-xs hover:bg-[#a6b350] transition-colors cursor-pointer shadow-xs"
                >
                  + Build your first course
                </Link>
              </div>
            )}
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
            {displayedPopular.map((course, idx) => (
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
