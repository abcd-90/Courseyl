"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";

interface PlannerTask {
  lessonId: string;
  lessonTitle: string;
  durationSeconds: number;
  durationMinutes: number;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  courseThumbnail?: string | null;
  chapterTitle: string;
  isToday: boolean;
}

export default function PlannerPage() {
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [customInput, setCustomInput] = useState("");
  const [completedMinutes, setCompletedMinutes] = useState(0);
  const [isGoalAchieved, setIsGoalAchieved] = useState(false);
  const [streak, setStreak] = useState(0);
  const [todayTasks, setTodayTasks] = useState<PlannerTask[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<PlannerTask[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPlanner = useCallback(async () => {
    try {
      const res = await fetch("/api/planner", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) {
          setErrorMsg("Sign in to view and customize your daily study planner.");
        }
        return;
      }
      const data = await res.json();
      setErrorMsg(null);
      setDailyMinutes(data.targetMinutes ?? 60);
      setCompletedMinutes(data.completedMinutes ?? 0);
      setIsGoalAchieved(Boolean(data.isGoalAchieved));
      setStreak(data.currentStreakDays ?? 0);
      setTodayTasks(Array.isArray(data.todayTasks) ? data.todayTasks : []);
      setUpcomingTasks(Array.isArray(data.upcomingTasks) ? data.upcomingTasks : []);
    } catch {
      setErrorMsg("Unable to load your study schedule right now.");
    }
  }, []);

  useEffect(() => {
    fetchPlanner().finally(() => setLoading(false));
  }, [fetchPlanner]);

  const handleSelectTime = async (mins: number) => {
    const previousMinutes = dailyMinutes;
    setDailyMinutes(mins);
    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/planner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyStudyMinutes: mins }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDailyMinutes(previousMinutes);
        setErrorMsg(data.error || "Failed to update daily study goal.");
        return;
      }

      await fetchPlanner();
      window.dispatchEvent(new Event("user-updated"));
    } catch {
      setDailyMinutes(previousMinutes);
      setErrorMsg("Failed to update daily goal. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#fcfcfa] text-[#0f1611]">
      <AppSidebar />

      <main className="w-full min-w-0 flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-5xl">
        <div className="mb-2">
          <span className="text-[0.7rem] font-bold text-[#4c4c3d]/70 tracking-widest uppercase">
            Daily Study Schedule
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#0f1611]">
              Daily study <span className="italic text-[#4b5e1e] font-serif">planner.</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#4c4c3d]">
              Personalized pacing adapted to your daily availability.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e4e9c6] text-[#4b5e1e] text-xs font-bold self-start sm:self-auto">
            <span>🔥</span>
            <span>{streak} Day Study Streak</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-5 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Time Selector Card */}
        <div className="mt-8 bg-white rounded-3xl border border-[#0f1611]/10 p-6 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-display font-bold text-[#0f1611]">
                How much time can you study daily?
              </h2>
              <p className="text-xs text-[#4c4c3d] mt-1">
                We automatically allocate course lessons to match your target without overwhelming you.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#4b5e1e] bg-[#e4e9c6]/60 px-3 py-1 rounded-full self-start sm:self-auto shrink-0">
              {completedMinutes} / {dailyMinutes} min today{isGoalAchieved ? " · Goal met" : ""}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { min: 30, desc: "Bite-sized" },
              { min: 60, desc: "Standard" },
              { min: 90, desc: "Intensive" },
              { min: 120, desc: "Immersion" },
            ].map((item) => (
              <button
                key={item.min}
                type="button"
                onClick={() => handleSelectTime(item.min)}
                disabled={saving}
                className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                  dailyMinutes === item.min
                    ? "bg-[#4b5e1e] text-[#f6f8ec] border-[#4b5e1e] shadow-sm"
                    : "bg-[#fcfcfa] border-[#0f1611]/15 text-[#0f1611] hover:bg-black/5"
                }`}
              >
                <p className="text-xl font-display font-bold">{item.min}m</p>
                <p className={`text-[0.7rem] mt-0.5 ${dailyMinutes === item.min ? "text-[#f6f8ec]/80" : "text-[#4c4c3d]"}`}>
                  {item.desc}
                </p>
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = Number(customInput);
              if (Number.isFinite(parsed) && parsed >= 5 && parsed <= 480) {
                handleSelectTime(Math.round(parsed));
              } else {
                setErrorMsg("Enter any custom goal between 5 and 480 minutes.");
              }
            }}
            className="mt-4 pt-4 border-t border-[#0f1611]/10 flex flex-wrap items-center gap-2.5"
          >
            <label className="text-xs font-medium text-[#4c4c3d]">
              Custom target (5–480 min):
            </label>
            <input
              type="number"
              min={5}
              max={480}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder={`${dailyMinutes}`}
              className="w-24 px-3 py-1.5 rounded-xl border border-[#0f1611]/15 bg-[#fcfcfa] text-xs text-[#0f1611] outline-none focus:border-[#4b5e1e]"
            />
            <button
              type="submit"
              disabled={saving || !customInput.trim()}
              className="px-3.5 py-1.5 rounded-full bg-[#e4e9c6] text-[#4b5e1e] text-xs font-semibold hover:bg-[#d8e0b1] disabled:opacity-50 cursor-pointer"
            >
              Apply custom pace
            </button>
          </form>
        </div>

        {/* Today's Tasks Section */}
        <div className="mt-10">
          <h3 className="text-lg font-display font-bold text-[#0f1611] mb-4">
            Today&apos;s Learning Agenda
          </h3>

          {loading ? (
            <div className="p-8 text-center text-xs text-[#4c4c3d]">Calculating daily agenda...</div>
          ) : todayTasks.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-[#0f1611]/10 text-center shadow-sm">
              <p className="text-sm font-semibold text-[#0f1611]">All caught up for today! 🎉</p>
              <p className="text-xs text-[#4c4c3d] mt-1">
                No remaining lessons are queued for your {dailyMinutes}m goal right now.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayTasks.map((task, idx) => (
                <div
                  key={task.lessonId || idx}
                  className="p-4 rounded-2xl bg-white border border-[#0f1611]/10 flex items-center justify-between gap-3 shadow-sm hover:border-[#4b5e1e]/40 transition-all text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[#e4e9c6] text-[#4b5e1e] text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0f1611] truncate">{task.lessonTitle}</p>
                      <p className="text-[0.7rem] text-[#4c4c3d] truncate">
                        {task.courseTitle} · {task.durationMinutes} min
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/courses/${task.courseSlug}/learn/${task.lessonId}`}
                    className="px-3.5 py-1.5 rounded-full bg-[#4b5e1e] text-[#f6f8ec] text-xs font-semibold hover:bg-[#3c4c16] shrink-0"
                  >
                    Learn Now →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Up Next Section */}
        {!loading && upcomingTasks.length > 0 && (
          <div className="mt-10">
            <h3 className="text-base font-display font-bold text-[#0f1611] mb-3">
              Up Next
            </h3>
            <div className="space-y-2.5">
              {upcomingTasks.map((task, idx) => (
                <div
                  key={task.lessonId || idx}
                  className="p-3.5 rounded-2xl bg-white/80 border border-[#0f1611]/10 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#0f1611] truncate">{task.lessonTitle}</p>
                    <p className="text-[0.7rem] text-[#4c4c3d] truncate">
                      {task.courseTitle} · {task.durationMinutes} min
                    </p>
                  </div>

                  <Link
                    href={`/courses/${task.courseSlug}/learn/${task.lessonId}`}
                    className="px-3 py-1 rounded-full border border-[#0f1611]/15 text-[#0f1611] text-xs font-semibold hover:bg-black/5 shrink-0"
                  >
                    Preview →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
