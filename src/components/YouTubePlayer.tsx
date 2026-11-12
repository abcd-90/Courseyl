"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from "react";

export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
export const STORAGE_KEY_AUTOPLAY = "courseit:autoplay";
export const STORAGE_KEY_SPEED = "courseit:speed";
export const AUTOPLAY_COUNTDOWN_SECONDS = 7;

export function getStoredPlaybackSpeed(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_SPEED);
    if (!raw) return 1;
    const parsed = parseFloat(raw);
    return (PLAYBACK_SPEEDS as readonly number[]).includes(parsed) ? parsed : 1;
  } catch {
    return 1;
  }
}

export function setStoredPlaybackSpeed(speed: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_SPEED, String(speed));
  } catch {}
}

export function getStoredAutoplay(fallback = true): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_AUTOPLAY);
    if (raw === null) return fallback;
    return raw !== "false" && raw !== "0";
  } catch {
    return fallback;
  }
}

export function setStoredAutoplay(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_AUTOPLAY, String(enabled));
  } catch {}
}

interface AutoplayCountdownOverlayProps {
  secondsLeft: number;
  totalSeconds?: number;
  nextLessonTitle?: string;
  onPlayNow: () => void;
  onCancel: () => void;
}

export function AutoplayCountdownOverlay({
  secondsLeft,
  totalSeconds = AUTOPLAY_COUNTDOWN_SECONDS,
  nextLessonTitle,
  onPlayNow,
  onCancel,
}: AutoplayCountdownOverlayProps) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(totalSeconds, secondsLeft));
  const progress = clamped / totalSeconds;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center text-white"
      role="dialog"
      aria-live="polite"
      aria-label="Up next autoplay countdown"
    >
      <div className="relative flex h-20 w-20 items-center justify-center mb-4">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 72 72" aria-hidden="true">
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="4"
          />
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke="#a3e635"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-[stroke-dashoffset] duration-700 ease-linear"
          />
        </svg>
        <span className="absolute text-xl font-bold tabular-nums">{clamped}</span>
      </div>

      <p className="text-sm sm:text-base font-semibold tracking-tight">
        Autoplay next lesson in {clamped}s...
      </p>
      {nextLessonTitle && (
        <p className="mt-1 max-w-md truncate text-xs text-white/75">
          Up next: {nextLessonTitle}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onPlayNow}
          className="rounded-full bg-white text-black px-5 py-2 text-xs font-semibold hover:bg-lime-300 transition-colors cursor-pointer"
        >
          Play Now
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-white/30 bg-white/10 px-5 py-2 text-xs font-medium text-white hover:bg-white/20 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export interface YouTubePlayerHandle {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
}

interface YouTubePlayerProps {
  videoId: string;
  lessonId?: string;
  startSeconds?: number;
  endSeconds?: number;
  hasNextLesson?: boolean;
  nextLessonTitle?: string;
  onPlayNext?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  (
    {
      videoId,
      lessonId,
      startSeconds = 0,
      endSeconds,
      hasNextLesson = false,
      nextLessonTitle,
      onPlayNext,
      onTimeUpdate,
      onEnded,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const pendingSecondsRef = useRef<Set<number>>(new Set());
    const recordedSecondsRef = useRef<Set<number>>(new Set());
    const lastRelativeSecondRef = useRef<number>(0);
    const [isReady, setIsReady] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
    const [autoplayEnabled, setAutoplayEnabled] = useState<boolean>(true);
    const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
    const autoplayEnabledRef = useRef(autoplayEnabled);
    const playbackSpeedRef = useRef(playbackSpeed);
    const hasNextLessonRef = useRef(hasNextLesson);

    useEffect(() => {
      autoplayEnabledRef.current = autoplayEnabled;
    }, [autoplayEnabled]);

    useEffect(() => {
      playbackSpeedRef.current = playbackSpeed;
    }, [playbackSpeed]);

    useEffect(() => {
      hasNextLessonRef.current = hasNextLesson;
    }, [hasNextLesson]);

    useEffect(() => {
      setPlaybackSpeed(getStoredPlaybackSpeed());
      setAutoplayEnabled(getStoredAutoplay(true));
    }, []);

    useEffect(() => {
      setCountdownSeconds(null);
    }, [videoId, lessonId]);

    useEffect(() => {
      if (countdownSeconds === null) return;
      if (countdownSeconds <= 0) {
        setCountdownSeconds(null);
        onPlayNext?.();
        return;
      }
      const timer = setTimeout(() => {
        setCountdownSeconds((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    }, [countdownSeconds, onPlayNext]);

    const flushWatchTelemetry = useCallback(
      (useKeepalive = false) => {
        if (!lessonId || pendingSecondsRef.current.size === 0) return;
        const batch = Array.from(pendingSecondsRef.current);
        pendingSecondsRef.current.clear();

        fetch("/api/watch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId,
            seconds: batch,
            lastSecond: lastRelativeSecondRef.current,
          }),
          keepalive: useKeepalive,
        }).catch(() => {});
      },
      [lessonId]
    );

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (playerRef.current && typeof playerRef.current.seekTo === "function") {
          playerRef.current.seekTo(seconds, true);
          playerRef.current.playVideo?.();
        }
      },
      play: () => {
        playerRef.current?.playVideo?.();
      },
      pause: () => {
        playerRef.current?.pauseVideo?.();
      },
      getCurrentTime: () => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
          return playerRef.current.getCurrentTime();
        }
        return 0;
      },
    }));

    useEffect(() => {
      let isMounted = true;

      // Load YouTube IFrame API script if not loaded
      if (!window.YT) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const initPlayer = () => {
        if (!containerRef.current || !window.YT || !window.YT.Player) return;

        // Clean up previous instance
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch {}
        }

        try {
          playerRef.current = new window.YT.Player(containerRef.current, {
            videoId,
            playerVars: {
              autoplay: 1,
              start: Math.floor(startSeconds),
              end: endSeconds ? Math.floor(endSeconds) : undefined,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
            },
            events: {
              onReady: () => {
                if (isMounted) {
                  setIsReady(true);
                  if (startSeconds > 0) {
                    playerRef.current?.seekTo(startSeconds, true);
                  }
                  const initialSpeed = playbackSpeedRef.current;
                  if (initialSpeed !== 1) {
                    try {
                      playerRef.current?.setPlaybackRate?.(initialSpeed);
                    } catch {}
                  }
                }
              },
              onStateChange: (event: any) => {
                // YT.PlayerState.PAUSED = 2, YT.PlayerState.ENDED = 0
                if (event.data === 2) {
                  flushWatchTelemetry(false);
                } else if (event.data === 0) {
                  flushWatchTelemetry(false);
                  if (onEnded) onEnded();
                  if (autoplayEnabledRef.current && hasNextLessonRef.current && onPlayNext) {
                    setCountdownSeconds(AUTOPLAY_COUNTDOWN_SECONDS);
                  }
                }
              },
              onError: (err: any) => {
                console.warn("YouTube Player error:", err);
                if (isMounted) setHasError(true);
              },
            },
          });
        } catch (err) {
          console.warn("Error creating YouTube player:", err);
          if (isMounted) setHasError(true);
        }
      };

      if (window.YT && window.YT.Player) {
        initPlayer();
      } else {
        const previousCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (previousCallback) previousCallback();
          initPlayer();
        };
      }

      // Polling current time for timestamp updates & unique watched-second collection
      intervalRef.current = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
          try {
            const time = playerRef.current.getCurrentTime();
            if (typeof time === "number" && !isNaN(time)) {
              if (onTimeUpdate) onTimeUpdate(time);
              const state = playerRef.current.getPlayerState?.();
              if (lessonId && state === 1) {
                const relSec = Math.floor(Math.max(0, time - startSeconds));
                lastRelativeSecondRef.current = relSec;
                if (!recordedSecondsRef.current.has(relSec)) {
                  recordedSecondsRef.current.add(relSec);
                  pendingSecondsRef.current.add(relSec);
                }
              }
            }
          } catch {}
        }
      }, 500);

      const syncInterval = lessonId
        ? setInterval(() => flushWatchTelemetry(false), 15000)
        : null;

      const handleVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          flushWatchTelemetry(true);
        }
      };
      const handlePageHide = () => {
        flushWatchTelemetry(true);
      };

      if (lessonId) {
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pagehide", handlePageHide);
      }

      return () => {
        isMounted = false;
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (syncInterval) clearInterval(syncInterval);
        if (lessonId) {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
          window.removeEventListener("pagehide", handlePageHide);
          flushWatchTelemetry(true);
        }
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch {}
        }
      };
    }, [videoId, lessonId, startSeconds, endSeconds, flushWatchTelemetry]);

    const handleSelectSpeed = (speed: number) => {
      setPlaybackSpeed(speed);
      setStoredPlaybackSpeed(speed);
      try {
        playerRef.current?.setPlaybackRate?.(speed);
      } catch {}
    };

    const handleToggleAutoplay = () => {
      const next = !autoplayEnabled;
      setAutoplayEnabled(next);
      setStoredAutoplay(next);
      if (!next) setCountdownSeconds(null);
    };

    return (
      <div className="space-y-2">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900 shadow-md">
          <div ref={containerRef} className="h-full w-full" />
          {countdownSeconds !== null && onPlayNext && (
            <AutoplayCountdownOverlay
              secondsLeft={countdownSeconds}
              nextLessonTitle={nextLessonTitle}
              onPlayNow={() => {
                setCountdownSeconds(null);
                onPlayNext();
              }}
              onCancel={() => setCountdownSeconds(null)}
            />
          )}
          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 p-4 text-center text-white">
              <p className="text-sm font-semibold">Video Unavailable via Embed</p>
              <p className="mt-1 text-xs text-slate-300">
                This video might be restricted or deleted by YouTube.
              </p>
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold hover:bg-sky-500"
              >
                Watch on YouTube Directly
              </a>
            </div>
          )}
        </div>
        {isReady && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-ink-soft">
            <div className="flex items-center gap-1" role="group" aria-label="Playback speed">
              <span className="mr-1 font-medium">Speed:</span>
              {PLAYBACK_SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSelectSpeed(s)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                    playbackSpeed === s
                      ? "bg-moss text-white"
                      : "bg-surface text-ink-soft hover:text-ink border border-line"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
            {hasNextLesson && (
              <button
                type="button"
                onClick={handleToggleAutoplay}
                className="flex items-center gap-2 text-xs text-ink-soft hover:text-ink cursor-pointer"
              >
                <span>Autoplay next</span>
                <span
                  className={`inline-block w-8 h-4 rounded-full p-0.5 transition-colors ${
                    autoplayEnabled ? "bg-[#b8c460]" : "bg-black/20 dark:bg-white/20"
                  }`}
                >
                  <span
                    className={`block w-3 h-3 rounded-full bg-white transition-transform ${
                      autoplayEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);

YouTubePlayer.displayName = "YouTubePlayer";
export default YouTubePlayer;

