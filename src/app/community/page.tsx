"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { CourseItFooter } from "@/components/CourseItFooter";

export default function CommunityPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/courses")
      .then((res) => res.json())
      .then((data) => {
        if (data.courses) {
          setCourses(data.courses);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.channelTitle && c.channelTitle.toLowerCase().includes(search.toLowerCase()));
    const matchesDifficulty =
      selectedDifficulty === "ALL" || c.difficulty === selectedDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfa] text-[#0f1611]">
      <MarketingNavbar />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-block px-3 py-1 rounded-full bg-[#e4e9c6] text-[#4b5e1e] text-xs font-semibold mb-3">
            Public Course Catalog
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-bold text-[#0f1611]">
            Explore community <span className="italic text-[#4b5e1e] font-serif">courses.</span>
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-[#4c4c3d]">
            Join any course generated on the platform 100% free forever without consuming your build hours.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl border border-[#0f1611]/10 p-4 shadow-sm mb-8">
          <div className="flex items-center gap-2 w-full sm:w-80 px-3 py-1.5 rounded-xl border border-[#0f1611]/15 bg-[#fcfcfa]">
            <svg className="w-4 h-4 text-[#4c4c3d]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by topic, instructor, tech..."
              className="w-full bg-transparent text-xs sm:text-sm outline-none text-[#0f1611] placeholder-[#4c4c3d]/60"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {["ALL", "BEGINNER", "INTERMEDIATE", "ADVANCED"].map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedDifficulty === diff
                    ? "bg-[#4b5e1e] text-[#f6f8ec] shadow-sm"
                    : "border border-[#0f1611]/15 text-[#4c4c3d] hover:text-[#0f1611]"
                }`}
              >
                {diff === "ALL" ? "All Levels" : diff}
              </button>
            ))}
          </div>
        </div>

        {/* Course Cards Grid */}
        {loading ? (
          <div className="p-16 text-center text-xs sm:text-sm text-[#4c4c3d]">
            Loading courses...
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-16 text-center text-xs sm:text-sm text-[#4c4c3d] bg-white rounded-3xl border border-[#0f1611]/10">
            No courses found matching your criteria. Try another search or build one from a YouTube link!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((c) => (
              <Link
                key={c.id}
                href={`/courses/${c.slug}`}
                className="group bg-white rounded-2xl border border-[#0f1611]/10 overflow-hidden shadow-sm hover:border-[#4b5e1e]/40 hover:shadow-md transition-all flex flex-col"
              >
                <div className="relative aspect-video bg-[#1e2a19] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.thumbnailUrl || "https://i.ytimg.com/vi/kqtD5dpn9C8/maxresdefault.jpg"}
                    alt={c.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[0.65rem] font-semibold">
                    {c.totalDurationHours}h Video
                  </span>
                </div>
                <div className="p-4 flex flex-col flex-1 justify-between">
                  <div>
                    <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded bg-[#e4e9c6] text-[#4b5e1e] uppercase">
                      {c.difficulty}
                    </span>
                    <h3 className="text-sm font-bold text-[#0f1611] line-clamp-2 mt-2 group-hover:text-[#4b5e1e] transition-colors leading-snug">
                      {c.title}
                    </h3>
                    <p className="text-xs text-[#4c4c3d] mt-1">{c.channelTitle || "YouTube Creator"}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#0f1611]/10 flex items-center justify-between text-xs text-[#4c4c3d]">
                    <span>{c.lessonsCount} lessons</span>
                    <span className="font-semibold text-[#4b5e1e] group-hover:underline">Join Free →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <CourseItFooter />
    </div>
  );
}
