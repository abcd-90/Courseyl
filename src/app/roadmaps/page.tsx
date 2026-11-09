"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";

export default function RoadmapsPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [userRoadmaps, setUserRoadmaps] = useState<any[]>([]);
  const [communityRoadmaps, setCommunityRoadmaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/roadmaps")
      .then((res) => res.json())
      .then((data) => {
        if (data.userRoadmaps) {
          setUserRoadmaps(data.userRoadmaps);
        }
        if (data.roadmaps) {
          setCommunityRoadmaps(data.roadmaps);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/roadmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: "Curated learning journey",
        }),
      });
      const data = await res.json();
      if (res.ok && data.roadmap) {
        router.push(`/roadmaps/${data.roadmap.slug || data.roadmap.id}`);
      } else {
        alert(data.error || "Please login to create roadmaps.");
      }
    } catch {
      alert("Failed to create roadmap.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-paper text-ink">
      <AppSidebar />

      <main className="w-full min-w-0 flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-5xl">
        {/* Category Tag matching Screenshot 2 */}
        <div className="mb-2">
          <span className="text-[0.7rem] font-bold text-ink-soft/70 tracking-widest uppercase font-mono">
            Roadmaps
          </span>
        </div>

        {/* Header row with Browse button */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink tracking-tight">
              Your learning <span className="italic text-moss font-serif">paths.</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-soft">
              A roadmap is your own set of courses from different creators, in stages.
            </p>
          </div>
          <div>
            <Link
              href="/community"
              className="inline-flex items-center px-5 py-2.5 rounded-full border border-line dark:border-[#263725] bg-surface dark:bg-[#0c140e] text-xs sm:text-sm font-medium text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors shadow-xs cursor-pointer"
            >
              Browse community roadmaps
            </Link>
          </div>
        </div>

        {/* Creator Card matching Screenshot 2 */}
        <div className="mt-8 bg-surface dark:bg-[#0d140f] rounded-2xl border border-line dark:border-[#1b261e] p-5 sm:p-6 shadow-sm text-ink">
          <h2 className="text-base sm:text-lg font-bold text-ink">
            Let&apos;s create a roadmap for you
          </h2>
          <p className="text-xs text-ink-soft mt-1">
            Private to you. Share the link and others can enroll
          </p>

          <form onSubmit={handleCreate} className="mt-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-2xl sm:rounded-full border border-line dark:border-[#263528] bg-white dark:bg-[#161c18] shadow-inner focus-within:border-moss focus-within:ring-2 focus-within:ring-moss/20 transition-all">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Become an AI Engineer"
                className="w-full px-4 py-2 bg-transparent dark:bg-transparent text-sm text-ink placeholder-ink-soft/60 outline-none border-none shadow-none"
              />
              <button
                type="submit"
                disabled={creating}
                className="w-full sm:w-auto shrink-0 px-5 py-2.5 rounded-full bg-[#b8c460] text-[#0f1611] text-xs sm:text-sm font-semibold hover:bg-[#a6b350] transition-colors cursor-pointer shadow-xs"
              >
                {creating ? "Creating..." : "+ Create roadmap"}
              </button>
            </div>
          </form>
        </div>

        {/* Yours Section matching Reference Screenshot 1 */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xl font-display font-medium text-ink">Yours</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-ink-soft font-mono">
              {userRoadmaps.length}
            </span>
          </div>

          {loading ? (
            <p className="text-xs sm:text-sm text-ink-soft">Loading your roadmaps...</p>
          ) : userRoadmaps.length === 0 ? (
            <p className="text-xs sm:text-sm text-ink-soft">
              No roadmaps yet. Name one above, or enroll in one from Community.
            </p>
          ) : (
            <div className="flex flex-wrap gap-5">
              {userRoadmaps.map((r) => (
                <Link
                  key={r.id}
                  href={`/roadmaps/${r.slug || r.id}`}
                  className="group bg-surface dark:bg-[#0c120e] rounded-3xl border border-line dark:border-white/10 p-3 shadow-xs hover:border-moss/40 hover:shadow-md transition-all flex flex-col text-ink w-[280px] sm:w-[300px]"
                >
                  {/* Thumbnail Image Container with • Private badge */}
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-black border border-line dark:border-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.thumbnailUrl || "https://i.ytimg.com/vi/LSk5KaEGVK4/maxresdefault.jpg"}
                      alt={r.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/80 text-white text-[0.68rem] font-medium flex items-center gap-1.5 backdrop-blur-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
                      <span>Private</span>
                    </div>
                  </div>

                  {/* Roadmap details */}
                  <div className="pt-3.5 pb-1 px-1 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-ink group-hover:text-moss transition-colors leading-snug">
                        {r.title}
                      </h4>
                      <p className="text-xs text-ink-soft">
                        {r.stageCount || 1} stage · {r.totalCourses || 1} course
                      </p>
                      <p className="text-xs text-ink-soft">
                        {r.enrollmentCount || 0} learners
                      </p>
                    </div>

                    {/* Bottom Progress Row matching Screenshot 1 */}
                    <div className="mt-4 pt-3 flex items-center justify-between text-xs text-ink-soft border-t border-line dark:border-white/5">
                      <span>Your progress</span>
                      <span className="font-mono font-medium text-ink">{r.progressPercentage || 0}%</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
