"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from "react";

export interface YouTubePlayerHandle {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
}

interface YouTubePlayerProps {
  videoId: string;
  startSeconds?: number;
  endSeconds?: number;
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
  ({ videoId, startSeconds = 0, endSeconds, onTimeUpdate, onEnded }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [hasError, setHasError] = useState(false);

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
                }
              },
              onStateChange: (event: any) => {
                // YT.PlayerState.ENDED = 0
                if (event.data === 0 && onEnded) {
                  onEnded();
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

      // Polling current time for timestamp updates
      intervalRef.current = setInterval(() => {
        if (
          playerRef.current &&
          typeof playerRef.current.getCurrentTime === "function" &&
          onTimeUpdate
        ) {
          try {
            const time = playerRef.current.getCurrentTime();
            if (typeof time === "number" && !isNaN(time)) {
              onTimeUpdate(time);
            }
          } catch {}
        }
      }, 500);

      return () => {
        isMounted = false;
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch {}
        }
      };
    }, [videoId, startSeconds, endSeconds]);

    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900 shadow-md">
        <div ref={containerRef} className="h-full w-full" />
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
    );
  }
);

YouTubePlayer.displayName = "YouTubePlayer";
export default YouTubePlayer;

