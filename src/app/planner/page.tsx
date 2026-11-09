"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";

export default function PlannerPage() {
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [streak, setStreak] = useState(1);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/planner")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setDailyMinutes(data.user.dailyStudyTime || 60);
          setStreak(data.user.streak || 1);
          setDailyTasks(data.dailyTasks || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelectTime = async (mins: number) => {
    setDailyMinutes(mins);
    setSaving(true);
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyStudyTime: mins }),
      });
      const data = await res.json();
      if (res.ok) {
        setDailyTasks(data.dailyTasks || []);
      }
    } catch {
      alert("Failed to update daily goal.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#fcfcfa] text-[#0f1611]">
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

        {/* Time Selector Card */}
        <div className="mt-8 bg-white rounded-3xl border border-[#0f1611]/10 p-6 sm:p-7 shadow-sm">
          <h2 className="text-base font-display font-bold text-[#0f1611]">
            How much time can you study daily?
          </h2>
          <p className="text-xs text-[#4c4c3d] mt-1">
            We automatically allocate course lessons to match your target without overwhelming you.
          </p>

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
                className={`p-4 rounded-2xl border text-center transition-all ${
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
        </div>

        {/* Today's Tasks Section */}
        <div className="mt-10">
          <h3 className="text-lg font-display font-bold text-[#0f1611] mb-4">
            Today&apos;s Learning Agenda
          </h3>

          {loading ? (
            <div className="p-8 text-center text-xs text-[#4c4c3d]">Calculating daily agenda...</div>
          ) : dailyTasks.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-[#0f1611]/10 text-center shadow-sm">
              <p className="text-sm font-semibold text-[#0f1611]">All caught up for today! 🎉</p>
              <p className="text-xs text-[#4c4c3d] mt-1">
                You&apos;ve completed all lessons allocated for your {dailyMinutes}m goal.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dailyTasks.map((task: any, idx: number) => (
                <div
                  key={task.lessonId || idx}
                  className="p-4 rounded-2xl bg-white border border-[#0f1611]/10 flex items-center justify-between shadow-sm hover:border-[#4b5e1e]/40 transition-all text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#e4e9c6] text-[#4b5e1e] text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-[#0f1611]">{task.title}</p>
                      <p className="text-[0.7rem] text-[#4c4c3d]">Estimated study time: {task.durationMinutes} min</p>
                    </div>
                  </div>

                  <Link
                    href={`/courses/${task.courseSlug}/learn/${task.lessonId}`}
                    className="px-3.5 py-1.5 rounded-full bg-[#4b5e1e] text-[#f6f8ec] text-xs font-semibold hover:bg-[#3c4c16]"
                  >
                    Learn Now →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
