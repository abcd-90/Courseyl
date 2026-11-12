"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { getCleanThumbnailUrl } from "@/lib/thumbnail";

function CommunityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "roadmaps" ? "roadmaps" : "courses";

  const [courses, setCourses] = useState<any[]>([]);
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [roadmapsCount, setRoadmapsCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"courses" | "roadmaps">(initialTab);
  const [search, setSearch] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedRoadmapIds, setExpandedRoadmapIds] = useState<Record<string, boolean>>({});
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    const paramTab = searchParams.get("tab") === "roadmaps" ? "roadmaps" : "courses";
    setActiveTab(paramTab);
  }, [searchParams]);

  const fetchCommunityData = () => {
    fetch("/api/courses?limit=100", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.courses)) {
          setCourses(data.courses);
        }
        if (typeof data.roadmapsCount === "number") {
          setRoadmapsCount(data.roadmapsCount);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/roadmaps", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.roadmaps)) {
          setRoadmaps(data.roadmaps);
          setRoadmapsCount(data.roadmaps.length);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchCommunityData();
    const handleFocus = () => fetchCommunityData();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleTabChange = (tab: "courses" | "roadmaps") => {
    setActiveTab(tab);
    router.replace(tab === "roadmaps" ? "/community?tab=roadmaps" : "/community", {
      scroll: false,
    });
  };

  const handleEnrollRoadmap = async (roadmap: any) => {
    if (enrollingId) return;
    setEnrollingId(roadmap.id);
    try {
      const res = await fetch(`/api/roadmaps/${roadmap.slug || roadmap.id}/enroll`, {
        method: "POST",
      });
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent("/community?tab=roadmaps")}`);
        return;
      }
      if (res.ok) {
        setRoadmaps((prev) =>
          prev.map((r) =>
            r.id === roadmap.id
              ? {
                  ...r,
                  isEnrolled: true,
                  enrollmentCount: (r.enrollmentCount || 0) + (r.isEnrolled ? 0 : 1),
                }
              : r
          )
        );
      }
    } catch {} finally {
      setEnrollingId(null);
    }
  };

  const toggleExpandStages = (roadmapId: string) => {
    setExpandedRoadmapIds((prev) => ({ ...prev, [roadmapId]: !prev[roadmapId] }));
  };

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

  const filteredRoadmaps = roadmaps.filter((r) => {
    const q = search.toLowerCase();
    return (
      !search ||
      r.title?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.creatorName?.toLowerCase().includes(q)
    );
  });

  const formatTotalDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "Self-paced";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-paper text-ink">
      <AppSidebar />

      <main className="w-full min-w-0 flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-7xl">
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTabChange("courses")}
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

            <button
              type="button"
              onClick={() => handleTabChange("roadmaps")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "roadmaps"
                  ? "bg-[#2d3a14] dark:bg-[#202d18] text-white shadow-xs"
                  : "border border-line dark:border-white/10 text-ink-soft hover:text-ink hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <span>Roadmaps</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[0.65rem] font-mono ${
                  activeTab === "roadmaps"
                    ? "bg-[#b8c460] text-[#0f1611] font-bold"
                    : "bg-black/10 dark:bg-white/10 text-ink-soft"
                }`}
              >
                {roadmapsCount}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-line dark:border-white/10 bg-surface dark:bg-[#121815] w-full sm:w-72 text-xs">
              <svg className="w-3.5 h-3.5 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeTab === "roadmaps"
                    ? "Search roadmaps or curators..."
                    : "Search courses, topics or creators..."
                }
                className="w-full bg-transparent outline-none text-ink placeholder-ink-soft/60"
              />
            </div>

            {activeTab === "courses" && (
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
                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
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
            )}
          </div>
        </div>

        {/* Courses Tab */}
        {activeTab === "courses" ? (
          loading ? (
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
                  <div className="w-full aspect-video rounded-2xl overflow-hidden relative bg-black shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getCleanThumbnailUrl(c.thumbnailUrl, c.slug)}
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

                  <h3 className="font-bold text-[0.92rem] text-ink leading-snug mt-3 line-clamp-2 group-hover:text-moss transition-colors">
                    {c.title}
                  </h3>

                  <p className="text-xs text-ink-soft font-medium mt-1 truncate">
                    {c.creator}
                  </p>

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

                  <div className="mt-auto pt-3 border-t border-line/60 dark:border-white/5 flex items-center justify-between text-[0.72rem] text-ink-soft">
                    <span className="truncate">
                      added by <strong className="text-ink font-semibold">{c.creatorName}</strong>
                    </span>
                    <span className="shrink-0 ml-2 font-mono">{c.enrollmentCount} learning</span>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : filteredRoadmaps.length === 0 ? (
          <div className="p-16 text-center text-xs sm:text-sm text-ink-soft bg-surface dark:bg-[#121815] rounded-3xl border border-line dark:border-white/10">
            No community roadmaps match your search.{" "}
            <Link href="/roadmaps/new" className="text-moss font-semibold underline">
              Create the first roadmap
            </Link>
          </div>
        ) : (
          /* Inline Roadmaps Grid (?tab=roadmaps) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredRoadmaps.map((r) => {
              const isExpanded = Boolean(expandedRoadmapIds[r.id]);
              return (
                <div
                  key={r.id}
                  className="bg-surface dark:bg-[#121815] rounded-3xl border border-line dark:border-white/10 p-5 shadow-xs hover:border-moss/40 transition-all flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-9 h-9 rounded-2xl bg-lime-soft dark:bg-[#1f2a1d] flex items-center justify-center text-lg shrink-0">
                          {r.badge || "🎯"}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/roadmaps/${r.slug || r.id}`}
                            className="text-base sm:text-lg font-bold text-ink hover:text-moss transition-colors line-clamp-1"
                          >
                            {r.title}
                          </Link>
                          <p className="text-xs text-ink-soft">
                            by {r.creatorName || "Courseyl Curator"} · {r.stageCount || 0} stages ·{" "}
                            {r.totalCourses || 0} courses ·{" "}
                            {formatTotalDuration(r.totalDurationSeconds || 0)}
                          </p>
                        </div>
                      </div>
                      <span className="text-[0.7rem] font-mono text-ink-soft shrink-0">
                        {r.enrollmentCount || 0} learning
                      </span>
                    </div>

                    {r.description && (
                      <p className="text-xs sm:text-sm text-ink-soft mt-3 line-clamp-2 leading-relaxed">
                        {r.description}
                      </p>
                    )}

                    {isExpanded && Array.isArray(r.stages) && r.stages.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-line/60 dark:border-white/5 space-y-2.5">
                        {r.stages.map((st: any, idx: number) => (
                          <div
                            key={st.id}
                            className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] p-3 text-xs space-y-1"
                          >
                            <p className="font-bold text-ink">
                              Stage {idx + 1}: {st.title}
                            </p>
                            {Array.isArray(st.courses) && st.courses.length > 0 ? (
                              <ul className="space-y-0.5 text-ink-soft pl-3 list-disc">
                                {st.courses.map((c: any) => (
                                  <li key={c.id} className="truncate">
                                    {c.title}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-ink-soft/70 italic">No courses in stage yet.</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-line/60 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpandStages(r.id)}
                        className="px-3.5 py-1.5 rounded-full border border-line dark:border-white/10 text-xs font-semibold text-ink-soft hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        {isExpanded ? "Hide stages" : "View stages"}
                      </button>

                      <Link
                        href={`/roadmaps/${r.slug || r.id}`}
                        className="px-3.5 py-1.5 rounded-full border border-line dark:border-white/10 text-xs font-semibold text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        Open roadmap →
                      </Link>
                    </div>

                    <button
                      type="button"
                      disabled={Boolean(r.isEnrolled) || enrollingId === r.id}
                      onClick={() => handleEnrollRoadmap(r)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        r.isEnrolled
                          ? "bg-[#e4e9c6] text-[#2d3a14] cursor-default"
                          : "bg-[#4b5e1e] dark:bg-[#b8c460] text-white dark:text-[#0f1611] hover:opacity-90"
                      }`}
                    >
                      {r.isEnrolled
                        ? "Enrolled ✓"
                        : enrollingId === r.id
                        ? "Enrolling..."
                        : "Enroll in path"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex bg-paper text-ink">
          <AppSidebar />
          <div className="flex-1 p-12 text-sm text-ink-soft">Loading community...</div>
        </div>
      }
    >
      <CommunityContent />
    </Suspense>
  );
}
