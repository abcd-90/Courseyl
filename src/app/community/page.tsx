"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";

export default function CommunityPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [roadmapsCount, setRoadmapsCount] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"courses" | "roadmaps">("courses");
  const [search, setSearch] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCommunityCourses = () => {
    fetch("/api/courses?limit=100", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.courses)) {
          setCourses(data.courses);
        }
        if (data.roadmapsCount) {
          setRoadmapsCount(data.roadmapsCount);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCommunityCourses();
    const handleFocus = () => fetchCommunityCourses();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const filteredCourses = courses.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      c.title?.toLowerCase().includes(q) ||
      c.creator?.toLowerCase().includes(q) ||
      c.creatorName?.toLowerCase().includes(q) ||
      c.tags?.some((t: string) => t.toLowerCase().includes(q));
    const matchesDifficulty =
      selectedDifficulty === "ALL" || c.difficulty === selectedDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-paper text-ink">
      {/* Persistent Left Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <main className="w-full min-w-0 flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-7xl">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <span className="text-[0.7rem] font-bold text-ink-soft/70 tracking-widest uppercase font-mono block mb-1">
              COMMUNITY
            </span>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink tracking-tight">
              Learn what others are <span className="italic text-moss dark:text-[#b8c460] font-serif">learning.</span>
            </h1>
          </div>
          <Link
            href="/roadmaps/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#4b5e1e] hover:bg-[#3d4c18] dark:bg-[#b8c460] dark:hover:bg-[#a6b350] text-white dark:text-[#0f1611] text-xs sm:text-sm font-semibold transition-transform hover:-translate-y-0.5 shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <span className="text-base font-bold">+</span>
            <span>New roadmap</span>
          </Link>
        </div>

        {/* Tabs & Search / Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("courses")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "courses"
                  ? "bg-[#2d3a14] dark:bg-[#202d18] text-white shadow-xs"
                  : "border border-line dark:border-white/10 text-ink-soft hover:text-ink hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <span>Courses</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[0.65rem] font-mono ${
                  activeTab === "courses"
                    ? "bg-[#b8c460] text-[#0f1611] font-bold"
                    : "bg-black/10 dark:bg-white/10 text-ink-soft"
                }`}
              >
                {courses.length}
              </span>
            </button>

            <Link
              href="/roadmaps"
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-line dark:border-white/10 text-ink-soft hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Roadmaps</span>
              <span className="px-1.5 py-0.2 rounded-full text-[0.65rem] font-mono bg-black/10 dark:bg-white/10 text-ink-soft">
                {roadmapsCount}
              </span>
            </Link>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-line dark:border-white/10 bg-surface dark:bg-[#121815] w-full sm:w-72 text-xs">
              <svg className="w-3.5 h-3.5 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses, topics or creators..."
                className="w-full bg-transparent outline-none text-ink placeholder-ink-soft/60"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-line dark:border-white/10 bg-surface dark:bg-[#121815] text-xs font-semibold text-ink-soft hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <span>Filter</span>
                <span className="text-[0.65rem]">▾</span>
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-surface dark:bg-[#121815] border border-line dark:border-white/10 p-2 shadow-xl z-20 space-y-1">
                  {["ALL", "BEGINNER", "INTERMEDIATE", "ADVANCED"].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => {
                        setSelectedDifficulty(lvl);
                        setShowFilterMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                        selectedDifficulty === lvl
                          ? "bg-[#b8c460] text-[#0f1611] font-bold"
                          : "text-ink hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      {lvl === "ALL" ? "All levels" : lvl.charAt(0) + lvl.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Course Cards Grid */}
        {loading ? (
          <div className="p-16 text-center text-xs sm:text-sm text-ink-soft">
            Loading community courses...
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-16 text-center text-xs sm:text-sm text-ink-soft bg-surface dark:bg-[#121815] rounded-3xl border border-line dark:border-white/10">
            No courses found matching your criteria. Try another search or create one from a YouTube link!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCourses.map((c) => (
              <Link
                key={c.id || c.slug}
                href={`/courses/${c.slug}`}
                className="group bg-surface dark:bg-[#121815] rounded-3xl border border-line dark:border-white/10 p-3 hover:border-moss/40 hover:shadow-md transition-all flex flex-col cursor-pointer"
              >
                {/* Thumbnail Container with duration badge */}
                <div className="w-full aspect-video rounded-2xl overflow-hidden relative bg-black shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.thumbnailUrl}
                    alt={c.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://i.ytimg.com/vi/3iFMc6ELt7k/hqdefault.jpg";
                    }}
                  />
                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-white text-[0.68rem] font-mono font-medium tracking-tight">
                    {c.duration}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-[0.92rem] text-ink leading-snug mt-3 line-clamp-2 group-hover:text-moss transition-colors">
                  {c.title}
                </h3>

                {/* Creator / Channel Name */}
                <p className="text-xs text-ink-soft font-medium mt-1 truncate">
                  {c.creator}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {c.tags?.map((t: string, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full bg-[#f0f3eb] dark:bg-[#1f2a1d] text-[#4b5e1e] dark:text-[#b8c460] text-[0.68rem] font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Card Footer */}
                <div className="mt-auto pt-3 border-t border-line/60 dark:border-white/5 flex items-center justify-between text-[0.72rem] text-ink-soft">
                  <span className="truncate">
                    added by <strong className="text-ink font-semibold">{c.creatorName}</strong>
                  </span>
                  <span className="shrink-0 ml-2 font-mono">{c.enrollmentCount} learning</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
