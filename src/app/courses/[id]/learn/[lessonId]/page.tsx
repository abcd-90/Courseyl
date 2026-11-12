"use client";

import React, { useEffect, useState, useRef, use, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { getCleanThumbnailUrl } from "@/lib/thumbnail";
import { recordRecentCourse } from "@/lib/recentCourses";
import { InlineQuizPanel } from "@/components/InlineQuizPanel";
import {
  DEFAULT_DAILY_STUDY_MINUTES,
  clampDailyStudyMinutes,
  groupLessonsIntoDayBins,
} from "@/lib/pacing";
import {
  AutoplayCountdownOverlay,
  AUTOPLAY_COUNTDOWN_SECONDS,
  PLAYBACK_SPEEDS,
  getStoredAutoplay,
  setStoredAutoplay,
  getStoredPlaybackSpeed,
  setStoredPlaybackSpeed,
} from "@/components/YouTubePlayer";

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
  const [dailyMinutes, setDailyMinutes] = useState<number>(DEFAULT_DAILY_STUDY_MINUTES);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [navigation, setNavigation] = useState<any>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [activeTab, setActiveTab] = useState<"my-notes" | "study-notes">("my-notes");
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [noteActionError, setNoteActionError] = useState<string | null>(null);
  const [initialQuizAnswers, setInitialQuizAnswers] = useState<Record<string, number>>({});
  const [watched, setWatched] = useState(false);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState("1x");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAutoplayNext(getStoredAutoplay(true));
    const savedSpeed = getStoredPlaybackSpeed();
    setPlaybackSpeed(`${savedSpeed}x`);
  }, []);

  useEffect(() => {
    setAutoplayCountdown(null);
  }, [resolvedParams.lessonId]);

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
  const pendingWatchSecondsRef = useRef<Set<number>>(new Set());
  const recordedWatchSecondsRef = useRef<Set<number>>(new Set());
  const lastRelativeSecondRef = useRef<number>(0);

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

  useEffect(() => {
    if (!showQuiz) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowQuiz(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showQuiz]);

  // 1. Fetch Lesson, Course and Notes
  useEffect(() => {
    setLoading(true);
    setLessonCurrentTime(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setShowQuiz(false);
    setInitialQuizAnswers({});
    setWatched(false);
    setWatchedSeconds(0);
    setEditingNoteId(null);
    setEditingNoteContent("");
    setNoteActionError(null);
    pendingWatchSecondsRef.current.clear();
    recordedWatchSecondsRef.current.clear();
    lastRelativeSecondRef.current = 0;

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
          setInitialQuizAnswers(data.initialAnswers || {});
          setCompleted(data.progress?.isCompleted || false);
          setWatched(Boolean(data.progress?.watched));
          setWatchedSeconds(Number(data.progress?.watchedSeconds || 0));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch(`/api/courses/${resolvedParams.id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const nextDailyMinutes = clampDailyStudyMinutes(
          data.userState?.dailyStudyMinutes,
          DEFAULT_DAILY_STUDY_MINUTES
        );
        setDailyMinutes(nextDailyMinutes);
        if (data.userState?.userId && data.course) {
          const thumb = getCleanThumbnailUrl(
            data.course.thumbnailUrl,
            data.course.slug || resolvedParams.id,
            data.course.source?.youtubeId
          );
          recordRecentCourse(data.userState.userId, {
            id: data.course.id || resolvedParams.id,
            title: data.course.title || resolvedParams.id,
            slug: data.course.slug || resolvedParams.id,
            thumbnail: thumb,
            thumbnailUrl: thumb,
            progress: data.userState?.progressPercentage || 0,
          });
        }
        if (data.course?.chapters) {
          setChapters(data.course.chapters);
          const bins = groupLessonsIntoDayBins(data.course.chapters, nextDailyMinutes);
          const foundIdx = bins.findIndex((bin) =>
            bin.lessons?.some((l: any) => l.id === resolvedParams.lessonId)
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

  // Keep daily study pace and Day bin selection synced with user preferences
  useEffect(() => {
    const handleUserUpdated = (e: any) => {
      const updatedMins = e?.detail?.profile?.dailyStudyMinutes;
      if (updatedMins !== undefined) {
        setDailyMinutes(clampDailyStudyMinutes(updatedMins, DEFAULT_DAILY_STUDY_MINUTES));
      } else {
        fetch(`/api/courses/${resolvedParams.id}`, { cache: "no-store" })
          .then((res) => res.json())
          .then((data) => {
            if (data.userState?.dailyStudyMinutes !== undefined) {
              setDailyMinutes(
                clampDailyStudyMinutes(data.userState.dailyStudyMinutes, DEFAULT_DAILY_STUDY_MINUTES)
              );
            }
          })
          .catch(() => {});
      }
    };
    window.addEventListener("user-updated", handleUserUpdated);
    return () => window.removeEventListener("user-updated", handleUserUpdated);
  }, [resolvedParams.id]);

  const dayBins = useMemo(
    () => groupLessonsIntoDayBins(chapters, dailyMinutes),
    [chapters, dailyMinutes]
  );

  useEffect(() => {
    if (dayBins.length === 0) return;
    const foundIdx = dayBins.findIndex((bin) =>
      bin.lessons?.some((l: any) => l.id === resolvedParams.lessonId)
    );
    if (foundIdx !== -1) {
      setSelectedDayIndex(foundIdx);
    }
  }, [dayBins, resolvedParams.lessonId]);

  // Handle lesson completion & start autoplay countdown
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
      setAutoplayCountdown((prev) => (prev === null ? AUTOPLAY_COUNTDOWN_SECONDS : prev));
    }
  }, [completed, autoplayNext, nextLesson, resolvedParams.lessonId]);

  useEffect(() => {
    if (autoplayCountdown === null) return;
    if (!nextLesson) {
      setAutoplayCountdown(null);
      return;
    }
    if (autoplayCountdown <= 0) {
      setAutoplayCountdown(null);
      router.push(`/courses/${courseSlug}/learn/${nextLesson.id}`);
      return;
    }
    const timer = setTimeout(() => {
      setAutoplayCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [autoplayCountdown, nextLesson, router, courseSlug]);

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

  const isPlayingRef = useRef(false);

  const flushWatchTelemetry = useCallback(
    async (useKeepalive = false) => {
      const lessonId = resolvedParams.lessonId;
      if (!lessonId || pendingWatchSecondsRef.current.size === 0) return;

      const pending = Array.from(pendingWatchSecondsRef.current).sort((a, b) => a - b);
      pendingWatchSecondsRef.current.clear();

      try {
        const res = await fetch("/api/watch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId,
            seconds: pending,
            lastSecond: lastRelativeSecondRef.current,
          }),
          keepalive: useKeepalive,
        });

        if (!useKeepalive && res.ok) {
          const data = await res.json();
          if (typeof data.watchedSeconds === "number") {
            setWatchedSeconds(data.watchedSeconds);
          }
          if (typeof data.watched === "boolean") {
            setWatched(data.watched);
          }
        }
      } catch {
        if (!useKeepalive) {
          for (const sec of pending) {
            pendingWatchSecondsRef.current.add(sec);
          }
        }
      }
    },
    [resolvedParams.lessonId]
  );

  const recordWatchedSecond = useCallback(
    (relativeSec: number) => {
      if (!resolvedParams.lessonId || !Number.isFinite(relativeSec)) return;
      const maxSec = Math.max(1, Math.floor(duration || 60));
      const clamped = Math.max(0, Math.min(Math.floor(relativeSec), maxSec));
      lastRelativeSecondRef.current = clamped;
      if (!recordedWatchSecondsRef.current.has(clamped)) {
        recordedWatchSecondsRef.current.add(clamped);
        pendingWatchSecondsRef.current.add(clamped);
      }
    },
    [resolvedParams.lessonId, duration]
  );

  const flushWatchTelemetryRef = useRef(flushWatchTelemetry);
  const recordWatchedSecondRef = useRef(recordWatchedSecond);
  useEffect(() => {
    flushWatchTelemetryRef.current = flushWatchTelemetry;
  }, [flushWatchTelemetry]);
  useEffect(() => {
    recordWatchedSecondRef.current = recordWatchedSecond;
  }, [recordWatchedSecond]);

  useEffect(() => {
    if (!resolvedParams.lessonId) return;

    const flushTimer = setInterval(() => {
      void flushWatchTelemetry(false);
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushWatchTelemetry(true);
      }
    };

    const handlePageHide = () => {
      void flushWatchTelemetry(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      clearInterval(flushTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      void flushWatchTelemetry(true);
    };
  }, [resolvedParams.lessonId, flushWatchTelemetry]);

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
                isPlayingRef.current = true;
                setIsPlaying(true);
              } else if (event.data === 2) {
                isPlayingRef.current = false;
                setIsPlaying(false);
                void flushWatchTelemetryRef.current(false);
              } else if (event.data === 0) {
                isPlayingRef.current = false;
                setIsPlaying(false);
                void flushWatchTelemetryRef.current(false);
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
            if (parsed.info === 1) {
              isPlayingRef.current = true;
              setIsPlaying(true);
            } else if (parsed.info === 2) {
              isPlayingRef.current = false;
              setIsPlaying(false);
              void flushWatchTelemetryRef.current(false);
            } else if (parsed.info === 0) {
              isPlayingRef.current = false;
              setIsPlaying(false);
              void flushWatchTelemetryRef.current(false);
              handleLessonCompletedAndNext();
            }
          }
          if (parsed.event === "infoDelivery" && parsed.info) {
            if (typeof parsed.info.playerState === "number") {
              const playingNow = parsed.info.playerState === 1;
              isPlayingRef.current = playingNow;
              setIsPlaying(playingNow);
              if (parsed.info.playerState === 2 || parsed.info.playerState === 0) {
                void flushWatchTelemetryRef.current(false);
              }
            }
            if (typeof parsed.info.currentTime === "number") {
              const raw = parsed.info.currentTime;
              const rel = Math.max(0, raw - startSec);
              setCurrentTime(raw);
              setLessonCurrentTime(rel);
              if (isPlayingRef.current || parsed.info.playerState === 1) {
                recordWatchedSecondRef.current(rel);
              }
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
              recordWatchedSecondRef.current(elapsed);

              if (endSec && raw >= endSec) {
                sendPlayerCommand("pauseVideo");
                isPlayingRef.current = false;
                setIsPlaying(false);
                void flushWatchTelemetryRef.current(false);
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
      isPlayingRef.current = false;
      setIsPlaying(false);
      void flushWatchTelemetryRef.current(false);
    } else {
      sendPlayerCommand("playVideo");
      isPlayingRef.current = true;
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
    const speeds: readonly number[] = PLAYBACK_SPEEDS;
    const currentNum = parseFloat(playbackSpeed) || 1;
    const currentIdx = speeds.indexOf(currentNum);
    const nextSpeed = speeds[(currentIdx + 1) % speeds.length];
    setPlaybackSpeed(`${nextSpeed}x`);
    setStoredPlaybackSpeed(nextSpeed);
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

  const seekToTimestamp = (seconds: number, autoPlay = true) => {
    const clampedRel = Math.max(0, seconds);
    const target = startSec + clampedRel;
    sendPlayerCommand("seekTo", [target, true]);
    if (autoPlay) {
      sendPlayerCommand("playVideo");
      isPlayingRef.current = true;
      setIsPlaying(true);
    }
    setCurrentTime(target);
    setLessonCurrentTime(clampedRel);
  };

  const handleReplayQuizMoment = (relativeSeconds: number, absoluteSeconds: number) => {
    const targetRel =
      absoluteSeconds >= startSec ? Math.max(0, absoluteSeconds - startSec) : Math.max(0, relativeSeconds);
    setShowQuiz(false);
    seekToTimestamp(targetRel, true);
    playerCardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

  const submitNewNote = async () => {
    const trimmed = newNoteContent.trim();
    if (!trimmed) return;

    const noteSec = Math.floor(lessonCurrentTime);
    setNoteActionError(null);
    setSavingNoteId("new");

    try {
      const res = await fetch(`/api/lessons/${resolvedParams.lessonId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          timestampSeconds: noteSec,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.note) {
        setNotes((prev) => [data.note, ...prev]);
        setNewNoteContent("");
      } else {
        setNoteActionError(data?.error || "Could not save note. Please sign in and try again.");
      }
    } catch {
      setNoteActionError("Network error while saving note.");
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitNewNote();
  };

  const handleStartEditNote = (note: any) => {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content || "");
    setNoteActionError(null);
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteContent("");
    setNoteActionError(null);
  };

  const handleSaveEditNote = async (noteId: string) => {
    const trimmed = editingNoteContent.trim();
    if (!trimmed) {
      setNoteActionError("Note content cannot be empty.");
      return;
    }

    setSavingNoteId(noteId);
    setNoteActionError(null);

    try {
      const res = await fetch(`/api/lessons/${resolvedParams.lessonId}/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.note) {
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, ...data.note } : n))
        );
        setEditingNoteId(null);
        setEditingNoteContent("");
      } else {
        setNoteActionError(data?.error || "Could not update note.");
      }
    } catch {
      setNoteActionError("Network error while updating note.");
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setSavingNoteId(noteId);
    setNoteActionError(null);

    try {
      const res = await fetch(`/api/lessons/${resolvedParams.lessonId}/notes/${noteId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        if (editingNoteId === noteId) {
          setEditingNoteId(null);
          setEditingNoteContent("");
        }
      } else {
        setNoteActionError(data?.error || "Could not delete note.");
      }
    } catch {
      setNoteActionError("Network error while deleting note.");
    } finally {
      setSavingNoteId(null);
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

  const safeSelectedDayIndex =
    dayBins.length > 0 ? Math.min(selectedDayIndex, dayBins.length - 1) : 0;
  const selectedDay = dayBins[safeSelectedDayIndex] || dayBins[0];
  const dayLessons = selectedDay?.lessons || [];
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

                {/* End-screen 7-second Autoplay Countdown Overlay */}
                {autoplayCountdown !== null && nextLesson && (
                  <AutoplayCountdownOverlay
                    secondsLeft={autoplayCountdown}
                    nextLessonTitle={nextLesson.title}
                    onPlayNow={() => {
                      setAutoplayCountdown(null);
                      router.push(`/courses/${courseSlug}/learn/${nextLesson.id}`);
                    }}
                    onCancel={() => setAutoplayCountdown(null)}
                  />
                )}

                {/* Center Play Button Overlay when paused */}
                {!isPlaying && autoplayCountdown === null && (
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
                role="switch"
                aria-checked={autoplayNext}
                aria-label="Autoplay next lesson"
                onClick={() => {
                  const next = !autoplayNext;
                  setAutoplayNext(next);
                  setStoredAutoplay(next);
                  if (!next) setAutoplayCountdown(null);
                }}
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
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          void submitNewNote();
                        }
                      }}
                      placeholder="What clicked at this moment? The time is taken when you start typing."
                      rows={3}
                      className="w-full bg-transparent text-sm text-ink dark:text-white placeholder-ink-soft/60 outline-none resize-none"
                    />

                    <div className="pt-2 border-t border-line dark:border-white/5 flex items-center justify-between text-xs text-ink-soft">
                      <span className="text-[0.7rem]">Press Ctrl/⌘ + Enter to pin</span>
                      <button
                        type="submit"
                        disabled={!newNoteContent.trim() || savingNoteId === "new"}
                        className="px-4 py-1.5 rounded-full bg-[#2a371c] dark:bg-[#1f2b15] text-[#b8c460] hover:bg-[#3b4e28] text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        {savingNoteId === "new" ? "Saving..." : "Add note"}
                      </button>
                    </div>
                  </form>

                  {noteActionError && (
                    <div className="px-3.5 py-2.5 rounded-2xl bg-[#3e1e1b]/15 dark:bg-[#3e1e1b]/60 border border-[#6b2a24]/30 text-xs text-red-700 dark:text-[#f2a79e] flex items-center justify-between gap-2">
                      <span>{noteActionError}</span>
                      <button
                        type="button"
                        onClick={() => setNoteActionError(null)}
                        className="text-[0.7rem] underline shrink-0 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Notes Feed or Empty State */}
                  {notes.length === 0 ? (
                    <p className="text-xs text-ink-soft/80 px-2 py-2">
                      No notes yet. Pause on anything worth keeping and write it down; it stays pinned to that moment.
                    </p>
                  ) : (
                    <div className="space-y-3 pt-2">
                      {notes.map((n) => {
                        const isEditing = editingNoteId === n.id;
                        const isBusy = savingNoteId === n.id;
                        return (
                          <div
                            key={n.id}
                            className="p-3.5 rounded-2xl bg-surface dark:bg-[#0d140f] border border-line dark:border-white/10 flex items-start gap-3 text-ink group"
                          >
                            <button
                              type="button"
                              onClick={() => seekToTimestamp(n.timestampSeconds || 0)}
                              className="px-2 py-0.5 rounded-md bg-lime-soft dark:bg-[#1c2717] text-moss dark:text-[#b8c460] font-mono text-xs font-semibold shrink-0 cursor-pointer mt-0.5"
                            >
                              {formatTime(n.timestampSeconds || 0)}
                            </button>

                            {isEditing ? (
                              <div className="flex-1 space-y-2.5">
                                <textarea
                                  value={editingNoteContent}
                                  onChange={(e) => setEditingNoteContent(e.target.value)}
                                  onKeyDown={(e) => {
                                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                      e.preventDefault();
                                      void handleSaveEditNote(n.id);
                                    } else if (e.key === "Escape") {
                                      e.preventDefault();
                                      handleCancelEditNote();
                                    }
                                  }}
                                  rows={2}
                                  autoFocus
                                  className="w-full p-2.5 rounded-xl bg-paper dark:bg-[#131b15] border border-line dark:border-white/15 text-xs sm:text-sm text-ink outline-none focus:border-moss resize-none"
                                />
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[0.68rem] text-ink-soft">
                                    Ctrl/⌘ + Enter to save · Esc to cancel
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={handleCancelEditNote}
                                      disabled={isBusy}
                                      className="px-3 py-1 rounded-full border border-line dark:border-white/15 text-xs text-ink-soft hover:text-ink transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleSaveEditNote(n.id)}
                                      disabled={!editingNoteContent.trim() || isBusy}
                                      className="px-3.5 py-1 rounded-full bg-[#2a371c] dark:bg-[#1f2b15] text-[#b8c460] hover:bg-[#3b4e28] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
                                    >
                                      {isBusy ? "Saving..." : "Save"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="flex-1 text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-wrap">
                                  {n.content}
                                </p>
                                <div className="flex items-center gap-1 shrink-0 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditNote(n)}
                                    disabled={isBusy}
                                    aria-label="Edit note"
                                    className="px-2 py-1 rounded-lg text-[0.7rem] font-medium text-ink-soft hover:text-ink hover:bg-paper dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-40"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteNote(n.id)}
                                    disabled={isBusy}
                                    aria-label="Delete note"
                                    className="px-2 py-1 rounded-lg text-[0.7rem] font-medium text-ink-soft hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-40"
                                  >
                                    {isBusy ? "..." : "Delete"}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Study Notes AI Summary Tab */
                (() => {
                  const takeaways: string[] = Array.isArray(lesson?.keyTakeaways)
                    ? lesson.keyTakeaways.map((t: unknown) => String(t).trim()).filter(Boolean)
                    : [];

                  const definitions: { term: string; definition: string }[] = Array.isArray(
                    lesson?.importantDefinitions
                  )
                    ? lesson.importantDefinitions
                        .map((item: unknown) => {
                          if (typeof item === "object" && item !== null && "term" in item) {
                            const obj = item as { term?: unknown; definition?: unknown };
                            const term = String(obj.term || "").trim();
                            const def = String(obj.definition || "").trim();
                            return term || def
                              ? { term: term || "Concept", definition: def }
                              : null;
                          }
                          const raw = String(item || "").trim();
                          if (!raw) return null;
                          const colonIdx = raw.indexOf(":");
                          if (colonIdx > 0 && colonIdx < raw.length - 1) {
                            return {
                              term: raw.slice(0, colonIdx).trim(),
                              definition: raw.slice(colonIdx + 1).trim(),
                            };
                          }
                          return { term: raw, definition: "" };
                        })
                        .filter(
                          (d: { term: string; definition: string } | null): d is { term: string; definition: string } =>
                            Boolean(d)
                        )
                    : [];

                  const summaryText = String(lesson?.summary || lesson?.description || "").trim();
                  const hasStudyNotes = Boolean(
                    summaryText || takeaways.length > 0 || definitions.length > 0
                  );

                  if (!hasStudyNotes) {
                    return (
                      <div className="bg-surface dark:bg-[#0d140f] rounded-3xl border border-line dark:border-white/10 p-6 text-ink">
                        <p className="text-xs sm:text-sm text-ink-soft">
                          No study notes available for this lesson yet.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-surface dark:bg-[#0d140f] rounded-3xl border border-line dark:border-white/10 p-6 space-y-5 text-ink">
                      {summaryText && (
                        <div>
                          <h3 className="text-sm font-bold text-ink mb-2">Lesson Summary</h3>
                          <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
                            {summaryText}
                          </p>
                        </div>
                      )}

                      {takeaways.length > 0 && (
                        <div className={summaryText ? "pt-4 border-t border-line dark:border-white/10" : ""}>
                          <h3 className="text-sm font-bold text-ink mb-2">Lesson Key Takeaways</h3>
                          <ul className="space-y-2 text-xs sm:text-sm text-ink-soft list-disc list-inside leading-relaxed">
                            {takeaways.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {definitions.length > 0 && (
                        <div
                          className={
                            summaryText || takeaways.length > 0
                              ? "pt-4 border-t border-line dark:border-white/10"
                              : ""
                          }
                        >
                          <h3 className="text-sm font-bold text-ink mb-3">Key Terms &amp; Definitions</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {definitions.map((def, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-2xl bg-lime-soft/50 dark:bg-[#182315] border border-line dark:border-[#26371a]/60 space-y-1"
                              >
                                <span className="block text-xs font-bold text-moss dark:text-[#b8c460]">
                                  {def.term}
                                </span>
                                {def.definition && (
                                  <p className="text-xs text-ink-soft leading-relaxed">
                                    {def.definition}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
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
                {dayBins.map((bin, idx) => {
                  const isSelected = safeSelectedDayIndex === idx;
                  return (
                    <button
                      key={`day-${bin.dayNumber}-${idx}`}
                      onClick={() => setSelectedDayIndex(idx)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? "bg-[#28381a] text-[#b8c460] border border-[#3e5628] shadow-xs"
                          : "bg-surface dark:bg-[#151c17] text-ink-soft border border-line dark:border-white/10 hover:text-ink hover:border-moss/40"
                      }`}
                    >
                      {bin.label || `Day ${idx + 1}`} {isSelected ? "•" : ""}
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Focus Card */}
              {selectedDay?.title && (
                <div className="px-3 py-2 rounded-xl bg-black/5 dark:bg-[#141d16] border border-line dark:border-white/5">
                  <span className="text-[0.65rem] uppercase tracking-wider font-mono text-[#b8c460] font-bold block">
                    Day {selectedDay.dayNumber} Focus
                  </span>
                  <p className="text-xs text-ink font-medium truncate mt-0.5">
                    {selectedDay.title
                      .replace(/^Day\s*\d+\s*(?:[\(:]|·)?\s*/, "")
                      .replace(/\)$/, "")
                      .trim() || selectedDay.title}
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
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={showQuiz}
                  onClick={() => setShowQuiz(true)}
                  className={`p-3.5 rounded-2xl bg-surface dark:bg-[#121914] border text-left hover:border-moss/40 transition-all cursor-pointer group ${
                    showQuiz
                      ? "border-moss/60 dark:border-[#b8c460]/50"
                      : "border-line dark:border-white/10"
                  }`}
                >
                  <div className="text-moss dark:text-[#b8c460] mb-2 text-base">📖</div>
                  <h4 className="text-xs font-bold text-ink group-hover:text-moss transition-colors">Quiz</h4>
                  <p className="text-[0.7rem] text-ink-soft mt-0.5">
                    {quizQuestions.length > 0
                      ? `${quizQuestions.length} question${quizQuestions.length === 1 ? "" : "s"}`
                      : loading
                        ? "Loading..."
                        : "Check understanding"}
                  </p>
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
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Day test is coming soon"
                  className="p-3.5 rounded-2xl bg-surface dark:bg-[#121914] border border-line dark:border-white/10 text-left opacity-60 cursor-not-allowed"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-ink-soft text-base">📋</span>
                    <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-bold bg-[#182315] text-[#b8c460] border border-[#2b3a1d]">
                      Soon
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-ink">Day test</h4>
                  <p className="text-[0.7rem] text-ink-soft mt-0.5">The whole day</p>
                </button>

                {/* Tool 4: Flashcards (Soon) */}
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Flashcards are coming soon"
                  className="p-3.5 rounded-2xl bg-surface dark:bg-[#121914] border border-line dark:border-white/10 text-left opacity-60 cursor-not-allowed"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-ink-soft text-base">🗂️</span>
                    <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-bold bg-[#182315] text-[#b8c460] border border-[#2b3a1d]">
                      Soon
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-ink">Flashcards</h4>
                  <p className="text-[0.7rem] text-ink-soft mt-0.5">Key ideas</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Lesson Quiz Modal Dialog */}
      {showQuiz && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lesson?.title ? `Quiz: ${lesson.title}` : "Lesson quiz"}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowQuiz(false);
            }
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
        >
          <div className="w-full max-w-2xl">
            <InlineQuizPanel
              lessonId={resolvedParams.lessonId}
              lessonTitle={lesson?.title}
              startSeconds={startSec}
              durationSeconds={duration}
              questions={quizQuestions}
              initialAnswers={initialQuizAnswers}
              loading={loading}
              isModal
              onClose={() => setShowQuiz(false)}
              onAnswersChange={setInitialQuizAnswers}
              onReplayMoment={handleReplayQuizMoment}
              onQuizPassed={() => setCompleted(true)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
