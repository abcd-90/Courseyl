"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { CourseItFooter } from "@/components/CourseItFooter";

function GenerateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [url, setUrl] = useState("");
  const [difficulty, setDifficulty] = useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED">("BEGINNER");
  const [manualTranscript, setManualTranscript] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressStage, setProgressStage] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const qUrl = searchParams.get("url");
    if (qUrl) {
      setUrl(qUrl);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("Please provide a valid YouTube video or playlist link.");
      return;
    }

    setLoading(true);
    setError("");
    setProgressStage("Validating YouTube URL and checking metadata...");
    setProgressPercent(15);

    try {
      const stepTimer1 = setTimeout(() => {
        setProgressStage("Extracting accessible transcript and timestamps...");
        setProgressPercent(40);
      }, 1000);

      const stepTimer2 = setTimeout(() => {
        setProgressStage("Segmenting topics and structuring course chapters...");
        setProgressPercent(70);
      }, 2500);

      const stepTimer3 = setTimeout(() => {
        setProgressStage("Generating interactive quizzes and study notes...");
        setProgressPercent(90);
      }, 4000);

      const res = await fetch("/api/courses/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          difficulty,
          manualTranscript: manualTranscript.trim() || undefined,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?next=${encodeURIComponent(`/generate?url=${encodeURIComponent(url.trim())}`)}`);
          return;
        }
        throw new Error(data.error || "Failed to generate course.");
      }

      setProgressPercent(100);
      setProgressStage("Course generated successfully! Redirecting...");
      setTimeout(() => {
        const targetSlug = data.course?.slug || data.courseId;
        router.push(`/courses/${targetSlug}`);
      }, 800);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during course generation.");
      setLoading(false);
      setProgressPercent(0);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <div className="inline-block px-3 py-1 rounded-full bg-[#e4e9c6] text-[#4b5e1e] text-xs font-semibold mb-3">
          AI Course Studio
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#0f1611]">
          Generate an interactive course from <span className="italic text-[#4b5e1e] font-serif">YouTube</span>
        </h1>
        <p className="mt-2 text-sm text-[#4c4c3d]">
          Paste any tutorial or playlist. CourseIt transcribes it, splits it into bite-sized lessons, generates quizzes with video replays, and creates placement tests.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-[#0f1611]/10 p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL Input */}
          <div>
            <label className="block text-xs font-semibold text-[#0f1611] uppercase tracking-wider mb-2">
              YouTube Video or Playlist URL
            </label>
            <div className="flex items-center gap-2 p-2.5 rounded-2xl border border-[#0f1611]/15 dark:border-[#263528] bg-[#fcfcfa] dark:bg-[#161c18] focus-within:border-[#4b5e1e] focus-within:ring-2 focus-within:ring-[#4b5e1e]/20 transition-all">
              <svg className="w-5 h-5 text-[#ef4444] shrink-0 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or playlist link"
                disabled={loading}
                required
                className="w-full bg-transparent dark:bg-transparent text-sm text-[#0f1611] dark:text-[#f1f3ea] placeholder-[#4c4c3d]/60 outline-none border-none shadow-none"
              />
            </div>
          </div>

          {/* Difficulty Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#0f1611] uppercase tracking-wider mb-2">
              Target Difficulty Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const).map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setDifficulty(lvl)}
                  disabled={loading}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                    difficulty === lvl
                      ? "bg-[#4b5e1e] text-[#f6f8ec] shadow-sm"
                      : "bg-[#fcfcfa] border border-[#0f1611]/15 text-[#4c4c3d] hover:text-[#0f1611]"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Transcript Fallback Accordion */}
          <div className="pt-2 border-t border-[#0f1611]/10">
            <button
              type="button"
              onClick={() => setShowManual(!showManual)}
              className="text-xs font-medium text-[#4b5e1e] hover:underline flex items-center gap-1"
            >
              <span>{showManual ? "− Hide manual transcript fallback" : "+ No captions on video? Paste transcript or text manually"}</span>
            </button>

            {showManual && (
              <div className="mt-3">
                <textarea
                  value={manualTranscript}
                  onChange={(e) => setManualTranscript(e.target.value)}
                  placeholder="Paste video transcript, article text, or lecture notes here..."
                  rows={4}
                  className="w-full p-3 rounded-2xl border border-[#0f1611]/15 bg-[#fcfcfa] text-xs text-[#0f1611] placeholder-[#4c4c3d]/60 outline-none focus:border-[#4b5e1e]"
                />
              </div>
            )}
          </div>

          {/* Progress State */}
          {loading && (
            <div className="p-4 rounded-2xl bg-[#e4e9c6]/40 border border-[#4b5e1e]/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#4b5e1e]">
                <span>{progressStage}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white overflow-hidden">
                <div
                  className="h-full bg-[#4b5e1e] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-[#f6e1dd] border border-[#a0473b]/30 text-xs text-[#a0473b] font-medium">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-[#4b5e1e] text-[#f6f8ec] text-sm font-semibold hover:bg-[#3c4c16] transition-transform hover:-translate-y-0.5 shadow-sm disabled:opacity-50"
          >
            {loading ? "Generating course with AI..." : "Chop into interactive course →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfa] text-[#0f1611]">
      <MarketingNavbar />
      <main className="flex-1">
        <Suspense fallback={<div className="p-12 text-center text-sm text-[#4c4c3d]">Loading studio...</div>}>
          <GenerateContent />
        </Suspense>
      </main>
      <CourseItFooter />
    </div>
  );
}
