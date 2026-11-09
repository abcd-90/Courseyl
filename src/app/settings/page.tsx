"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [dailyTime, setDailyTime] = useState(60);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setName(data.user.name || "");
          setDailyTime(data.user.dailyStudyTime || 60);
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyStudyTime: Number(dailyTime) }),
      });
      if (res.ok) {
        setMessage("Settings updated successfully!");
      }
    } catch {
      setMessage("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex bg-[#fcfcfa] text-[#0f1611]">
        <AppSidebar />
        <div className="flex-1 p-12 text-sm text-[#4c4c3d]">Loading profile settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#fcfcfa] text-[#0f1611]">
      <AppSidebar />

      <main className="w-full min-w-0 flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-3xl">
        <div className="mb-2">
          <span className="text-[0.7rem] font-bold text-[#4c4c3d]/70 tracking-widest uppercase">
            Account & Preferences
          </span>
        </div>

        <h1 className="text-3xl font-display font-bold text-[#0f1611]">Settings</h1>

        <form onSubmit={handleSave} className="mt-8 space-y-6">
          <div className="bg-white rounded-3xl border border-[#0f1611]/10 p-6 sm:p-7 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-[#0f1611]">User Profile</h2>

            <div>
              <label className="block text-xs font-semibold text-[#4c4c3d] uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#0f1611]/15 text-sm outline-none focus:border-[#4b5e1e]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4c4c3d] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-3 py-2 rounded-xl border border-[#0f1611]/15 bg-black/5 text-sm text-[#4c4c3d] cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4c4c3d] uppercase tracking-wider mb-1.5">
                Current Subscription Plan
              </label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#e4e9c6] text-[#4b5e1e] font-bold text-xs">
                  {user?.plan || "FREE"} Plan
                </span>
                <span className="text-xs text-[#4c4c3d]">5h monthly video quota</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4c4c3d] uppercase tracking-wider mb-1.5">
                Daily Study Target (Minutes)
              </label>
              <select
                value={dailyTime}
                onChange={(e) => setDailyTime(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#0f1611]/15 text-sm outline-none bg-white focus:border-[#4b5e1e]"
              >
                <option value={30}>30 Minutes / day</option>
                <option value={60}>60 Minutes / day (Standard)</option>
                <option value={90}>90 Minutes / day</option>
                <option value={120}>120 Minutes / day</option>
              </select>
            </div>

            {message && (
              <p className="text-xs font-semibold text-[#4b5e1e]">{message}</p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-[#4b5e1e] text-[#f6f8ec] text-xs sm:text-sm font-semibold hover:bg-[#3c4c16] transition-transform hover:-translate-y-0.5 shadow-sm disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-8 bg-white rounded-3xl border border-[#0f1611]/10 p-6 sm:p-7 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0f1611]">Sign out of CourseIt</h3>
            <p className="text-xs text-[#4c4c3d]">End your current session safely.</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-full border border-[#0f1611]/15 text-xs font-semibold text-[#a0473b] hover:bg-[#f6e1dd] transition-colors"
          >
            Log out
          </button>
        </div>
      </main>
    </div>
  );
}
