"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";

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

export default function PlacementTestPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [testData, setTestData] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/courses/${resolvedParams.id}/placement-test`)
      .then((res) => res.json())
      .then((data) => {
        if (data.questions) {
          setTestData(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${resolvedParams.id}/placement-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        alert(data.error || "Failed to submit assessment.");
      }
    } catch {
      alert("Error evaluating test.");
    } finally {
      setSubmitting(false);
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

  const courseSlug = resolvedParams.id;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-paper text-ink">
      <AppSidebar />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-4xl">
        {/* Back navigation */}
        <Link
          href={`/courses/${courseSlug}`}
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-ink-soft hover:text-ink transition-colors mb-6 group cursor-pointer"
        >
          <span className="transition-transform group-hover:-translate-x-0.5 font-bold">←</span>
          <span>Back to course</span>
        </Link>

        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 rounded-full bg-lime-soft dark:bg-[#1c2717] text-moss dark:text-[#b8c460] border border-line dark:border-[#2b3a1d] text-xs font-semibold mb-3">
            Diagnostic Assessment
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink">
            Personalized Placement Test
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-ink-soft max-w-xl mx-auto">
            Test out of concepts you already understand. Any question you pass will automatically mark those foundational lessons as skipped.
          </p>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {testData?.questions?.map((q: any, idx: number) => {
              const options = typeof q.options === "string" ? JSON.parse(q.options) : q.options;

              return (
                <div key={q.id} className="bg-surface dark:bg-[#121815] rounded-3xl border border-line dark:border-white/10 p-6 sm:p-7 shadow-sm space-y-4">
                  <div className="flex items-center justify-between text-xs text-ink-soft">
                    <span className="font-semibold text-moss dark:text-[#b8c460] font-mono text-[0.72rem] tracking-wide uppercase">
                      {cleanDisplay(q.topicName) || `Concept ${idx + 1}`}
                    </span>
                    <span className="font-mono text-xs">1 Point</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-ink leading-snug">
                    {cleanDisplay(q.questionText || q.question)}
                  </h3>

                  <div className="space-y-2.5">
                    {options.map((opt: any, optIdx: number) => {
                      const optIndex = typeof opt === "object" && opt.optionIndex !== undefined ? opt.optionIndex : optIdx;
                      const optText = cleanDisplay(typeof opt === "string" ? opt : opt.optionText || opt.text || String(opt));
                      const isSelected = answers[q.id] === optIndex;
                      return (
                        <button
                          key={optIndex}
                          type="button"
                          onClick={() => setAnswers({ ...answers, [q.id]: optIndex })}
                          className={`w-full p-3.5 rounded-2xl border text-left text-xs sm:text-sm transition-all flex items-center gap-3 cursor-pointer ${
                            isSelected
                              ? "border-moss bg-lime-soft/90 dark:bg-[#202d18] text-pill-ink dark:text-[#b8c460] font-semibold shadow-xs"
                              : "border-line dark:border-white/10 bg-surface dark:bg-[#0c120e] text-ink hover:bg-muted dark:hover:bg-white/5"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? "border-moss bg-moss text-on-moss" : "border-line dark:border-white/20"
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                          </span>
                          <span className="leading-relaxed">{optText}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-full bg-[#b8c460] text-[#0f1611] text-sm font-semibold hover:bg-[#a6b350] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Evaluating answers..." : "Complete Placement Assessment →"}
            </button>
          </form>
        ) : (
          /* Result Summary Card */
          <div className="bg-surface rounded-3xl border border-line p-8 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-lime-soft text-moss mx-auto flex items-center justify-center font-bold text-2xl">
              ✓
            </div>
            <h2 className="text-2xl font-display font-bold text-ink">
              Diagnostic Evaluation Complete!
            </h2>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div>
                <p className="text-xs text-ink-soft">Proficiency Score</p>
                <p className="text-2xl font-bold text-moss">{result?.scorePercentage ?? 0}%</p>
              </div>
              <div className="h-8 w-px bg-line" />
              <div>
                <p className="text-xs text-ink-soft">Skipped Lessons</p>
                <p className="text-2xl font-bold text-ink">{result?.skippedCount ?? result?.skippedLessonCount ?? 0}</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-ink-soft max-w-md mx-auto leading-relaxed">
              We&apos;ve customized your course. Lessons covering concepts you passed have been marked as skipped, saving you estimated study hours! You can unskip any lesson at any time.
            </p>

            <div className="pt-2">
              <Link
                href={`/courses/${result?.courseSlug || testData?.courseSlug || testData?.course?.slug || courseSlug}`}
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#b8c460] text-[#0f1611] text-sm font-semibold hover:bg-[#a6b350] transition-colors"
              >
                Go to Customized Curriculum →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
