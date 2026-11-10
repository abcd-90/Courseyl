"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";
import { getCleanThumbnailUrl } from "@/lib/thumbnail";

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "private">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch live user enrolled courses
    fetch("/api/courses?enrolled=true")
      .then((res) => res.json())
      .then((data) => {
        if (data.courses && Array.isArray(data.courses) && data.courses.length > 0) {
          setCourses(data.courses);
        } else {
          setCourses([]);
        }
      })
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-paper text-ink">
      {/* Persistent Left Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <main className="w-full min-w-0 flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-6xl">
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
                Explore existing community courses or paste a YouTube video to build your own personalized curriculum.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/community"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#4b5e1e] dark:bg-[#b8c460] text-white dark:text-[#0f1611] text-xs sm:text-sm font-semibold hover:bg-[#3d4c18] dark:hover:bg-[#a6b350] transition-colors shadow-xs cursor-pointer"
                >
                  Explore community courses
                </Link>
                <Link
                  href="/generate"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-line dark:border-white/10 bg-surface dark:bg-white/5 text-xs sm:text-sm font-semibold text-ink hover:bg-black/5 dark:hover:bg-white/10 transition-colors shadow-xs cursor-pointer"
                >
                  + Build your own course
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
                      src={getCleanThumbnailUrl(course.thumbnailUrl, course.slug)}
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
