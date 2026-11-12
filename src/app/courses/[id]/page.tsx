"use client";

import React, { useEffect, useState, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { getCleanThumbnailUrl } from "@/lib/thumbnail";
import { clampDailyStudyMinutes, groupLessonsIntoDayBins } from "@/lib/pacing";

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [userState, setUserState] = useState<any>(null);
  const [dailyMinutes, setDailyMinutes] = useState<number>(60);
  const [loading, setLoading] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Skipped lessons inline drawer
  const [showSkippedPanel, setShowSkippedPanel] = useState(false);
  const [togglingLessonId, setTogglingLessonId] = useState<string | null>(null);

  // Three-dots options menu & toast
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Add to Roadmap / Stage modal
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);
  const [roadmapsLoading, setRoadmapsLoading] = useState(false);
  const [userRoadmaps, setUserRoadmaps] = useState<any[]>([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState("");
  const [selectedStageId, setSelectedStageId] = useState("");
  const [newRoadmapTitle, setNewRoadmapTitle] = useState("");
  const [addingToRoadmap, setAddingToRoadmap] = useState(false);

  const showNotice = (text: string, isError = false) => {
    setToastMsg({ text, isError });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchCourseData = () => {
    fetch(`/api/courses/${resolvedParams.id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.course) {
          setCourse(data.course);
          setUserState(data.userState || null);
          if (typeof data.userState?.dailyStudyMinutes === "number") {
            setDailyMinutes(clampDailyStudyMinutes(data.userState.dailyStudyMinutes, 60));
          }

          // Save to local storage for "Recents" & "My Courses"
          try {
            const stored = localStorage.getItem("courseit_recent_courses");
            const recents = stored ? JSON.parse(stored) : [];
            const thumb = getCleanThumbnailUrl(
              data.course.thumbnailUrl,
              data.course.slug,
              data.course.source?.youtubeId
            );
            const updated = [
              {
                id: data.course.id,
                slug: data.course.slug,
                title: data.course.title,
                thumbnail: thumb,
                thumbnailUrl: thumb,
                progress: data.userState?.progressPercentage || 0,
              },
              ...recents.filter((r: any) => r.slug !== data.course.slug && r.id !== data.course.id),
            ].slice(0, 5);
            localStorage.setItem("courseit_recent_courses", JSON.stringify(updated));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCourseData();

    const handleUserUpdated = (e: any) => {
      const updatedMins = e?.detail?.profile?.dailyStudyMinutes;
      if (updatedMins) {
        setDailyMinutes(clampDailyStudyMinutes(updatedMins, 60));
      } else {
        fetchCourseData();
      }
    };
    window.addEventListener("user-updated", handleUserUpdated);
    return () => window.removeEventListener("user-updated", handleUserUpdated);
  }, [resolvedParams.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function formatMinutes(seconds: number) {
    const m = Math.max(1, Math.round(seconds / 60));
    return `${m}m`;
  }

  const handleToggleVisibility = async () => {
    if (!course || togglingVisibility) return;
    setTogglingVisibility(true);
    setShowOptionsMenu(false);

    try {
      const targetPublic = !course.isPublic;
      const res = await fetch(`/api/courses/${course.slug || course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: targetPublic }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?next=/courses/${course.slug || course.id}`);
          return;
        }
        showNotice(data.error || "Unable to update visibility.", true);
        return;
      }

      setCourse((prev: any) => (prev ? { ...prev, isPublic: data.isPublic } : prev));
      showNotice(
        data.isPublic
          ? "Course published to Community."
          : "Course moved to your Private library."
      );
    } catch {
      showNotice("Failed to update course visibility.", true);
    } finally {
      setTogglingVisibility(false);
    }
  };

  const openAddToRoadmapModal = async () => {
    setShowOptionsMenu(false);
    setShowRoadmapModal(true);
    setRoadmapsLoading(true);
    try {
      const res = await fetch("/api/roadmaps", { cache: "no-store" });
      if (res.status === 401) {
        router.push(`/login?next=/courses/${course?.slug || resolvedParams.id}`);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data.userRoadmaps) ? data.userRoadmaps : [];
      setUserRoadmaps(list);
      if (list.length > 0) {
        setSelectedRoadmapId(list[0].id);
        setSelectedStageId(list[0].stages?.[0]?.id || "");
      }
    } catch {
      setUserRoadmaps([]);
    } finally {
      setRoadmapsLoading(false);
    }
  };

  const handleAddToRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course || addingToRoadmap) return;
    setAddingToRoadmap(true);

    try {
      let targetRoadmapId = selectedRoadmapId;
      let targetStageId = selectedStageId;

      if (!targetRoadmapId && newRoadmapTitle.trim()) {
        const createRes = await fetch("/api/roadmaps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newRoadmapTitle.trim(),
            description: "Personal learning roadmap",
            stages: [{ title: "Stage 1", description: "", courseIds: [course.id] }],
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
          if (createRes.status === 401) {
            router.push(`/login?next=/courses/${course.slug || course.id}`);
            return;
          }
          showNotice(createData.error || "Could not create roadmap.", true);
          return;
        }
        setShowRoadmapModal(false);
        setNewRoadmapTitle("");
        showNotice(`Created "${createData.roadmap?.title || "Roadmap"}" with this course.`);
        return;
      }

      if (!targetRoadmapId) {
        showNotice("Select a roadmap or enter a new roadmap title.", true);
        return;
      }

      const addRes = await fetch(`/api/roadmaps/${targetRoadmapId}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageId: targetStageId || undefined,
          courseId: course.id,
        }),
      });
      const addData = await addRes.json();
      if (!addRes.ok) {
        if (addRes.status === 401) {
          router.push(`/login?next=/courses/${course.slug || course.id}`);
          return;
        }
        showNotice(addData.error || "Failed to add course to stage.", true);
        return;
      }

      setShowRoadmapModal(false);
      showNotice("Course added to roadmap stage!");
    } catch {
      showNotice("Error adding course to roadmap.", true);
    } finally {
      setAddingToRoadmap(false);
    }
  };

  const handleToggleSkipLesson = async (lessonId: string, currentSkipped: boolean) => {
    if (!course || togglingLessonId) return;
    setTogglingLessonId(lessonId);
    const nextSkipped = !currentSkipped;

    try {
      const res = await fetch(
        `/api/courses/${course.slug || course.id}/lessons/${lessonId}/toggle-skip`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isSkipped: nextSkipped }),
        }
      );
      if (res.ok) {
        setCourse((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            chapters: (prev.chapters || []).map((ch: any) => ({
              ...ch,
              lessons: (ch.lessons || []).map((l: any) =>
                l.id === lessonId ? { ...l, isSkipped: nextSkipped } : l
              ),
            })),
          };
        });
      }
    } catch {} finally {
      setTogglingLessonId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-paper text-ink">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center p-12 text-sm text-ink-soft">
          Loading course syllabus...
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-paper text-ink w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <h2 className="text-xl font-bold text-ink">Course not found</h2>
          <Link href="/dashboard" className="mt-4 px-5 py-2 rounded-full bg-[#b8c460] text-[#0f1611] font-semibold text-sm hover:bg-[#a6b350]">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const chapters = course.chapters || [];
  const allLessons = chapters.flatMap((ch: any) => ch.lessons || []);
  const skippedLessonsList = allLessons.filter((l: any) => l.isSkipped);
  const completedLessonsCount = allLessons.filter((l: any) => l.isCompleted).length;

  // Dynamic runtime Day bins paced by user dailyStudyMinutes without mutating DB Chapter rows
  const dayBins = groupLessonsIntoDayBins(chapters, dailyMinutes);
  const safeSelectedDayIndex =
    dayBins.length > 0 ? Math.min(selectedDayIndex, dayBins.length - 1) : 0;
  const activeBin = dayBins[safeSelectedDayIndex];
  const activeDayLessons = activeBin?.lessons || [];
  const dayDurationSeconds =
    activeBin?.activeDurationSeconds ??
    activeDayLessons.reduce((acc: number, l: any) => acc + (l.durationSeconds || 1200), 0);

  const selectedRoadmapObj = userRoadmaps.find((r) => r.id === selectedRoadmapId);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-paper text-ink w-full">
      <AppSidebar />

      <main className="w-full min-w-0 flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-5xl">
        {/* Back navigation & Toast */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/community"
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-ink-soft hover:text-ink transition-colors group cursor-pointer"
          >
            <span className="transition-transform group-hover:-translate-x-0.5 font-bold">←</span>
            <span>All courses</span>
          </Link>

          {toastMsg && (
            <div
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs ${
                toastMsg.isError
                  ? "bg-red-100 text-red-700 border border-red-200"
                  : "bg-[#e4e9c6] text-[#2d3a14] border border-[#b8c460]/50"
              }`}
            >
              {toastMsg.text}
            </div>
          )}
        </div>

        {/* Course Header Banner */}
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="relative aspect-video w-full sm:w-44 md:w-52 rounded-xl overflow-hidden border border-line shrink-0 bg-surface shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getCleanThumbnailUrl(course.thumbnailUrl, course.slug, course.source?.youtubeId)}
              alt={course.title}
              className="w-full h-full object-cover"
            />
            {course.isPublic === false && (
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/80 text-white text-[0.65rem] font-semibold backdrop-blur-xs">
                🔒 Private
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-soft dark:bg-[#1c2717] text-moss dark:text-[#b8c460] text-xs font-semibold border border-line dark:border-[#2b3a1d]">
                  <span>{course.channelTitle || course.source?.channelTitle || course.creatorName || "YouTube Creator"}</span>
                  <span>·</span>
                  <span>{formatDuration(course.totalDurationSeconds || 39240)}</span>
                  <span>·</span>
                  <span>{allLessons.length} lessons</span>
                </div>
                {course.isPublic === false && (
                  <span className="px-2.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-ink-soft text-[0.68rem] font-semibold">
                    Private course
                  </span>
                )}
              </div>

              {/* Three dots Options Menu */}
              <div className="relative" ref={optionsRef}>
                <button
                  type="button"
                  onClick={() => setShowOptionsMenu((prev) => !prev)}
                  className="text-ink-soft hover:text-ink p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Course options"
                  aria-label="Course options"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="1.75" />
                    <circle cx="12" cy="12" r="1.75" />
                    <circle cx="12" cy="19" r="1.75" />
                  </svg>
                </button>

                {showOptionsMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-surface dark:bg-[#121815] border border-line dark:border-white/10 p-1.5 shadow-xl z-30 space-y-1">
                    {userState?.canManageVisibility && (
                      <button
                        type="button"
                        onClick={handleToggleVisibility}
                        disabled={togglingVisibility}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-ink hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span>
                          {course.isPublic ? "Move to Private" : "Make course public"}
                        </span>
                        <span className="text-[0.68rem] text-ink-soft">
                          {course.isPublic ? "🔒" : "🌐"}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={openAddToRoadmapModal}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-ink hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span>Add to stage / roadmap</span>
                      <span className="text-[0.7rem] text-ink-soft">+</span>
                    </button>

                    <Link
                      href="/planner"
                      onClick={() => setShowOptionsMenu(false)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-ink hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span>Daily pace: {dailyMinutes}m / day</span>
                      <span className="text-[0.68rem] text-ink-soft">Edit</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] font-serif italic text-[#2c3e1b] dark:text-[#b8c460] tracking-tight leading-[1.2] mt-3 font-normal">
              {course.title}
            </h1>
          </div>
        </div>

        {/* Diagnostic Placement Test Banner */}
        <div className="mt-8 bg-lime-soft/40 dark:bg-[#162111] border border-line dark:border-[#26371a] rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {userState?.hasCompletedPlacementTest ? (
              <div className="space-y-1">
                <p className="text-sm sm:text-base text-ink font-medium">
                  Placement test:{" "}
                  <strong className="font-bold text-moss dark:text-[#b8c460]">
                    {userState.placementScore ?? 0}%
                  </strong>
                  . {skippedLessonsList.length} lesson
                  {skippedLessonsList.length === 1 ? "" : "s"} skipped in your plan.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSkippedPanel((prev) => !prev)}
                  className="text-xs font-semibold text-moss dark:text-[#b8c460] hover:underline cursor-pointer"
                >
                  {showSkippedPanel
                    ? "Hide skipped lessons"
                    : "See or change skipped lessons"}
                </button>
              </div>
            ) : (
              <p className="text-sm sm:text-base text-ink font-medium">
                Already know some of this? A 2-minute test skips the lessons you know.
              </p>
            )}

            <Link
              href={`/courses/${course.slug || course.id}/placement-test`}
              className="px-5 py-2.5 rounded-full bg-[#2d3a14] dark:bg-[#b8c460] text-white dark:text-[#0f1611] font-semibold text-xs sm:text-sm hover:bg-[#202a0e] dark:hover:bg-[#a6b350] transition-colors shrink-0 text-center shadow-xs cursor-pointer"
            >
              {userState?.hasCompletedPlacementTest
                ? "Retake placement test"
                : "Take the placement test"}
            </Link>
          </div>

          {showSkippedPanel && (
            <div className="pt-3 border-t border-line/70 dark:border-[#26371a] space-y-2 max-h-64 overflow-y-auto">
              <p className="text-xs text-ink-soft mb-2">
                Flip any lesson below to skip or include it in your study plan:
              </p>
              {allLessons.map((l: any, idx: number) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-3 py-1.5 px-2.5 rounded-xl bg-surface/70 dark:bg-[#0d140f]/80 text-xs"
                >
                  <span
                    className={`truncate ${
                      l.isSkipped ? "line-through text-ink-soft/70" : "text-ink font-medium"
                    }`}
                  >
                    {idx + 1}. {l.title}
                  </span>
                  <button
                    type="button"
                    disabled={togglingLessonId === l.id}
                    onClick={() => handleToggleSkipLesson(l.id, Boolean(l.isSkipped))}
                    className={`px-2.5 py-1 rounded-full text-[0.68rem] font-semibold shrink-0 cursor-pointer transition-colors ${
                      l.isSkipped
                        ? "bg-black/10 dark:bg-white/10 text-ink-soft hover:text-ink"
                        : "bg-[#4b5e1e] dark:bg-[#b8c460] text-white dark:text-[#0f1611]"
                    }`}
                  >
                    {l.isSkipped ? "Skipped · Include" : "In plan · Skip"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section: Your plan (Runtime Pacing View) */}
        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-ink">Your plan</h2>
              <Link
                href="/settings"
                className="text-xs px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/5 text-ink-soft hover:text-ink transition-colors"
                title="Adjust your daily study goal"
              >
                {dailyMinutes}m / day pace
              </Link>
            </div>
            <span className="text-xs sm:text-sm text-ink-soft font-mono">
              {completedLessonsCount} / {allLessons.length} lessons done
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {dayBins.map((bin, idx) => {
              const isSelected = safeSelectedDayIndex === idx;
              return (
                <button
                  key={bin.dayNumber}
                  type="button"
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`px-5 py-2 rounded-full text-xs sm:text-sm transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[#2d3a14] dark:bg-[#b8c460] text-white dark:text-[#0f1611] font-semibold shadow-xs"
                      : "bg-surface dark:bg-[#121815] border border-line dark:border-white/10 text-ink font-normal hover:border-ink/40"
                  }`}
                >
                  <span>Day {bin.dayNumber}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#0f1611]" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mt-6 mb-4">
            <h3 className="font-bold text-base text-ink">
              Day {safeSelectedDayIndex + 1}
            </h3>
            <span className="text-xs sm:text-sm text-ink-soft">
              {activeDayLessons.length} lessons · {formatDuration(dayDurationSeconds)}
            </span>
            {safeSelectedDayIndex === 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#2d3a14] dark:bg-[#b8c460] text-white dark:text-[#0f1611] font-semibold text-[0.68rem]">
                Today
              </span>
            )}
          </div>

          <div className="space-y-3">
            {activeDayLessons.map((lesson: any, lIdx: number) => (
              <Link
                key={lesson.id}
                href={`/courses/${course.slug || course.id}/learn/${lesson.id}`}
                className={`bg-surface/90 border border-line hover:border-moss/50 rounded-2xl p-4 transition-all flex items-center justify-between gap-4 group cursor-pointer shadow-xs block ${
                  lesson.isSkipped ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-lime-soft dark:bg-[#1b2716] text-moss dark:text-[#b8c460] font-bold text-xs flex items-center justify-center shrink-0">
                    {lesson.isCompleted ? "✓" : lIdx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-sm sm:text-base font-semibold text-ink group-hover:text-moss transition-colors truncate sm:whitespace-normal ${
                          lesson.isSkipped ? "line-through" : ""
                        }`}
                      >
                        {lesson.title}
                      </h4>
                      {lesson.isSkipped && (
                        <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-[0.65rem] font-mono text-ink-soft shrink-0">
                          SKIPPED
                        </span>
                      )}
                    </div>
                    {(lesson.description || lesson.summary) && (
                      <p className="text-xs text-ink-soft/90 line-clamp-1 mt-0.5 font-normal tracking-tight">
                        {lesson.description || lesson.summary}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs text-ink-soft font-mono">
                    {formatMinutes(lesson.durationSeconds || 1200)}
                  </span>
                  <span className="hidden sm:flex items-center gap-1 text-xs text-ink-soft">
                    <svg className="w-3.5 h-3.5 text-moss" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Notes and quiz</span>
                  </span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft group-hover:text-moss group-hover:bg-moss/10 transition-colors">
                    <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Add to Stage / Roadmap Modal */}
        {showRoadmapModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-surface dark:bg-[#121815] border border-line dark:border-white/10 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-bold text-ink">
                  Add to Stage / Roadmap
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRoadmapModal(false)}
                  className="text-xs text-ink-soft hover:text-ink px-2 py-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {roadmapsLoading ? (
                <p className="text-xs text-ink-soft py-4">Loading your roadmaps...</p>
              ) : (
                <form onSubmit={handleAddToRoadmap} className="space-y-4">
                  {userRoadmaps.length > 0 && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
                          Select Roadmap
                        </label>
                        <select
                          value={selectedRoadmapId}
                          onChange={(e) => {
                            const rm = userRoadmaps.find((r) => r.id === e.target.value);
                            setSelectedRoadmapId(e.target.value);
                            setSelectedStageId(rm?.stages?.[0]?.id || "");
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-line dark:border-white/15 bg-white dark:bg-[#0c120e] text-sm text-ink outline-none"
                        >
                          {userRoadmaps.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.title}
                            </option>
                          ))}
                          <option value="">+ Create a new roadmap...</option>
                        </select>
                      </div>

                      {selectedRoadmapObj && selectedRoadmapObj.stages?.length > 0 && (
                        <div>
                          <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
                            Target Stage
                          </label>
                          <select
                            value={selectedStageId}
                            onChange={(e) => setSelectedStageId(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-line dark:border-white/15 bg-white dark:bg-[#0c120e] text-sm text-ink outline-none"
                          >
                            {selectedRoadmapObj.stages.map((st: any) => (
                              <option key={st.id} value={st.id}>
                                {st.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}

                  {(!selectedRoadmapId || userRoadmaps.length === 0) && (
                    <div>
                      <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
                        New Roadmap Title
                      </label>
                      <input
                        type="text"
                        value={newRoadmapTitle}
                        onChange={(e) => setNewRoadmapTitle(e.target.value)}
                        placeholder="e.g. Full-Stack AI Engineer"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-line dark:border-white/15 bg-white dark:bg-[#0c120e] text-sm text-ink outline-none"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRoadmapModal(false)}
                      className="px-4 py-2 rounded-full border border-line dark:border-white/15 text-xs font-semibold text-ink-soft hover:text-ink cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingToRoadmap}
                      className="px-5 py-2 rounded-full bg-[#4b5e1e] dark:bg-[#b8c460] text-white dark:text-[#0f1611] text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    >
                      {addingToRoadmap ? "Adding..." : "Add to roadmap"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
