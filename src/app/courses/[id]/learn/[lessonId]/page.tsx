"use client";

import React, { useEffect, useState, useRef, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { getCleanThumbnailUrl } from "@/lib/thumbnail";

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
  const [completed, setCompleted] = useState(false);
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState("1x");
  const [loading, setLoading] = useState(true);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // Absolute video seconds
  const [lessonCurrentTime, setLessonCurrentTime] = useState(0); // Relative seconds inside this lesson
  const [isFullscreen, setIsFullscreen] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const playerCardRef = useRef<HTMLDivElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  const courseSlug = lesson?.courseSlug || course?.slug || resolvedParams.id;
  const courseTitle = course?.title || lesson?.courseTitle || "Course Lesson";

  // Navigation computation
  const allLessons = navigation?.allLessons || [];
  const currentLessonIndex = allLessons.findIndex((l: any) => l.id === resolvedParams.lessonId);
  const totalLessons = allLessons.length || 1;
  const prevLesson = navigation?.prevLesson || (currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null);
  const nextLesson = navigation?.nextLesson || (currentLessonIndex < totalLessons - 1 ? allLessons[currentLessonIndex + 1] : null);

  const startSec = lesson?.startSeconds || 0;
  const duration = lesson?.durationSeconds || Math.max(60, (lesson?.endSeconds || 0) - startSec);
  const endSec = lesson?.endSeconds && lesson.endSeconds > startSec ? lesson.endSeconds : startSec + duration;

  // 1. Fetch Lesson, Course and Notes
  useEffect(() => {
    setLoading(true);
    setLessonCurrentTime(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setShowQuizModal(false);

    // Enroll automatically
    fetch(`/api/courses/${resolvedParams.id}/enroll`, { method: "POST" }).catch(() => {});

    fetch(`/api/lessons/${resolvedParams.lessonId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.lesson) {
          setLesson(data.lesson);
          setCourse({
            id: data.lesson.courseId,
            slug: data.lesson.courseSlug || resolvedParams.id,
            title: data.lesson.courseTitle || "Course Lesson",
            channelTitle: data.lesson.channelTitle || "Instructor",
            thumbnailUrl: data.lesson.thumbnailUrl,
          });
          setNavigation(data.navigation || null);
          setQuizQuestions(data.quizQuestions || []);
          setCompleted(data.progress?.isCompleted || false);

          try {
            const stored = localStorage.getItem("courseit_recent_courses");
            const existing = stored ? JSON.parse(stored) : [];
            const thumb = getCleanThumbnailUrl(
              data.lesson.thumbnailUrl,
              data.lesson.courseSlug || resolvedParams.id,
              data.lesson.youtubeVideoId
            );
            const updated = [
              {
                id: resolvedParams.id,
                title: data.lesson.courseTitle || resolvedParams.id,
                slug: data.lesson.courseSlug || resolvedParams.id,
                thumbnail: thumb,
                thumbnailUrl: thumb,
                progress: data.progress?.isCompleted ? 100 : 0,
              },
              ...existing.filter((e: any) => e.slug !== (data.lesson.courseSlug || resolvedParams.id)),
            ].slice(0, 5);
            localStorage.setItem("courseit_recent_courses", JSON.stringify(updated));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

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

    fetch(`/api/lessons/${resolvedParams.lessonId}/notes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.notes) setNotes(data.notes);
      })
      .catch(() => {});
  }, [resolvedParams.id, resolvedParams.lessonId]);

  // Handle lesson completion & advance
  const handleLessonCompletedAndNext = useCallback(() => {
    if (!completed) {
      setCompleted(true);
      fetch(`/api/lessons/${resolvedParams.lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: true }),
      }).catch(() => {});
    }
    if (autoplayNext && nextLesson) {
      router.push(`/courses/${courseSlug}/learn/${nextLesson.id}`);
    }
  }, [completed, autoplayNext, nextLesson, resolvedParams.lessonId, router, courseSlug]);

  // Robust Player Commander (calls YT API or postMessage fallback)
  const sendPlayerCommand = useCallback((func: string, args: any[] = []) => {
    if (playerRef.current && typeof playerRef.current[func] === "function") {
      try {
        playerRef.current[func](...args);
        return;
      } catch {}
    }
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func,
            args,
          }),
          "*"
        );
      } catch {}
    }
  }, []);

  // 2. YouTube IFrame API Initialization
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById("yt-iframe-api-script")) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api-script";
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    const initYT = () => {
      if (!iframeRef.current || !(window as any).YT || !(window as any).YT.Player) return;
      try {
        if (playerRef.current?.destroy) {
          playerRef.current.destroy();
        }
      } catch {}

      try {
        playerRef.current = new (window as any).YT.Player(iframeRef.current, {
          events: {
            onReady: (event: any) => {
              const speedNum = parseFloat(playbackSpeed) || 1;
              if (speedNum !== 1) {
                try {
                  event.target.setPlaybackRate(speedNum);
                } catch {}
              }
            },
            onStateChange: (event: any) => {
              if (event.data === 1) {
                setIsPlaying(true);
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                setIsPlaying(false);
                handleLessonCompletedAndNext();
              }
            },
          },
        });
      } catch {}
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initYT();
    } else {
      (window as any).onYouTubeIframeAPIReady = initYT;
    }

    // Window postMessage listener as fallback for time and state updates
    const handleMessage = (e: MessageEvent) => {
      try {
        if (typeof e.data === "string") {
          const parsed = JSON.parse(e.data);
          if (parsed.event === "onStateChange") {
            if (parsed.info === 1) setIsPlaying(true);
            else if (parsed.info === 2) setIsPlaying(false);
            else if (parsed.info === 0) {
              setIsPlaying(false);
              handleLessonCompletedAndNext();
            }
          }
          if (parsed.event === "infoDelivery" && parsed.info) {
            if (typeof parsed.info.currentTime === "number") {
              const raw = parsed.info.currentTime;
              setCurrentTime(raw);
              setLessonCurrentTime(Math.max(0, raw - startSec));
            }
            if (typeof parsed.info.playerState === "number") {
              setIsPlaying(parsed.info.playerState === 1);
            }
          }
        }
      } catch {}
    };
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
      try {
        if (playerRef.current?.destroy) playerRef.current.destroy();
      } catch {}
      playerRef.current = null;
    };
  }, [lesson?.id, lesson?.youtubeVideoId, playbackSpeed, startSec, handleLessonCompletedAndNext]);

  // 3. Active Playback Ticker (every 250ms)
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        if (playerRef.current?.getCurrentTime) {
          try {
            const raw = playerRef.current.getCurrentTime();
            if (typeof raw === "number") {
              setCurrentTime(raw);
              const elapsed = Math.max(0, raw - startSec);
              setLessonCurrentTime(elapsed);

              if (endSec && raw >= endSec) {
                sendPlayerCommand("pauseVideo");
                setIsPlaying(false);
                handleLessonCompletedAndNext();
              }
            }
          } catch {}
        }
      }, 250);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, startSec, endSec, handleLessonCompletedAndNext, sendPlayerCommand]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Controls Handlers
  const togglePlay = () => {
    if (isPlaying) {
      sendPlayerCommand("pauseVideo");
      setIsPlaying(false);
    } else {
      sendPlayerCommand("playVideo");
      setIsPlaying(true);
    }
  };

  const handleRewind10 = () => {
    const target = Math.max(startSec, currentTime - 10);
    sendPlayerCommand("seekTo", [target, true]);
    setCurrentTime(target);
    setLessonCurrentTime(Math.max(0, target - startSec));
  };

  const handleForward10 = () => {
    const target = Math.min(endSec, currentTime + 10);
    sendPlayerCommand("seekTo", [target, true]);
    setCurrentTime(target);
    setLessonCurrentTime(Math.max(0, target - startSec));
  };

  const handleRestartLesson = () => {
    sendPlayerCommand("seekTo", [startSec, true]);
    setCurrentTime(startSec);
    setLessonCurrentTime(0);
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const target = startSec + ratio * duration;

    sendPlayerCommand("seekTo", [target, true]);
    setCurrentTime(target);
    setLessonCurrentTime(Math.max(0, target - startSec));
  };

  const handleToggleSpeed = () => {
    const speeds = [0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentNum = parseFloat(playbackSpeed) || 1;
    const currentIdx = speeds.indexOf(currentNum);
    const nextSpeed = speeds[(currentIdx + 1) % speeds.length];
    setPlaybackSpeed(`${nextSpeed}x`);
    sendPlayerCommand("setPlaybackRate", [nextSpeed]);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      sendPlayerCommand("unMute");
      setIsMuted(false);
    } else {
      sendPlayerCommand("mute");
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    sendPlayerCommand("setVolume", [newVol]);
    if (newVol === 0) {
      setIsMuted(true);
      sendPlayerCommand("mute");
    } else if (isMuted) {
      setIsMuted(false);
      sendPlayerCommand("unMute");
    }
  };

  const handleToggleCaptions = () => {
    if (captionsEnabled) {
      sendPlayerCommand("setOption", ["captions", "track", {}]);
      setCaptionsEnabled(false);
    } else {
      sendPlayerCommand("loadModule", ["captions"]);
      sendPlayerCommand("setOption", ["captions", "track", { languageCode: "en" }]);
      setCaptionsEnabled(true);
    }
  };

  const handleToggleFullscreen = () => {
    const el = playerCardRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const seekToTimestamp = (seconds: number) => {
    const target = startSec + seconds;
    sendPlayerCommand("seekTo", [target, true]);
    setCurrentTime(target);
    setLessonCurrentTime(Math.max(0, target - startSec));
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
    } catch {}
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    const noteSec = Math.floor(lessonCurrentTime);
    try {
      const res = await fetch(`/api/lessons/${resolvedParams.lessonId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newNoteContent.trim(),
          timestampSeconds: noteSec,
        }),
      });
      const data = await res.json();
      if (res.ok && data.note) {
        setNotes([data.note, ...notes]);
        setNewNoteContent("");
      }
    } catch {
      setNotes([
        {
          id: "note_" + Date.now(),
          content: newNoteContent.trim(),
          timestampSeconds: noteSec,
          createdAt: new Date().toISOString(),
        },
        ...notes,
      ]);
      setNewNoteContent("");
    }
  };

  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const m = Math.floor(s / 60);
    const remSec = s % 60;
    return `${m}:${remSec < 10 ? "0" : ""}${remSec}`;
  };

  const progressPercent = Math.min(100, Math.max(0, (lessonCurrentTime / duration) * 100));

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
  const videoId =
    (lesson?.youtubeVideoId && lesson.youtubeVideoId !== "urbkF3zPpxw" ? lesson.youtubeVideoId : null) ||
    course?.source?.youtubeId ||
    (course as any)?.sourceYoutubeId ||
    "3iFMc6ELt7k";

  // URL with controls=0 to strictly disable YouTube's native control bar
  const hasValidEnd = endSec && endSec > startSec;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${startSec}${hasValidEnd ? `&end=${endSec}` : ""}&controls=0&enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1`;

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
                className="w-8 h-8 rounded-full border border-line dark:border-white/10 flex items-center justify-center text-xs text-ink hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Previous lesson"
              >
                ‹
              </button>
              <button
                onClick={() => nextLesson && router.push(`/courses/${courseSlug}/learn/${nextLesson.id}`)}
                disabled={!nextLesson}
                className="w-8 h-8 rounded-full border border-line dark:border-white/10 flex items-center justify-center text-xs text-ink hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
            {/* Video Player Card matching Reference Site Image 1 */}
            <div
              ref={playerCardRef}
              className="relative bg-black rounded-3xl overflow-hidden border border-[#0f1611]/15 dark:border-white/10 shadow-xl group/player flex flex-col"
            >
              {/* Video Frame */}
              <div className="relative aspect-video bg-black w-full overflow-hidden">
                <iframe
                  ref={iframeRef}
                  id="yt-course-player"
                  src={embedUrl}
                  title={lesson?.title || "Lesson Video"}
                  className="w-full h-full border-0 pointer-events-auto"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />

                {/* Center Play Button Overlay when paused */}
                {!isPlaying && (
                  <div
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] transition-all cursor-pointer z-10"
                    title="Click to play"
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 hover:bg-[#b8c460] text-[#0f1611] flex items-center justify-center shadow-2xl transition-transform hover:scale-110 cursor-pointer">
                      <svg className="w-8 h-8 sm:w-9 sm:h-9 fill-current ml-1" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Scrubber Progress Bar (Spanning across player) */}
              <div
                onClick={handleScrubberClick}
                className="group/scrub relative w-full h-2 hover:h-3 bg-[#1e2620] hover:bg-[#28352b] transition-all cursor-pointer z-20"
                title="Seek within lesson"
              >
                <div
                  className="h-full bg-[#b8c460] transition-all relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#b8c460] shadow-md opacity-0 group-hover/scrub:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Sleek Dark Integrated Control Bar matching Reference Site Image 1 */}
              <div className="px-4 py-3 bg-[#0d130f] flex items-center justify-between text-xs text-white select-none z-20">
                {/* Left: Play/Pause, Rewind 10, Forward 10, Restart, Lesson Time */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <button
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#b8c460] hover:text-[#0f1611] text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  {/* Rewind 10s */}
                  <button
                    onClick={handleRewind10}
                    className="flex items-center gap-0.5 p-1 text-white/80 hover:text-white transition-colors cursor-pointer"
                    title="Rewind 10 seconds"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
                    </svg>
                    <span className="text-[0.65rem] font-bold font-mono">10</span>
                  </button>

                  {/* Forward 10s */}
                  <button
                    onClick={handleForward10}
                    className="flex items-center gap-0.5 p-1 text-white/80 hover:text-white transition-colors cursor-pointer"
                    title="Forward 10 seconds"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
                    </svg>
                    <span className="text-[0.65rem] font-bold font-mono">10</span>
                  </button>

                  {/* Restart Lesson */}
                  <button
                    onClick={handleRestartLesson}
                    className="p-1 text-white/70 hover:text-white transition-colors cursor-pointer hidden sm:block"
                    title="Restart lesson"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>

                  {/* Lesson Time Display (Authentic lesson elapsed / total) */}
                  <span className="font-mono text-xs sm:text-sm text-white/95 font-semibold tracking-wide ml-1">
                    {formatTime(lessonCurrentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Right: CC, Speed, Volume, Fullscreen */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* CC Button */}
                  <button
                    onClick={handleToggleCaptions}
                    className={`px-2 py-0.5 rounded text-[0.68rem] font-bold font-mono transition-colors cursor-pointer ${
                      captionsEnabled
                        ? "bg-[#b8c460] text-[#0f1611]"
                        : "bg-white/10 text-white/80 hover:text-white hover:bg-white/20"
                    }`}
                    title="Toggle Captions (CC)"
                  >
                    CC
                  </button>

                  {/* Playback Speed */}
                  <button
                    onClick={handleToggleSpeed}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-semibold transition-colors cursor-pointer"
                    title="Change playback speed"
                  >
                    {playbackSpeed}
                  </button>

                  {/* Volume / Mute with mini slider */}
                  <div className="relative group/vol flex items-center gap-1.5">
                    <button
                      onClick={handleToggleMute}
                      className="p-1 text-white/80 hover:text-white transition-colors cursor-pointer"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted || volume === 0 ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      className="w-14 h-1 bg-white/20 accent-[#b8c460] rounded-full cursor-pointer hidden sm:group-hover/vol:block transition-all"
                    />
                  </div>

                  {/* Fullscreen */}
                  <button
                    onClick={handleToggleFullscreen}
                    className="p-1 text-white/80 hover:text-white transition-colors cursor-pointer"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Autoplay Next Lesson Toggle */}
            <div className="flex items-center justify-end gap-2.5 px-1 text-xs text-ink-soft">
              <span>Autoplay next lesson</span>
              <button
                type="button"
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
                {lesson?.title || "Lesson Overview"}
              </h1>
              <p className="text-sm text-ink-soft leading-relaxed">
                {lesson?.description || `${Math.round(duration / 60)}m · Interactive lesson with curated curriculum, code practices and quizzes.`}
              </p>
            </div>

            {/* Creator Row matching Reference Site */}
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
                    <span>{(course?.channelTitle || "I").charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ink leading-tight">{course?.channelTitle || "Instructor"}</h4>
                  <p className="text-xs text-ink-soft leading-tight mt-0.5">Verified Instructor</p>
                </div>
              </div>

              <a
                href={`https://youtube.com/watch?v=${videoId}&t=${startSec}s`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-1.5 rounded-full border border-line dark:border-white/10 text-xs font-semibold text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
              >
                <span>Open YouTube ({formatTime(startSec)})</span>
                <span className="text-[0.7rem]">↗</span>
              </a>
            </div>

            {/* Notes Section matching Reference Site */}
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
                        <span>at the video&apos;s time ({formatTime(lessonCurrentTime)})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (playerRef.current?.getCurrentTime) {
                            try {
                              const raw = playerRef.current.getCurrentTime();
                              setLessonCurrentTime(Math.max(0, raw - startSec));
                            } catch {}
                          }
                        }}
                        className="text-[0.72rem] underline hover:text-ink text-ink-soft cursor-pointer"
                      >
                        Use current moment
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
                      <span className="text-[0.7rem]">Enter note to pin</span>
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
                      <li>Bite-sized structured progression ensures maximum retention of core concepts.</li>
                      <li>Active recall testing pins key learnings right at the precise video timestamp.</li>
                      <li>Semantic chapter division keeps daily study goals achievable and trackable.</li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-line dark:border-white/10">
                    <h3 className="text-sm font-bold text-ink mb-2">Key Highlights</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full bg-lime-soft dark:bg-[#182315] text-moss dark:text-[#b8c460] text-xs font-semibold">
                        Curated Curriculum
                      </span>
                      <span className="px-3 py-1 rounded-full bg-lime-soft dark:bg-[#182315] text-moss dark:text-[#b8c460] text-xs font-semibold">
                        Timestamped Recall
                      </span>
                      <span className="px-3 py-1 rounded-full bg-lime-soft dark:bg-[#182315] text-moss dark:text-[#b8c460] text-xs font-semibold">
                        Distraction-Free
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

              {/* Selected Day Focus Card */}
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
                    fetch(`/api/lessons/${resolvedParams.lessonId}/quiz/submit`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ answers: quizAnswers }),
                    }).catch(() => {});
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
