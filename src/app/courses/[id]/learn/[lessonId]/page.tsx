"use client";

import React, { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";

export default function LessonLearnPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [lesson, setLesson] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [navigation, setNavigation] = useState<any>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"my-notes" | "study-notes">("my-notes");
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState("1x");
  const [loading, setLoading] = useState(true);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/lessons/${resolvedParams.lessonId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.lesson) {
          setLesson(data.lesson);
          setCourse({
            id: data.lesson.courseId,
            slug: data.lesson.courseSlug || resolvedParams.id,
            title: data.lesson.courseTitle || "Best Python + AI Full Course",
            channelTitle: data.lesson.channelTitle || "Mayank Aggarwal",
            thumbnailUrl: data.lesson.thumbnailUrl,
          });
          setNavigation(data.navigation || null);
          setQuizQuestions(data.quizQuestions || []);
          setCompleted(data.progress?.isCompleted || false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch full course chapters to display syllabus
    fetch(`/api/courses/${resolvedParams.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.course?.chapters) {
          setChapters(data.course.chapters);
          const foundIdx = data.course.chapters.findIndex((ch: any) =>
            ch.lessons?.some((l: any) => l.id === resolvedParams.lessonId)
          );
          if (foundIdx !== -1) {
            setSelectedDayIndex(foundIdx);
          }
        }
      })
      .catch(() => {});

    // Fetch notes for this lesson
    fetch(`/api/lessons/${resolvedParams.lessonId}/notes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.notes) {
          setNotes(data.notes);
        }
      })
      .catch(() => {});
  }, [resolvedParams.id, resolvedParams.lessonId]);

  const seekToTimestamp = (seconds: number) => {
    setCurrentTime(seconds);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [seconds, true],
        }),
        "*"
      );
    }
  };

  const handleMarkComplete = async () => {
    try {
      const nextState = !completed;
      setCompleted(nextState);
      await fetch(`/api/lessons/${resolvedParams.lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: nextState }),
      });
    } catch {
      // optimistic
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    try {
      const res = await fetch(`/api/lessons/${resolvedParams.lessonId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newNoteContent.trim(),
          timestampSeconds: Math.floor(currentTime),
        }),
      });
      const data = await res.json();
      if (res.ok && data.note) {
        setNotes([data.note, ...notes]);
        setNewNoteContent("");
      }
    } catch {
      // fallback local append
      setNotes([
        {
          id: "note_" + Date.now(),
          content: newNoteContent.trim(),
          timestampSeconds: Math.floor(currentTime),
          createdAt: new Date().toISOString(),
        },
        ...notes,
      ]);
      setNewNoteContent("");
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const courseSlug = lesson?.courseSlug || course?.slug || resolvedParams.id;
  const courseTitle = course?.title || lesson?.courseTitle || "Full-Stack AI Engineering Course (FastAPI, LLMs, Docker, Supabase)";

  // Compute lesson index and totals
  const allLessons = navigation?.allLessons || [];
  const currentLessonIndex = allLessons.findIndex((l: any) => l.id === resolvedParams.lessonId);
  const totalLessons = allLessons.length || 14;
  const prevLesson = navigation?.prevLesson || (currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null);
  const nextLesson = navigation?.nextLesson || (currentLessonIndex < totalLessons - 1 ? allLessons[currentLessonIndex + 1] : null);

  if (loading && !lesson) {
    return (
      <div className="min-h-screen flex bg-paper text-ink">
        <AppSidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-3 border-moss border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-ink-soft">Loading course lesson...</p>
          </div>
        </main>
      </div>
    );
  }

  const selectedChapter = chapters[selectedDayIndex] || chapters[0];
  const dayLessons = selectedChapter?.lessons || [];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-paper text-ink w-full overflow-x-hidden">
      {/* Left Application Sidebar */}
      <AppSidebar />

      {/* Main Lesson Player Container */}
      <main className="w-full min-w-0 flex-1 min-h-screen flex flex-col overflow-y-auto">
        {/* Top Header Bar matching Screenshot 1 */}
        <header className="h-14 px-4 sm:px-8 border-b border-line dark:border-white/5 flex items-center justify-between shrink-0 bg-paper sticky top-0 z-20">
          <Link
            href={`/courses/${courseSlug}`}
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-ink-soft hover:text-ink transition-colors truncate max-w-xl"
          >
            <span className="text-base leading-none">←</span>
            <span className="truncate">{courseTitle}</span>
          </Link>

          <div className="flex items-center gap-3 shrink-0">
            {/* Mark as completed CTA */}
            <button
              onClick={handleMarkComplete}
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                completed
                  ? "bg-[#25321d] text-[#b8c460] border border-[#3b4e28]"
                  : "bg-[#b8c460] text-[#0f1611] hover:bg-[#a6b350]"
              }`}
            >
              <span>✓</span>
              <span>{completed ? "Completed" : "Mark as completed"}</span>
            </button>

            {/* Prev / Next Lesson Arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => prevLesson && router.push(`/courses/${courseSlug}/learn/${prevLesson.id}`)}
                disabled={!prevLesson}
                className="w-8 h-8 rounded-full border border-line dark:border-white/10 flex items-center justify-center text-xs text-ink hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous lesson"
              >
                ‹
              </button>
              <button
                onClick={() => nextLesson && router.push(`/courses/${courseSlug}/learn/${nextLesson.id}`)}
                disabled={!nextLesson}
                className="w-8 h-8 rounded-full border border-line dark:border-white/10 flex items-center justify-center text-xs text-ink hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next lesson"
              >
                ›
              </button>
            </div>
          </div>
        </header>

        {/* 2-Column Learning Workspace */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-[1500px] w-full min-w-0 mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Left Column: Video, Creator & Notes (8 cols) */}
          <div className="lg:col-span-8 min-w-0 w-full flex flex-col space-y-5">
            {/* Video Player Card */}
            <div className="bg-surface dark:bg-[#090e0b] rounded-3xl border border-line dark:border-white/10 overflow-hidden shadow-md">
              <div className="relative aspect-video bg-black">
                <iframe
                  ref={iframeRef}
                  src={`https://www.youtube.com/embed/${lesson?.youtubeVideoId || "J9BI0jGOds8"}?start=${lesson?.startSeconds || 0}&autoplay=0&enablejsapi=1&rel=0`}
                  title={lesson?.title || "Lesson Video"}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Video Player Controls Bar */}
              <div className="p-3.5 bg-surface dark:bg-[#0c120e] border-t border-line dark:border-white/5 flex items-center justify-between text-xs text-ink-soft select-none">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="text-ink hover:text-moss text-base transition-colors cursor-pointer"
                    title="Play / Pause"
                  >
                    ▷
                  </button>
                  <button
                    onClick={() => seekToTimestamp(Math.max(0, currentTime - 10))}
                    className="hover:text-ink text-sm transition-colors cursor-pointer"
                    title="Rewind 10 seconds"
                  >
                    ↺
                  </button>
                  <button
                    onClick={() => seekToTimestamp(lesson?.startSeconds || 0)}
                    className="hover:text-ink text-sm transition-colors cursor-pointer"
                    title="Restart lesson"
                  >
                    ↻
                  </button>
                  <span className="font-mono text-[0.75rem] text-ink">
                    {formatTime(currentTime)} / {formatTime(lesson?.durationSeconds || 417)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button className="hover:text-ink px-1.5 py-0.5 rounded border border-line dark:border-white/10 text-[0.7rem] font-bold">
                    CC
                  </button>
                  <button
                    onClick={() => {
                      const speeds = ["1x", "1.25x", "1.5x", "2x"];
                      const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
                      setPlaybackSpeed(next);
                    }}
                    className="hover:text-ink text-xs font-semibold px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    {playbackSpeed}
                  </button>
                  <button className="hover:text-ink text-sm">🔊</button>
                  <button className="hover:text-ink text-sm">⛶</button>
                </div>
              </div>
            </div>

            {/* YouTube Embed Restriction Notice & Direct YouTube Link */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>If video says &quot;Playback on other websites has been disabled by video owner&quot;:</span>
              </div>
              <a
                href={`https://www.youtube.com/watch?v=${lesson?.youtubeVideoId || "J9BI0jGOds8"}&t=${lesson?.startSeconds || 0}s`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-400 text-[#0f1611] font-bold text-xs hover:bg-amber-300 transition-colors shadow-xs"
              >
                <span>Watch on YouTube at {formatTime(lesson?.startSeconds || 0)}</span>
                <span>↗</span>
              </a>
            </div>

            {/* Autoplay Next Lesson Toggle */}
            <div className="flex items-center justify-end gap-2.5 px-1 text-xs text-ink-soft">
              <span>Autoplay next lesson</span>
              <button
                onClick={() => setAutoplayNext(!autoplayNext)}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                  autoplayNext ? "bg-[#b8c460]" : "bg-black/20 dark:bg-white/20"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white dark:bg-[#0f1611] shadow-xs transition-transform ${
                    autoplayNext ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Lesson Title & Summary */}
            <div className="space-y-2 pt-1">
              <h1 className="text-2xl sm:text-[1.75rem] font-display font-bold text-ink leading-tight">
                {lesson?.title || "Course Introduction & Project Overview"}
              </h1>
              <p className="text-sm text-ink-soft leading-relaxed">
                {lesson?.description || "7m · Understand the full-stack AI customer support system architecture and the end-to-end project scope covering Gmail, FastAPI, Supabase, LLMs, Docker, and a React admin dashboard."}
              </p>
            </div>

            {/* Creator Row matching Screenshot 1 */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface dark:bg-[#0d140f] border border-line dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[#182315] border border-line dark:border-white/10 shrink-0 flex items-center justify-center font-bold text-sm text-[#b8c460]">
                  {course?.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.thumbnailUrl}
                      alt={course?.channelTitle || "Instructor"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(course?.channelTitle || "M").charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ink leading-tight">{course?.channelTitle || "Mayank Aggarwal"}</h4>
                  <p className="text-xs text-ink-soft leading-tight mt-0.5">Verified Instructor</p>
                </div>
              </div>

              <a
                href={`https://youtube.com/watch?v=${lesson?.youtubeVideoId || "XzjSx7u9mGw"}&t=${lesson?.startSeconds || 0}s`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-1.5 rounded-full border border-line dark:border-white/10 text-xs font-semibold text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
              >
                <span>Open YouTube ({formatTime(lesson?.startSeconds || 0)})</span>
                <span className="text-[0.7rem]">↗</span>
              </a>
            </div>

            {/* Notes Section matching Screenshot 1 */}
            <div className="pt-3 space-y-4">
              {/* Tabs */}
              <div className="flex items-center gap-6 border-b border-line dark:border-white/10 pb-2 text-sm font-semibold">
                <button
                  onClick={() => setActiveTab("my-notes")}
                  className={`pb-2 relative cursor-pointer transition-colors ${
                    activeTab === "my-notes"
                      ? "text-ink font-bold"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  My notes
                  {activeTab === "my-notes" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#b8c460] rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("study-notes")}
                  className={`pb-2 relative cursor-pointer transition-colors ${
                    activeTab === "study-notes"
                      ? "text-ink font-bold"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Study notes
                  {activeTab === "study-notes" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#b8c460] rounded-full" />
                  )}
                </button>
              </div>

              {activeTab === "my-notes" ? (
                <div className="space-y-4">
                  {/* Note Intake Box */}
                  <form
                    onSubmit={handleAddNote}
                    className="bg-surface dark:bg-[#0c120e] rounded-3xl border border-line dark:border-[#263528] p-4 sm:p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs text-ink-soft pb-1">
                      <span className="flex items-center gap-1.5 font-mono text-[0.72rem] text-moss dark:text-[#b8c460]">
                        <span>🕒</span>
                        <span>at the video&apos;s time</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentTime(Date.now() % 417)}
                        className="text-[0.72rem] underline hover:text-ink text-ink-soft cursor-pointer"
                      >
                        Use the video&apos;s time now
                      </button>
                    </div>

                    <textarea
                      ref={noteInputRef}
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="What clicked at this moment? The time is taken when you start typing."
                      rows={3}
                      className="w-full bg-transparent text-sm text-ink dark:text-white placeholder-ink-soft/60 outline-none resize-none"
                    />

                    <div className="pt-2 border-t border-line dark:border-white/5 flex items-center justify-between text-xs text-ink-soft">
                      <span className="text-[0.7rem]">⌘ Enter to add</span>
                      <button
                        type="submit"
                        disabled={!newNoteContent.trim()}
                        className="px-4 py-1.5 rounded-full bg-[#2a371c] dark:bg-[#1f2b15] text-[#b8c460] hover:bg-[#3b4e28] text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        Add note
                      </button>
                    </div>
                  </form>

                  {/* Notes Feed or Empty State */}
                  {notes.length === 0 ? (
                    <p className="text-xs text-ink-soft/80 px-2 py-2">
                      No notes yet. Pause on anything worth keeping and write it down; it stays pinned to that moment.
                    </p>
                  ) : (
                    <div className="space-y-3 pt-2">
                      {notes.map((n) => (
                        <div
                          key={n.id}
                          className="p-3.5 rounded-2xl bg-surface dark:bg-[#0d140f] border border-line dark:border-white/10 flex items-start gap-3 text-ink"
                        >
                          <button
                            onClick={() => seekToTimestamp(n.timestampSeconds)}
                            className="px-2 py-0.5 rounded-md bg-lime-soft dark:bg-[#1c2717] text-moss dark:text-[#b8c460] font-mono text-xs font-semibold shrink-0 cursor-pointer"
                          >
                            {formatTime(n.timestampSeconds || 0)}
                          </button>
                          <p className="text-xs sm:text-sm text-ink leading-relaxed">{n.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Study Notes AI Summary Tab */
                <div className="bg-surface dark:bg-[#0d140f] rounded-3xl border border-line dark:border-white/10 p-6 space-y-5 text-ink">
                  <div>
                    <h3 className="text-sm font-bold text-ink mb-2">Lesson Key Takeaways</h3>
                    <ul className="space-y-2 text-xs sm:text-sm text-ink-soft list-disc list-inside">
                      <li>Full-stack AI systems integrate decoupled asynchronous APIs with streaming LLM agents.</li>
                      <li>FastAPI provides native asynchronous support and strict Pydantic v2 data validation schemas.</li>
                      <li>Supabase pgvector facilitates cosine similarity queries across stored customer inquiry vectors.</li>
                      <li>Docker and Docker Compose ensure reproducible multi-container orchestrations in production.</li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-line dark:border-white/10">
                    <h3 className="text-sm font-bold text-ink mb-2">Architectural Concepts</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full bg-lime-soft dark:bg-[#182315] text-moss dark:text-[#b8c460] text-xs font-semibold">
                        Server-Sent Events (SSE)
                      </span>
                      <span className="px-3 py-1 rounded-full bg-lime-soft dark:bg-[#182315] text-moss dark:text-[#b8c460] text-xs font-semibold">
                        pgvector Cosine Search
                      </span>
                      <span className="px-3 py-1 rounded-full bg-lime-soft dark:bg-[#182315] text-moss dark:text-[#b8c460] text-xs font-semibold">
                        LangGraph Agent State
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Course Syllabus & Study Tools (4 cols) */}
          <div className="lg:col-span-4 min-w-0 w-full flex flex-col space-y-6">
            {/* Syllabus Card */}
            <div className="bg-surface dark:bg-[#0c120e] rounded-3xl border border-line dark:border-white/10 p-5 shadow-sm space-y-4 w-full min-w-0 overflow-hidden">
              <div>
                <h3 className="text-sm font-bold text-ink truncate leading-tight">
                  {courseTitle}
                </h3>
                <p className="text-xs text-ink-soft mt-1">
                  Lesson {currentLessonIndex + 1} of {totalLessons} · {completed ? "1" : "0"} done
                </p>
              </div>

              {/* Day Pills Bar with Horizontal Scroll Snap */}
              <div className="w-full min-w-0 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 scroll-smooth">
                {chapters.map((ch, idx) => {
                  const isSelected = selectedDayIndex === idx;
                  return (
                    <button
                      key={ch.id || idx}
                      onClick={() => setSelectedDayIndex(idx)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? "bg-[#28381a] text-[#b8c460] border border-[#3e5628] shadow-xs"
                          : "bg-surface dark:bg-[#151c17] text-ink-soft border border-line dark:border-white/10 hover:text-ink hover:border-moss/40"
                      }`}
                    >
                      Day {idx + 1} {isSelected ? "•" : ""}
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Name / Topic Subtitle Focus Card */}
              {chapters[selectedDayIndex]?.title && (
                <div className="px-3 py-2 rounded-xl bg-black/5 dark:bg-[#141d16] border border-line dark:border-white/5">
                  <span className="text-[0.65rem] uppercase tracking-wider font-mono text-[#b8c460] font-bold block">
                    Day {selectedDayIndex + 1} Focus
                  </span>
                  <p className="text-xs text-ink font-medium truncate mt-0.5">
                    {chapters[selectedDayIndex].title.replace(/^Day\s*\d+\s*[\(:]?/, "").replace(/\)$/, "").trim() || chapters[selectedDayIndex].title}
                  </p>
                </div>
              )}

              {/* Lessons List for Selected Day */}
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {dayLessons.map((l: any, idx: number) => {
                  const isActive = l.id === resolvedParams.lessonId;
                  return (
                    <Link
                      key={l.id}
                      href={`/courses/${courseSlug}/learn/${l.id}`}
                      className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all ${
                        isActive
                          ? "bg-[#182315] border border-[#2b3d1f] shadow-xs"
                          : "hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      {/* Active green indicator or number */}
                      <div className="w-5 text-center shrink-0">
                        {isActive ? (
                          <span className="text-[#b8c460] text-xs">▶</span>
                        ) : (
                          <span className="text-xs text-ink-soft/70 font-mono">{idx + 1}</span>
                        )}
                      </div>

                      {/* Thumbnail badge */}
                      <div className="relative w-12 h-8 rounded-lg overflow-hidden bg-black shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={course?.thumbnailUrl || `https://img.youtube.com/vi/${lesson?.youtubeVideoId || "J9BI0jGOds8"}/hqdefault.jpg`}
                          alt={l.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0.5 right-0.5 px-0.5 rounded bg-black/80 text-[0.55rem] text-white font-mono">
                          {Math.round((l.durationSeconds || 600) / 60)}m
                        </span>
                      </div>

                      {/* Title & Duration */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium line-clamp-2 leading-snug ${isActive ? "text-[#b8c460] font-semibold" : "text-ink"}`}>
                          {l.title}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Study Tools Widget matching Screenshot 1 */}
            <div className="bg-surface dark:bg-[#0c120e] rounded-3xl border border-line dark:border-white/10 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-ink">Study tools</h3>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Tool 1: Quiz */}
                <button
                  onClick={() => setShowQuizModal(true)}
                  className="p-3.5 rounded-2xl bg-surface dark:bg-[#121914] border border-line dark:border-white/10 text-left hover:border-moss/40 transition-all cursor-pointer group"
                >
                  <div className="text-moss dark:text-[#b8c460] mb-2 text-base">📖</div>
                  <h4 className="text-xs font-bold text-ink group-hover:text-moss transition-colors">Quiz</h4>
                  <p className="text-[0.7rem] text-ink-soft mt-0.5">{quizQuestions.length || 4} questions</p>
                </button>

                {/* Tool 2: My notes */}
                <button
                  onClick={() => {
                    setActiveTab("my-notes");
                    noteInputRef.current?.focus();
                  }}
                  className="p-3.5 rounded-2xl bg-surface dark:bg-[#121914] border border-line dark:border-white/10 text-left hover:border-moss/40 transition-all cursor-pointer group"
                >
                  <div className="text-moss dark:text-[#b8c460] mb-2 text-base">✏️</div>
                  <h4 className="text-xs font-bold text-ink group-hover:text-moss transition-colors">My notes</h4>
                  <p className="text-[0.7rem] text-ink-soft mt-0.5">Pinned to moments</p>
                </button>

                {/* Tool 3: Day test (Soon) */}
                <div className="p-3.5 rounded-2xl bg-surface dark:bg-[#121914] border border-line dark:border-white/10 text-left opacity-60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-ink-soft text-base">📋</span>
                    <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-bold bg-[#182315] text-[#b8c460] border border-[#2b3a1d]">
                      Soon
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-ink">Day test</h4>
                  <p className="text-[0.7rem] text-ink-soft mt-0.5">The whole day</p>
                </div>

                {/* Tool 4: Flashcards (Soon) */}
                <div className="p-3.5 rounded-2xl bg-surface dark:bg-[#121914] border border-line dark:border-white/10 text-left opacity-60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-ink-soft text-base">🗂️</span>
                    <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-bold bg-[#182315] text-[#b8c460] border border-[#2b3a1d]">
                      Soon
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-ink">Flashcards</h4>
                  <p className="text-[0.7rem] text-ink-soft mt-0.5">Key ideas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Interactive Quiz Modal */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface dark:bg-[#0c120e] rounded-3xl border border-line dark:border-white/15 max-w-lg w-full p-6 sm:p-7 shadow-2xl text-ink space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line dark:border-white/10">
              <div>
                <span className="text-xs font-semibold text-moss dark:text-[#b8c460] uppercase tracking-wider font-mono">
                  Lesson Quiz
                </span>
                <h3 className="text-base font-bold text-ink mt-0.5">{lesson?.title}</h3>
              </div>
              <button
                onClick={() => setShowQuizModal(false)}
                className="w-8 h-8 rounded-full border border-line dark:border-white/10 text-ink-soft hover:text-ink flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {quizQuestions.length === 0 ? (
              <p className="text-sm text-ink-soft py-4 text-center">No quiz questions generated for this lesson yet.</p>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {quizQuestions.map((q, qIdx) => (
                  <div key={q.id} className="space-y-2 p-3.5 rounded-2xl bg-paper dark:bg-[#131b15] border border-line dark:border-white/5">
                    <p className="text-xs sm:text-sm font-semibold text-ink">
                      {qIdx + 1}. {q.questionText}
                    </p>
                    <div className="space-y-1.5 pt-1">
                      {q.options?.map((opt: any) => {
                        const isSelected = quizAnswers[q.id] === opt.optionIndex;
                        const isCorrect = q.correctOptionIndex === opt.optionIndex;
                        return (
                          <button
                            key={opt.optionIndex}
                            onClick={() => !quizSubmitted && setQuizAnswers({ ...quizAnswers, [q.id]: opt.optionIndex })}
                            className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? quizSubmitted
                                  ? isCorrect
                                    ? "bg-[#253818] text-[#c0d86e] border border-[#486b2a]"
                                    : "bg-[#3e1e1b] text-[#f2a79e] border border-[#6b2a24]"
                                  : "bg-[#253818] text-[#c0d86e] border border-[#486b2a]"
                                : "bg-surface dark:bg-[#0c120e] border border-line dark:border-white/5 text-ink-soft hover:text-ink"
                            }`}
                          >
                            <span>{opt.optionText}</span>
                            {quizSubmitted && isCorrect && <span className="text-xs">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                    {quizSubmitted && q.explanation && (
                      <p className="text-[0.72rem] text-ink-soft/90 pt-1 border-t border-line dark:border-white/5">
                        💡 {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-line dark:border-white/10 flex items-center justify-between">
              {quizSubmitted ? (
                <div className="text-xs font-semibold text-[#b8c460]">
                  Quiz evaluated! Great progress.
                </div>
              ) : (
                <span className="text-xs text-ink-soft">
                  Answer all questions to complete
                </span>
              )}

              <button
                onClick={() => {
                  if (!quizSubmitted) {
                    setQuizSubmitted(true);
                    setCompleted(true);
                  } else {
                    setShowQuizModal(false);
                  }
                }}
                className="px-5 py-2 rounded-full bg-[#b8c460] text-[#0f1611] text-xs font-semibold hover:bg-[#a6b350] transition-colors cursor-pointer shadow-xs"
              >
                {quizSubmitted ? "Done" : "Submit answers"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
