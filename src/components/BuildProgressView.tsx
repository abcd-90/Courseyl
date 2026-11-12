"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { getCleanThumbnailUrl } from "@/lib/thumbnail";

export interface BuildPipelineStep {
  step: number;
  key: string;
  label: string;
  state: "completed" | "active" | "pending" | "failed";
}

export interface BuildJobPayload {
  id: string;
  courseId: string;
  slug: string;
  courseTitle: string;
  courseStatus: string;
  thumbnailUrl: string | null;
  totalDurationSeconds: number;
  difficulty: string;
  status: string;
  progressPercentage: number;
  currentStep: string;
  checkpointStep: number;
  quotaCharged: boolean;
  canRetry: boolean;
  errorLog: string | null;
  startedAt: string;
  completedAt: string | null;
  steps: BuildPipelineStep[];
}

function formatDurationCompact(seconds: number): string {
  if (!seconds || seconds <= 0) return "Scanning length...";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(1, m)}m`;
}

export function BuildProgressView({
  initialJob,
  courseSlug,
  youtubeVideoId,
}: {
  initialJob: BuildJobPayload;
  courseSlug: string;
  youtubeVideoId?: string | null;
}) {
  const router = useRouter();
  const [job, setJob] = useState<BuildJobPayload>(initialJob);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const steppingRef = useRef(false);
  const unmountedRef = useRef(false);

  const pollJobStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/jobs/${job.id}`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.job && !unmountedRef.current) {
        setJob(data.job);
        return data.job as BuildJobPayload;
      }
    } catch {
      // Transient network hiccup; next poll recovers
    }
    return null;
  }, [job.id]);

  // Step driver: advances one checkpointed stage per invocation until COMPLETED or FAILED
  const advanceOneStep = useCallback(async () => {
    if (steppingRef.current || unmountedRef.current) return;
    steppingRef.current = true;

    let nextJob: BuildJobPayload | null = null;
    try {
      const res = await fetch(`/api/courses/jobs/${job.id}/step`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.job) {
          nextJob = data.job as BuildJobPayload;
        }
      }
    } catch {
      // Poller handles status & next step retry
    } finally {
      steppingRef.current = false;
    }

    if (nextJob && !unmountedRef.current) {
      setJob(nextJob);
    }
  }, [job.id]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  // Poll GET /api/courses/jobs/[jobId] every 5 seconds & advance checkpoints cleanly while active
  useEffect(() => {
    if (job.status === "COMPLETED" || job.status === "FAILED") {
      return;
    }

    // Trigger next checkpoint step cleanly if idle
    if (!steppingRef.current) {
      void advanceOneStep();
    }

    const pollInterval = setInterval(() => {
      void pollJobStatus().then((latest) => {
        if (
          latest &&
          (latest.status === "PENDING" || latest.status === "PROCESSING") &&
          !steppingRef.current
        ) {
          void advanceOneStep();
        }
      });
    }, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [job.status, job.checkpointStep, pollJobStatus, advanceOneStep]);

  // Auto-redirect to course view once finalized
  useEffect(() => {
    if (job.status !== "COMPLETED") return;
    const timer = setTimeout(() => {
      router.push(`/courses/${courseSlug}`);
    }, 1200);
    return () => clearTimeout(timer);
  }, [job.status, courseSlug, router]);

  const handleRetry = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await fetch(`/api/courses/jobs/${job.id}/retry`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.job) {
        throw new Error(data?.error || "Could not resume build from checkpoint.");
      }
      setJob(data.job);
    } catch (err: unknown) {
      setRetryError(err instanceof Error ? err.message : "Retry failed.");
    } finally {
      setRetrying(false);
    }
  };

  const thumb = getCleanThumbnailUrl(job.thumbnailUrl, courseSlug, youtubeVideoId);
  const isCompleted = job.status === "COMPLETED";
  const isFailed = job.status === "FAILED";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-paper text-ink w-full">
      <AppSidebar />

      <main className="w-full min-w-0 flex-1 p-4 sm:p-6 md:p-10 max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/generate"
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-ink-soft hover:text-ink transition-colors"
          >
            <span className="font-bold">←</span>
            <span>Course Studio</span>
          </Link>

          <span className="px-3 py-1 rounded-full bg-surface dark:bg-[#121914] border border-line dark:border-white/10 text-[0.7rem] font-mono font-semibold text-ink-soft">
            Job ID: {job.id.slice(0, 10)}
          </span>
        </div>

        <div className="bg-surface dark:bg-[#0c120e] rounded-3xl border border-line dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-6">
          {/* Course Header Summary */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-line dark:border-white/10">
            <div className="w-full sm:w-40 aspect-video rounded-2xl overflow-hidden bg-black/20 border border-line dark:border-white/10 shrink-0">
              <img
                src={thumb}
                alt={job.courseTitle}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-lime-soft dark:bg-[#1a2515] text-moss dark:text-[#b8c460] text-[0.68rem] font-bold uppercase tracking-wider">
                  {job.difficulty}
                </span>
                <span className="text-xs font-mono text-ink-soft">
                  {formatDurationCompact(job.totalDurationSeconds)}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[0.68rem] font-bold uppercase tracking-wider ${
                    isCompleted
                      ? "bg-[#253818]/15 dark:bg-[#253818] text-moss dark:text-[#c0d86e]"
                      : isFailed
                        ? "bg-red-500/15 text-red-700 dark:text-[#f2a79e]"
                        : "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                  }`}
                >
                  {job.status}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-display font-bold text-ink leading-snug">
                {job.courseTitle}
              </h1>
              <p className="text-xs sm:text-sm text-ink-soft">
                {isCompleted
                  ? "Curriculum, study notes, quizzes, and placement diagnostic are ready."
                  : isFailed
                    ? "Build paused at the step below. Your progress checkpoint is saved safely."
                    : job.currentStep}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-ink-soft">
                {isCompleted
                  ? "Course build finished"
                  : isFailed
                    ? `Paused at checkpoint ${job.checkpointStep}/4`
                    : "Building interactive course pipeline..."}
              </span>
              <span className="font-mono text-moss dark:text-[#b8c460]">
                {job.progressPercentage}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-paper dark:bg-[#141d17] border border-line dark:border-white/5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isFailed ? "bg-red-500" : "bg-[#4b5e1e] dark:bg-[#b8c460]"
                }`}
                style={{ width: `${Math.min(100, Math.max(5, job.progressPercentage))}%` }}
              />
            </div>
          </div>

          {/* 4 Pipeline Checkpoints */}
          <div className="space-y-3">
            {job.steps.map((step) => {
              const stepDone = step.state === "completed";
              const stepActive = step.state === "active";
              const stepFailed = step.state === "failed";

              return (
                <div
                  key={step.step}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    stepDone
                      ? "bg-lime-soft/35 dark:bg-[#152012] border-[#b8c460]/50 dark:border-[#395522]"
                      : stepActive
                        ? "bg-paper dark:bg-[#131b15] border-moss/50 dark:border-[#b8c460]/50"
                        : stepFailed
                          ? "bg-red-50/60 dark:bg-[#2a1514] border-red-300 dark:border-[#6b2a24]"
                          : "bg-paper/50 dark:bg-[#0f1611] border-line dark:border-white/5 opacity-65"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        stepDone
                          ? "bg-[#4b5e1e] dark:bg-[#b8c460] text-[#f6f8ec] dark:text-[#0f1611]"
                          : stepActive
                            ? "bg-[#4b5e1e]/15 dark:bg-[#b8c460]/20 text-moss dark:text-[#b8c460] animate-pulse"
                            : stepFailed
                              ? "bg-red-500/20 text-red-700 dark:text-[#f2a79e]"
                              : "bg-surface dark:bg-[#161f19] text-ink-soft border border-line dark:border-white/10"
                      }`}
                    >
                      {stepDone ? "✓" : stepFailed ? "!" : step.step}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-ink">
                        Step {step.step}: {step.label}
                      </p>
                      <p className="text-[0.72rem] text-ink-soft mt-0.5">
                        {stepDone
                          ? "Checkpoint saved"
                          : stepActive
                            ? "Processing..."
                            : stepFailed
                              ? "Failed at this stage"
                              : "Waiting in queue"}
                      </p>
                    </div>
                  </div>

                  <span className="text-[0.68rem] font-mono uppercase tracking-wider shrink-0 text-ink-soft">
                    {stepDone
                      ? "Done"
                      : stepActive
                        ? "Active"
                        : stepFailed
                          ? "Failed"
                          : "Queued"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Failed State + Retry Action */}
          {isFailed && (
            <div className="p-4 sm:p-5 rounded-2xl bg-red-50/80 dark:bg-[#2a1514] border border-red-200 dark:border-[#6b2a24] space-y-3">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold text-red-800 dark:text-[#f2a79e]">
                  Build interrupted
                </p>
                <p className="text-xs text-red-700/90 dark:text-[#f4b6af]">
                  {job.errorLog || "An unexpected error occurred while processing this stage."}
                </p>
                {retryError && (
                  <p className="text-xs font-semibold text-red-800 dark:text-[#f2a79e]">
                    {retryError}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleRetry()}
                  disabled={retrying}
                  className="px-5 py-2 rounded-full bg-[#4b5e1e] dark:bg-[#b8c460] text-[#f6f8ec] dark:text-[#0f1611] text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {retrying
                    ? "Resuming..."
                    : `Retry from checkpoint (Step ${Math.min(4, job.checkpointStep + 1)} · No quota burned)`}
                </button>
                <Link
                  href="/generate"
                  className="px-4 py-2 rounded-full border border-line dark:border-white/15 text-xs font-semibold text-ink hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Start another link
                </Link>
              </div>
            </div>
          )}

          {/* Completed Action Bar + Auto-Redirect Notice */}
          {isCompleted && (
            <div className="p-4 sm:p-5 rounded-2xl bg-lime-soft/45 dark:bg-[#172413] border border-[#b8c460]/60 dark:border-[#395522] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs sm:text-sm font-bold text-moss dark:text-[#c7dc80]">
                  Course ready! Redirecting to syllabus…
                </p>
                <p className="text-[0.72rem] text-ink-soft mt-0.5">
                  Want to skip topics you already know? Try the 2-minute placement check first.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  href={`/courses/${courseSlug}/placement-test`}
                  className="px-4 py-2 rounded-full border border-line dark:border-white/15 bg-surface dark:bg-[#0c120e] text-xs font-semibold text-ink hover:border-moss transition-colors"
                >
                  Placement test
                </Link>
                <Link
                  href={`/courses/${courseSlug}`}
                  className="px-5 py-2 rounded-full bg-[#4b5e1e] dark:bg-[#b8c460] text-[#f6f8ec] dark:text-[#0f1611] text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Open course →
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
