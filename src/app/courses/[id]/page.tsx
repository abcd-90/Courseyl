"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [userState, setUserState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const fetchCourseData = () => {
    fetch(`/api/courses/${resolvedParams.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.course) {
          setCourse(data.course);
          setUserState(data.userState || null);

          // Save to local storage for "Recents" & "My Courses"
          try {
            const stored = localStorage.getItem("courseit_recent_courses");
            const recents = stored ? JSON.parse(stored) : [];
            const updated = [
              {
                id: data.course.id,
                slug: data.course.slug,
                title: data.course.title,
                thumbnailUrl: data.course.thumbnailUrl,
              },
              ...recents.filter((r: any) => r.slug !== data.course.slug && r.id !== data.course.id),
            ].slice(0, 5);
            localStorage.setItem("courseit_recent_courses", JSON.stringify(updated));

            // Also ensure it is enrolled in local state
            const enrolled = localStorage.getItem("courseit_enrolled_courses");
            const enrolledList = enrolled ? JSON.parse(enrolled) : [];
            if (!enrolledList.includes(data.course.slug)) {
              enrolledList.push(data.course.slug);
              localStorage.setItem("courseit_enrolled_courses", JSON.stringify(enrolledList));
            }
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCourseData();
  }, [resolvedParams.id]);

  function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function formatMinutes(seconds: number) {
    const m = Math.round(seconds / 60);
    return `${m}m`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex bg-paper text-ink">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center p-12 text-sm text-ink-soft">
          Loading course syllabus...
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-paper text-ink w-full overflow-x-hidden">
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
  const activeChapter = chapters[selectedDayIndex] || chapters[0];
  const activeChapterLessons = activeChapter?.lessons || [];

  const dayDurationSeconds = activeChapterLessons.reduce(
    (acc: number, l: any) => acc + (l.durationSeconds || 1200),
    0
  );

  const completedLessonsCount = allLessons.filter((l: any) => l.isCompleted).length;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-paper text-ink w-full overflow-x-hidden">
      {/* Application Shell Sidebar */}
      <AppSidebar />

      {/* Main Course Content */}
      <main className="w-full min-w-0 flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-5xl">
        {/* Back navigation */}
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-ink-soft hover:text-ink transition-colors mb-6 group cursor-pointer"
        >
          <span className="transition-transform group-hover:-translate-x-0.5 font-bold">←</span>
          <span>All courses</span>
        </Link>

        {/* Course Header Banner */}
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* YouTube Thumbnail */}
          <div className="relative aspect-video w-full sm:w-44 md:w-52 rounded-xl overflow-hidden border border-line shrink-0 bg-surface shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={course.thumbnailUrl || "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800"}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Course Metadata & Title */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-soft dark:bg-[#1c2717] text-moss dark:text-[#b8c460] text-xs font-semibold border border-line dark:border-[#2b3a1d]">
                <span>{course.source?.channelTitle || course.creator?.profile?.displayName || "Krish Naik"}</span>
                <span>·</span>
                <span>{formatDuration(course.totalDurationSeconds || 40380)}</span>
                <span>·</span>
                <span>{allLessons.length} lessons</span>
              </div>

              {/* Three dots menu */}
              <button
                className="text-ink-soft hover:text-ink p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Options"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="1.75" />
                  <circle cx="12" cy="12" r="1.75" />
                  <circle cx="12" cy="19" r="1.75" />
                </svg>
              </button>
            </div>

            {/* Title styled with distinctive lime-moss font matching Screenshot 2 */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-moss dark:text-[#b8c460] tracking-tight leading-snug mt-3">
              {course.title}
            </h1>
          </div>
        </div>

        {/* Diagnostic Placement Test Banner matching Screenshot 2 */}
        <div className="mt-8 bg-lime-soft/40 dark:bg-[#162111] border border-line dark:border-[#26371a] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm sm:text-base text-ink font-medium">
            Already know some of this? A 2-minute test skips the lessons you know.
          </p>
          <Link
            href={`/courses/${course.slug || course.id}/placement-test`}
            className="px-5 py-2.5 rounded-full bg-[#b8c460] text-[#0f1611] font-semibold text-xs sm:text-sm hover:bg-[#a6b350] transition-colors shrink-0 text-center shadow-xs"
          >
            Take the placement test
          </Link>
        </div>

        {/* Section: Your plan */}
        <div className="mt-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-ink">Your plan</h2>
            <span className="text-xs sm:text-sm text-ink-soft font-mono">
              {completedLessonsCount} / {allLessons.length} lessons done
            </span>
          </div>

          {/* Day Selection Tab Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {chapters.map((chapter: any, idx: number) => {
              const isSelected = selectedDayIndex === idx;
              return (
                <button
                  key={chapter.id || idx}
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[#b8c460] text-[#0f1611] font-semibold shadow-xs"
                      : "bg-surface border border-line text-ink-soft hover:text-ink hover:border-moss/40"
                  }`}
                >
                  <span>{chapter.title || `Day ${idx + 1}`}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#0f1611]" />}
                </button>
              );
            })}
          </div>

          {/* Active Day Sub-Header */}
          <div className="flex items-center gap-3 mt-6 mb-4">
            <h3 className="font-bold text-base text-ink">
              {activeChapter?.title || `Day ${selectedDayIndex + 1}`}
            </h3>
            <span className="text-xs sm:text-sm text-ink-soft">
              {activeChapterLessons.length} lessons · {formatDuration(dayDurationSeconds)}
            </span>
            {selectedDayIndex === 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-lime-soft text-moss font-semibold text-[0.68rem]">
                Today
              </span>
            )}
          </div>

          {/* Lessons list for active Day */}
          <div className="space-y-3">
            {activeChapterLessons.map((lesson: any, lIdx: number) => (
              <Link
                key={lesson.id}
                href={`/courses/${course.slug || course.id}/learn/${lesson.id}`}
                className="bg-surface/90 border border-line hover:border-moss/50 rounded-2xl p-4 transition-all flex items-center justify-between gap-4 group cursor-pointer shadow-xs block"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Lesson circle index */}
                  <div className="w-8 h-8 rounded-full bg-lime-soft dark:bg-[#1b2716] text-moss dark:text-[#b8c460] font-bold text-xs flex items-center justify-center shrink-0">
                    {lIdx + 1}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm sm:text-base font-semibold text-ink group-hover:text-moss transition-colors truncate sm:whitespace-normal">
                      {lesson.title}
                    </h4>
                    <p className="text-xs text-ink-soft line-clamp-1 mt-0.5">
                      {lesson.description}
                    </p>
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
      </main>
    </div>
  );
}
