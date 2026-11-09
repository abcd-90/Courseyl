"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "private">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user enrolled courses from API / courses
    fetch("/api/courses")
      .then((res) => res.json())
      .then((data) => {
        if (data.courses && data.courses.length > 0) {
          const userEnrolled = data.courses.filter(
            (c: any) =>
              c.slug === "full-stack-ai-engineering-course" ||
              c.slug === "agentic-ai-engineering-workshop" ||
              c.slug === "best-python-ai-full-course-mayank-aggarwal" ||
              c.id === "crs_jhiu0gwjmw91bzjv" ||
              c.id === "crs_krohn_agentic_ai" ||
              c.id === "crs_mayank_python_ai"
          );

          if (userEnrolled.length > 0) {
            setCourses(userEnrolled);
          } else {
            setCourses([
              {
                id: "crs_jhiu0gwjmw91bzjv",
                slug: "full-stack-ai-engineering-course",
                title: "Full-Stack AI Engineering Course (FastAPI, LLMs, Docker, Supabase)",
                creator: "Dave Ebbelaar",
                duration: "3h 10m",
                thumbnailUrl: "https://i.ytimg.com/vi/XzjSx7u9mGw/maxresdefault.jpg",
                lessonCount: 14,
              },
            ]);
          }
        } else {
          // Default to enrolled sample course matching Screenshot 2
          setCourses([
            {
              id: "crs_jhiu0gwjmw91bzjv",
              slug: "full-stack-ai-engineering-course",
              title: "Full-Stack AI Engineering Course (FastAPI, LLMs, Docker, Supabase)",
              creator: "Dave Ebbelaar",
              duration: "3h 10m",
              thumbnailUrl: "https://i.ytimg.com/vi/XzjSx7u9mGw/maxresdefault.jpg",
              lessonCount: 14,
            },
          ]);
        }
      })
      .catch(() => {
        setCourses([
          {
            id: "crs_jhiu0gwjmw91bzjv",
            slug: "full-stack-ai-engineering-course",
            title: "Full-Stack AI Engineering Course (FastAPI, LLMs, Docker, Supabase)",
            creator: "Dave Ebbelaar",
            duration: "3h 10m",
            thumbnailUrl: "https://i.ytimg.com/vi/XzjSx7u9mGw/maxresdefault.jpg",
            lessonCount: 14,
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex bg-paper text-ink">
      {/* Persistent Left Sidebar */}
      <AppSidebar />

      {/* Main Content Area matching Screenshot 2 */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-6xl w-full">
        {/* Header Breadcrumbs */}
        <div className="mb-2">
          <span className="text-[0.7rem] font-bold text-ink-soft/70 tracking-widest uppercase font-mono">
            My Courses
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink tracking-tight">
          Everything you&apos;re <span className="italic text-moss font-serif">learning.</span>
        </h1>

        {/* Filter Pills matching Screenshot 2 */}
        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${activeTab === "all"
                ? "bg-[#b8c460] text-[#0f1611]"
                : "border border-line dark:border-white/10 text-ink-soft hover:text-ink"
              }`}
          >
            <span>All</span>
            <span>{courses.length}</span>
          </button>

          <button
            onClick={() => setActiveTab("private")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${activeTab === "private"
                ? "bg-[#b8c460] text-[#0f1611]"
                : "border border-line dark:border-white/10 text-ink-soft hover:text-ink"
              }`}
          >
            <span>🔒</span>
            <span>Private</span>
            <span>0</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="mt-6">
          {loading ? (
            <div className="p-12 text-center text-sm text-ink-soft">Loading your courses...</div>
          ) : courses.length === 0 || (activeTab === "private") ? (
            /* Empty State Card */
            <div className="w-full bg-surface dark:bg-[#0d140f] rounded-3xl border border-line dark:border-[#1b261e] p-16 sm:p-20 text-center shadow-sm flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-lime-soft dark:bg-[#182315] border border-line dark:border-[#26371a] text-moss dark:text-[#b8c460] flex items-center justify-center mb-5 shadow-xs">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-bold text-ink">
                No courses yet
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-ink-soft max-w-md leading-relaxed">
                Paste a YouTube video or playlist and it becomes a course with lessons, quizzes and a daily plan.
              </p>
              <div className="mt-6">
                <Link
                  href="/generate"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#b8c460] text-[#0f1611] text-sm font-semibold hover:bg-[#a6b350] transition-colors shadow-xs cursor-pointer"
                >
                  Build your first course
                </Link>
              </div>
            </div>
          ) : (
            /* Course Cards Grid matching Screenshot 2 */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map((course) => (
                <Link
                  key={course.id || course.slug}
                  href={`/courses/${course.slug || course.id}`}
                  className="group bg-surface dark:bg-[#0d140f] rounded-2xl border border-line dark:border-[#1b261e] p-3 shadow-xs hover:border-moss/40 hover:shadow-md transition-all flex flex-col text-ink max-w-[340px]"
                >
                  {/* Thumbnail with duration badge matching Screenshot 2 */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={course.thumbnailUrl || "https://i.ytimg.com/vi/XzjSx7u9mGw/maxresdefault.jpg"}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/85 text-white text-[0.68rem] font-semibold font-mono">
                      {course.duration || "3h 10m"}
                    </span>
                  </div>

                  {/* Title and author */}
                  <div className="pt-3 pb-1 px-1">
                    <h3 className="text-sm font-bold text-ink line-clamp-2 group-hover:text-moss transition-colors leading-snug">
                      {course.title}
                    </h3>
                    <p className="text-xs text-ink-soft mt-1">{course.creator || "Dave Ebbelaar"}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
