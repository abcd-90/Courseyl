"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { clampDailyStudyMinutes, estimatePacedDays } from "@/lib/pacing";

const cleanDisplay = (str: string) => {
  if (!str) return "";
  return str
    .replace(/\\u0026/g, "&")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0027/g, "'")
    .replace(/\\u0022/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
  }
  return `${m}m`;
}

export default function PlacementTestPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [testData, setTestData] = useState<any>(null);
  const [dailyStudyMinutes, setDailyStudyMinutes] = useState<number>(60);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePlanView, setActivePlanView] = useState<"my" | "full">("my");
  const [togglingMap, setTogglingMap] = useState<Record<string, boolean>>({});

  const courseSlug = resolvedParams.id;

  const fetchQuestions = () => {
    setLoading(true);
    fetch(`/api/courses/${courseSlug}/placement-test`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.questions) {
          setTestData(data);
        }
        if (typeof data.dailyStudyMinutes === "number") {
          setDailyStudyMinutes(clampDailyStudyMinutes(data.dailyStudyMinutes, 60));
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQuestions();
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.profile?.dailyStudyMinutes) {
          setDailyStudyMinutes(
            clampDailyStudyMinutes(data.user.profile.dailyStudyMinutes, 60)
          );
        }
      })
      .catch(() => {});

    const handleUserUpdated = (e: any) => {
      const mins = e?.detail?.profile?.dailyStudyMinutes;
      if (mins) {
        setDailyStudyMinutes(clampDailyStudyMinutes(mins, 60));
      }
    };
    window.addEventListener("user-updated", handleUserUpdated);
    return () => window.removeEventListener("user-updated", handleUserUpdated);
  }, [courseSlug]);

  const questions = testData?.questions || [];
  const currentQ = questions[currentQIndex];

  const handleSelectOption = (optIndex: number) => {
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optIndex }));
  };

  const submitEvaluation = async (answersPayload: Record<string, number>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${courseSlug}/placement-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersPayload }),
      });
      const data = await res.json();
      if (res.ok) {
        if (typeof data.dailyStudyMinutes === "number") {
          setDailyStudyMinutes(clampDailyStudyMinutes(data.dailyStudyMinutes, 60));
        }
        setResult(data);
      } else {
        alert(data.error || "Failed to submit assessment.");
      }
    } catch {
      alert("Error evaluating placement test.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextOrSubmit = async () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      await submitEvaluation(answers);
    }
  };

  const handleSkipQuestion = async () => {
    if (!currentQ || submitting) return;
    const nextAnswers = { ...answers, [currentQ.id]: -1 };
    setAnswers(nextAnswers);
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      await submitEvaluation(nextAnswers);
    }
  };

  const handleRetake = () => {
    setResult(null);
    setAnswers({});
    setCurrentQIndex(0);
  };

  const toggleLessonSkip = async (lessonId: string, currentIsSkipped: boolean) => {
    if (!result || togglingMap[lessonId]) return;
    setTogglingMap((prev) => ({ ...prev, [lessonId]: true }));

    const newIsSkipped = !currentIsSkipped;

    // Optimistically update result lessons
    setResult((prev: any) => {
      if (!prev || !prev.lessons) return prev;
      const updatedLessons = prev.lessons.map((l: any) =>
        l.id === lessonId ? { ...l, isSkipped: newIsSkipped } : l
      );

      const skippedCount = updatedLessons.filter((l: any) => l.isSkipped).length;
      const skippedDurationSeconds = updatedLessons
        .filter((l: any) => l.isSkipped)
        .reduce((acc: number, l: any) => acc + (l.durationSeconds || 0), 0);

      return {
        ...prev,
        lessons: updatedLessons,
        skippedCount,
        skippedDurationSeconds,
      };
    });

    try {
      await fetch(`/api/courses/${courseSlug}/lessons/${lessonId}/toggle-skip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSkipped: newIsSkipped }),
      });
    } catch { } finally {
      setTogglingMap((prev) => ({ ...prev, [lessonId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-paper text-ink">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center p-12 text-sm text-ink-soft">
          Preparing diagnostic assessment...
        </div>
      </div>
    );
  }

  // --- VIEW 1: PLACEMENT RESULT SCREEN (Matches frame_035.jpg & frame_040.jpg) ---
  if (result) {
    const totalLessons = result.totalLessons || result.lessons?.length || 0;
    const skippedCount = result.skippedCount ?? 0;
    const skippedDurationSeconds = result.skippedDurationSeconds ?? 0;
    const totalDurationSeconds = result.totalDurationSeconds ?? 0;
    const activeDurationSeconds = Math.max(0, totalDurationSeconds - skippedDurationSeconds);
    const activeLessons = result.lessons?.filter((l: any) => !l.isSkipped) || [];
    const skippedLessons = result.lessons?.filter((l: any) => l.isSkipped) || [];
    const displayDurationSeconds =
      activePlanView === "my" ? activeDurationSeconds : totalDurationSeconds;
    const estimatedDays = estimatePacedDays(displayDurationSeconds, dailyStudyMinutes);
    const firstActiveLessonId = result.firstActiveLessonId || activeLessons[0]?.id || result.lessons?.[0]?.id;

    return (
      <div className="min-h-screen flex flex-col bg-[#fafcf7] dark:bg-[#0c120e] text-ink">
        <main className="w-full min-w-0 flex-1 p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto max-w-6xl mx-auto">
          {/* Top navigation row */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href={`/courses/${courseSlug}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line dark:border-white/10 bg-surface dark:bg-[#121815] text-xs font-semibold text-ink-soft hover:text-ink transition-colors cursor-pointer"
            >
              <span>←</span>
              <span>Back to course</span>
            </Link>

            <button
              onClick={handleRetake}
              className="text-xs font-semibold text-ink-soft hover:text-ink underline cursor-pointer"
            >
              Retake the test
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.3fr] gap-8">
            {/* Left Column: Result summary and cards */}
            <div className="space-y-6">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-[#f0f3eb] dark:bg-[#1f2a1d] text-[#4b5e1e] dark:text-[#b8c460] text-[0.72rem] font-semibold mb-3">
                  Step 2 of 2 · Your placement result
                </span>

                <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink leading-tight">
                  You already know{" "}
                  <span className="text-[#4b5e1e] dark:text-[#b8c460]">
                    {skippedCount} of {totalLessons} lessons.
                  </span>
                </h1>

                <p className="mt-3 text-xs sm:text-sm text-ink-soft leading-relaxed">
                  Nemotron 3 Ultra matched your answers to the lessons they cover. Flip any lesson to watch it anyway.
                </p>
              </div>

              {/* Connected Ticket Metric Cards */}
              <div className="flex items-stretch gap-2.5">
                {/* Time Saved Ticket */}
                <div className="flex-1 bg-[#b8c460] text-[#0f1611] rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between shadow-xs">
                  <span className="text-[0.68rem] font-bold tracking-wider uppercase font-mono text-[#0f1611]/70">
                    TIME SAVED
                  </span>
                  <p className="text-3xl sm:text-4xl font-display font-extrabold mt-2">
                    {formatDuration(skippedDurationSeconds)}
                  </p>
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#fafcf7] dark:bg-[#0c120e]" />
                </div>

                {/* Score Ticket */}
                <div className="flex-1 bg-[#b8c460] text-[#0f1611] rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between shadow-xs">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#fafcf7] dark:bg-[#0c120e]" />
                  <span className="text-[0.68rem] font-bold tracking-wider uppercase font-mono text-[#0f1611]/70">
                    SCORE
                  </span>
                  <p className="text-3xl sm:text-4xl font-display font-extrabold mt-2">
                    {result.correctCount ?? 0} / {result.totalQuestions ?? 5}
                  </p>
                </div>
              </div>

              {/* Course Duration & Action Card */}
              <div className="bg-surface dark:bg-[#121815] rounded-3xl border border-line dark:border-white/10 p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-soft font-medium">{dailyStudyMinutes} min a day</span>
                  <div className="flex items-center p-1 rounded-full bg-black/5 dark:bg-white/5 border border-line dark:border-white/10 text-xs">
                    <button
                      onClick={() => setActivePlanView("full")}
                      className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${activePlanView === "full"
                        ? "bg-white dark:bg-[#1f2a1d] text-ink shadow-xs"
                        : "text-ink-soft hover:text-ink"
                        }`}
                    >
                      Full course
                    </button>
                    <button
                      onClick={() => setActivePlanView("my")}
                      className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${activePlanView === "my"
                        ? "bg-[#4b5e1e] dark:bg-[#b8c460] text-white dark:text-[#0f1611] shadow-xs"
                        : "text-ink-soft hover:text-ink"
                        }`}
                    >
                      My course
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-4xl sm:text-5xl font-display font-bold text-[#4b5e1e] dark:text-[#b8c460]">
                    {activePlanView === "my"
                      ? formatDuration(activeDurationSeconds)
                      : formatDuration(totalDurationSeconds)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f0f3eb] dark:bg-[#1f2a1d] text-[#4b5e1e] dark:text-[#b8c460] font-mono font-bold text-[0.68rem]">
                      {estimatedDays} DAYS
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-ink-soft font-mono font-medium text-[0.68rem]">
                      {activeLessons.length} OF {totalLessons} LESSONS
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (firstActiveLessonId) {
                        router.push(`/courses/${courseSlug}/learn/${firstActiveLessonId}`);
                      } else {
                        router.push(`/courses/${courseSlug}`);
                      }
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#4b5e1e] hover:bg-[#3d4c18] dark:bg-[#b8c460] dark:hover:bg-[#a6b350] text-white dark:text-[#0f1611] font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer text-center"
                  >
                    Start learning
                  </button>

                  <Link
                    href={`/courses/${courseSlug}`}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-line dark:border-white/10 bg-surface dark:bg-white/5 text-xs sm:text-sm font-semibold text-ink hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer text-center"
                  >
                    See the day plan
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Curriculum Panels */}
            <div className="space-y-6">
              {/* Panel 1: "You know this" (SKIPPED) */}
              {skippedLessons.length > 0 ? (
                <div className="bg-surface dark:bg-[#121815] rounded-3xl border border-line dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-line dark:border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-ink">You know this</h2>
                      <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-ink-soft text-[0.65rem] font-mono font-bold uppercase">
                        SKIPPED
                      </span>
                    </div>
                    <span className="text-xs text-ink-soft font-mono">
                      {skippedLessons.length} lessons
                    </span>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {skippedLessons.map((l: any, idx: number) => (
                      <div
                        key={l.id || idx}
                        className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs text-ink-soft"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-3">
                          <span className="font-mono text-ink-soft/60 shrink-0">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className="line-through truncate text-ink-soft/70">
                            {cleanDisplay(l.title)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-[0.68rem] text-ink-soft/70">
                            {formatDuration(l.durationSeconds)}
                          </span>

                          {/* Toggle Switch (Turned OFF) */}
                          <button
                            type="button"
                            onClick={() => toggleLessonSkip(l.id, true)}
                            title="Flip to include lesson"
                            className="w-10 h-5.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors bg-[#d1d5db] dark:bg-white/20 shrink-0"
                          >
                            <div className="bg-white dark:bg-[#0f1611] w-4.5 h-4.5 rounded-full shadow-md transform transition-transform" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-surface dark:bg-[#121815] rounded-3xl border border-line dark:border-white/10 p-5 text-center text-xs text-ink-soft">
                  Nothing skipped. Every lesson is in your plan.
                </div>
              )}

              {/* Panel 2: "You'll learn this" */}
              <div className="bg-surface dark:bg-[#121815] rounded-3xl border border-line dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-line dark:border-white/10 pb-3">
                  <h2 className="text-sm font-bold text-ink">You&apos;ll learn this</h2>
                  <span className="text-xs text-ink-soft font-mono">
                    {activeLessons.length} lessons
                  </span>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {activeLessons.map((l: any, idx: number) => (
                    <div
                      key={l.id || idx}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs text-ink"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-3">
                        <span className="font-mono text-ink-soft shrink-0">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="font-medium truncate">{cleanDisplay(l.title)}</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-[0.68rem] text-ink-soft">
                          {formatDuration(l.durationSeconds)}
                        </span>

                        {/* Toggle Switch (Turned ON in green) */}
                        <button
                          type="button"
                          onClick={() => toggleLessonSkip(l.id, false)}
                          title="Flip to skip lesson"
                          className="w-10 h-5.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors bg-[#4b5e1e] dark:bg-[#b8c460] shrink-0"
                        >
                          <div className="bg-white dark:bg-[#0f1611] w-4.5 h-4.5 rounded-full shadow-md transform translate-x-4.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- VIEW 2: STEP-BY-STEP QUESTION INTERFACE (Matches frame_030.jpg) ---
  const currentOptions = Array.isArray(currentQ?.options)
    ? currentQ.options
    : typeof currentQ?.options === "string"
      ? JSON.parse(currentQ.options)
      : [];

  const selectedAnswer = answers[currentQ?.id];
  const optionLetters = ["A", "B", "C", "D"];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#fafcf7] dark:bg-[#0c120e] text-ink">
      <AppSidebar />

      <main className="w-full min-w-0 flex-1 p-6 md:p-10 overflow-y-auto max-w-3xl mx-auto flex flex-col justify-center">
        {/* Top header navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href={`/courses/${courseSlug}`}
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-ink-soft hover:text-ink transition-colors cursor-pointer"
          >
            <span>←</span>
            <span>Back to course</span>
          </Link>

          <span className="text-xs font-mono font-semibold text-moss dark:text-[#b8c460]">
            Question {currentQIndex + 1} of {questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-lime-soft dark:bg-[#1a2517] h-1.5 rounded-full overflow-hidden mb-8">
          <div
            className="bg-moss dark:bg-[#b8c460] h-full rounded-full transition-all duration-300"
            style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Active Question Box */}
        <div className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-ink leading-snug">
            {cleanDisplay(currentQ?.questionText || currentQ?.question)}
          </h2>

          <div className="space-y-3 pt-2">
            {currentOptions.map((opt: any, optIdx: number) => {
              const optIndex =
                typeof opt === "object" && opt.optionIndex !== undefined
                  ? opt.optionIndex
                  : optIdx;
              const optText = cleanDisplay(
                typeof opt === "string" ? opt : opt.optionText || opt.text || String(opt)
              );
              const isSelected = selectedAnswer === optIndex;
              const letter = optionLetters[optIdx] || String(optIdx + 1);

              return (
                <button
                  key={optIndex}
                  type="button"
                  onClick={() => handleSelectOption(optIndex)}
                  className={`w-full p-4 rounded-2xl border text-left text-sm transition-all flex items-center gap-4 cursor-pointer ${isSelected
                    ? "border-[#4b5e1e] dark:border-[#b8c460] bg-[#eef3e5] dark:bg-[#1a2516] shadow-xs"
                    : "border-line dark:border-white/10 bg-surface dark:bg-[#121815] text-ink hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${isSelected
                      ? "bg-[#4b5e1e] dark:bg-[#b8c460] text-white dark:text-[#0f1611]"
                      : "bg-black/5 dark:bg-white/10 text-ink-soft"
                      }`}
                  >
                    {letter}
                  </span>
                  <span className="leading-relaxed font-medium">{optText}</span>
                </button>
              );
            })}

            {/* "Skip this question" option (Matches frame_030.jpg) */}
            <button
              type="button"
              onClick={() => handleSelectOption(-1)}
              className={`w-full p-4 rounded-2xl border text-left text-sm transition-all flex items-center gap-4 cursor-pointer ${selectedAnswer === -1
                ? "border-[#4b5e1e] dark:border-[#b8c460] bg-[#eef3e5] dark:bg-[#1a2516] shadow-xs"
                : "border-line dark:border-white/10 bg-surface dark:bg-[#121815] text-ink hover:bg-black/5 dark:hover:bg-white/5"
                }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${selectedAnswer === -1
                  ? "bg-[#4b5e1e] dark:bg-[#b8c460] text-white dark:text-[#0f1611]"
                  : "bg-[#e4e9c6] text-[#4b5e1e] dark:bg-[#283117] dark:text-[#b8c460]"
                  }`}
              >
                ?
              </span>
              <span className="leading-relaxed font-medium">Skip this question</span>
            </button>
          </div>

          {/* Subtext from reference site */}
          <p className="text-xs text-ink-soft/80 pt-2">
            No score to beat, and no going back. &ldquo;Skip this question&rdquo; keeps those lessons in your plan.
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleNextOrSubmit}
              disabled={selectedAnswer === undefined || submitting}
              className="px-8 py-3 rounded-full bg-[#2d3a14] dark:bg-[#b8c460] text-white dark:text-[#0f1611] text-sm font-semibold hover:bg-[#202a0e] dark:hover:bg-[#a6b350] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
            >
              {submitting
                ? "Evaluating assessment..."
                : currentQIndex < questions.length - 1
                  ? "Next question"
                  : "Complete assessment →"}
            </button>

            <button
              type="button"
              onClick={handleSkipQuestion}
              disabled={submitting}
              className="px-5 py-3 rounded-full border border-line dark:border-white/10 bg-surface dark:bg-[#121815] text-xs sm:text-sm font-semibold text-ink-soft hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-40 cursor-pointer"
            >
              Skip this question →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
