"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { CourseItFooter } from "@/components/CourseItFooter";

export default function NewRoadmapPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [badge, setBadge] = useState("🎯");
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [stages, setStages] = useState<
    { title: string; description: string; courseIds: string[] }[]
  >([
    { title: "Stage 1: Foundations", description: "Core fundamentals and mental models.", courseIds: [] },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/courses?limit=50")
      .then((res) => res.json())
      .then((d) => setAvailableCourses(d.courses || []))
      .catch((err) => console.error(err));
  }, []);

  const handleAddStage = () => {
    setStages((prev) => [
      ...prev,
      {
        title: `Stage ${prev.length + 1}: Deep Dive`,
        description: "Advanced techniques and practical applications.",
        courseIds: [],
      },
    ]);
  };

  const handleRemoveStage = (sIdx: number) => {
    if (stages.length <= 1) return;
    setStages((prev) => prev.filter((_, idx) => idx !== sIdx));
  };

  const handleToggleCourseInStage = (sIdx: number, courseId: string) => {
    setStages((prev) => {
      const copy = [...prev];
      const currentIds = copy[sIdx].courseIds;
      if (currentIds.includes(courseId)) {
        copy[sIdx].courseIds = currentIds.filter((id) => id !== courseId);
      } else {
        copy[sIdx].courseIds = [...currentIds, courseId];
      }
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/roadmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          badge,
          stages,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create roadmap.");
      }

      router.push(`/roadmaps/${data.roadmap.id || data.roadmap.slug}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating roadmap.");
    } finally {
      setSubmitting(false);
    }
  };

  const badgeOptions = ["🎯", "🚀", "⚡", "🧠", "💻", "🔥", "🛠️", "🌟"];

  return (
    <div className="flex min-h-screen flex-col bg-[#fcfcfa] text-[#0f1611]">
      <MarketingNavbar />

      <main className="flex-1 pb-24 pt-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-[0.7rem] font-bold text-[#4b5e1e] uppercase tracking-wider px-3 py-1 rounded-full bg-[#e4e9c6]">
              Roadmap Studio
            </span>
            <h1 className="mt-3 text-3xl font-display font-bold text-[#0f1611] tracking-tight sm:text-4xl">
              Create a Learning Roadmap
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-[#4c4c3d] max-w-lg mx-auto">
              Curate multi-course tracks into clear sequential stages for yourself and the community.
            </p>
          </div>

          <div className="mt-8 bg-white rounded-3xl border border-[#0f1611]/10 p-6 sm:p-10 shadow-sm">
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#0f1611]">
                  Track Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Modern Full-Stack AI Engineer"
                  className="mt-2 w-full rounded-2xl border border-[#0f1611]/15 bg-[#fcfcfa] px-4 py-3 text-sm text-[#0f1611] placeholder-[#4c4c3d]/60 outline-none focus:border-[#4b5e1e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#0f1611]">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what learners will achieve upon completing this roadmap..."
                  className="mt-2 w-full rounded-2xl border border-[#0f1611]/15 bg-[#fcfcfa] p-4 text-xs sm:text-sm text-[#0f1611] placeholder-[#4c4c3d]/60 outline-none focus:border-[#4b5e1e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#0f1611]">
                  Choose Badge Icon
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {badgeOptions.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBadge(b)}
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-xl transition-all ${
                        badge === b
                          ? "border-[#4b5e1e] bg-[#e4e9c6] scale-105"
                          : "border-[#0f1611]/15 bg-[#fcfcfa] hover:bg-black/5"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stages List */}
              <div className="border-t border-[#0f1611]/10 pt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#0f1611]">
                    Roadmap Stages
                  </h2>
                  <button
                    type="button"
                    onClick={handleAddStage}
                    className="px-3 py-1.5 rounded-full border border-[#4b5e1e]/30 bg-[#e4e9c6] text-xs font-bold text-[#4b5e1e] hover:bg-[#d8e0b6] transition"
                  >
                    + Add Another Stage
                  </button>
                </div>

                {stages.map((stage, sIdx) => (
                  <div
                    key={sIdx}
                    className="rounded-2xl border border-[#0f1611]/10 bg-[#fcfcfa] p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#4b5e1e]">
                        Stage {sIdx + 1}
                      </span>
                      {stages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStage(sIdx)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={stage.title}
                      onChange={(e) => {
                        const copy = [...stages];
                        copy[sIdx].title = e.target.value;
                        setStages(copy);
                      }}
                      required
                      placeholder="Stage Title"
                      className="w-full rounded-xl border border-[#0f1611]/15 bg-white px-3 py-2 text-xs text-[#0f1611] placeholder-[#4c4c3d]/60 outline-none focus:border-[#4b5e1e]"
                    />

                    <div>
                      <p className="text-[11px] font-semibold text-[#4c4c3d] mb-2">
                        Select courses for this stage:
                      </p>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
                        {availableCourses.map((c) => {
                          const isChecked = stage.courseIds.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              className={`flex items-center gap-2.5 rounded-xl border p-2 text-xs cursor-pointer transition ${
                                isChecked
                                  ? "border-[#4b5e1e] bg-[#e4e9c6]/40 text-[#0f1611] font-medium"
                                  : "border-[#0f1611]/10 bg-white text-[#4c4c3d] hover:bg-black/5"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleCourseInStage(sIdx, c.id)}
                                className="accent-[#4b5e1e]"
                              />
                              <span className="truncate">{c.title}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-full bg-[#4b5e1e] text-[#f6f8ec] text-sm font-semibold hover:bg-[#3c4c16] transition-transform hover:-translate-y-0.5 shadow-sm disabled:opacity-50"
              >
                {submitting ? "Publishing Track..." : "Publish Roadmap Track →"}
              </button>
            </form>
          </div>
        </div>
      </main>

      <CourseItFooter />
    </div>
  );
}
