"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/lib/supabaseClient";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [dailyTime, setDailyTime] = useState(60);
  const [customMinutes, setCustomMinutes] = useState("45");
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [emailReminders, setEmailReminders] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(true);

  const PRESET_MINUTES = [30, 60, 90, 120];

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          const initialName =
            data.user.profile?.displayName ||
            data.user.displayName ||
            data.user.name ||
            "";
          setName(initialName);
          const mins = data.user.profile?.dailyStudyMinutes || 60;
          setDailyTime(mins);
          if (!PRESET_MINUTES.includes(mins)) {
            setUseCustomTime(true);
            setCustomMinutes(String(mins));
          }
          setEmailReminders(data.user.profile?.emailReminders ?? true);
          setWeeklyDigest(data.user.profile?.weeklyDigest ?? false);
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setIsError(true);
      setMessage("Please enter a valid full name.");
      return;
    }

    const effectiveMinutes = useCustomTime ? Number(customMinutes) : Number(dailyTime);
    if (!Number.isFinite(effectiveMinutes) || effectiveMinutes < 5 || effectiveMinutes > 480) {
      setIsError(true);
      setMessage("Daily study time must be between 5 and 480 minutes.");
      return;
    }

    setSaving(true);
    setMessage("");
    setIsError(false);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name.trim(),
          dailyStudyMinutes: Math.round(effectiveMinutes),
          emailReminders,
          weeklyDigest,
        }),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setName(data.user.profile?.displayName || name.trim());
        setDailyTime(data.user.profile?.dailyStudyMinutes || Math.round(effectiveMinutes));
        setIsError(false);
        setMessage("Settings updated successfully!");

        // Broadcast to sidebar, header, dashboard across the app
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("user-updated", { detail: data.user })
          );
        }
      } else {
        setIsError(true);
        setMessage(data.error || "Failed to save settings.");
      }
    } catch {
      setIsError(true);
      setMessage("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex bg-paper text-ink">
        <AppSidebar />
        <div className="flex-1 p-12 text-sm text-ink-soft">
          Loading profile settings...
        </div>
      </div>
    );
  }

  const currentPlan =
    user?.subscription?.tier || user?.plan || "FREE";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-paper text-ink">
      <AppSidebar />

      <main className="w-full min-w-0 flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-3xl">
        <div className="mb-2">
          <span className="text-[0.7rem] font-bold text-ink-soft/70 tracking-widest uppercase font-mono">
            Account & Preferences
          </span>
        </div>

        <h1 className="text-3xl font-display font-bold text-ink">Settings</h1>

        <form onSubmit={handleSave} className="mt-8 space-y-6">
          <div className="bg-surface dark:bg-[#121815] rounded-3xl border border-line dark:border-white/10 p-6 sm:p-7 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-ink">User Profile</h2>

            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name (e.g. Mr Sami)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-line dark:border-white/15 bg-white dark:bg-[#0c120e] text-ink text-sm outline-none focus:border-[#4b5e1e] dark:focus:border-[#b8c460] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-line dark:border-white/10 bg-black/5 dark:bg-white/5 text-sm text-ink-soft cursor-not-allowed font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
                Current Subscription Plan
              </label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#b8c460]/20 text-[#4b5e1e] dark:text-[#b8c460] font-bold text-xs">
                  {currentPlan.toUpperCase()} Plan
                </span>
                <span className="text-xs text-ink-soft">
                  {currentPlan.toUpperCase() === "FREE"
                    ? "5h monthly video quota"
                    : "Unlimited courses & video hours"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
                Daily Study Target (Minutes)
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_MINUTES.map((mins) => {
                  const active = !useCustomTime && dailyTime === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        setUseCustomTime(false);
                        setDailyTime(mins);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        active
                          ? "bg-[#4b5e1e] dark:bg-[#b8c460] text-white dark:text-[#0f1611] border-[#4b5e1e] dark:border-[#b8c460]"
                          : "bg-white dark:bg-[#0c120e] border-line dark:border-white/15 text-ink hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      {mins} min{mins === 60 ? " (Standard)" : ""}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setUseCustomTime(true)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    useCustomTime
                      ? "bg-[#4b5e1e] dark:bg-[#b8c460] text-white dark:text-[#0f1611] border-[#4b5e1e] dark:border-[#b8c460]"
                      : "bg-white dark:bg-[#0c120e] border-line dark:border-white/15 text-ink hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  Custom
                </button>
              </div>

              {useCustomTime && (
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="number"
                    min={5}
                    max={480}
                    step={5}
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-36 px-3.5 py-2 rounded-xl border border-line dark:border-white/15 bg-white dark:bg-[#0c120e] text-ink text-sm outline-none focus:border-[#4b5e1e] dark:focus:border-[#b8c460]"
                  />
                  <span className="text-xs text-ink-soft">
                    Enter any pace between 5 and 480 minutes / day.
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-line/70 dark:border-white/10 space-y-3">
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider">
                Email Preferences
              </label>

              <label className="flex items-center justify-between gap-4 p-3 rounded-2xl border border-line dark:border-white/10 bg-white/60 dark:bg-[#0c120e]/60 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-ink">Daily study reminders</p>
                  <p className="text-xs text-ink-soft">
                    Helpful nudges when lessons are queued in Today&apos;s agenda.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailReminders}
                  onChange={(e) => setEmailReminders(e.target.checked)}
                  className="w-4 h-4 accent-[#4b5e1e] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between gap-4 p-3 rounded-2xl border border-line dark:border-white/10 bg-white/60 dark:bg-[#0c120e]/60 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-ink">Weekly progress digest</p>
                  <p className="text-xs text-ink-soft">
                    Summary of lessons finished, study time, and quiz accuracy.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={weeklyDigest}
                  onChange={(e) => setWeeklyDigest(e.target.checked)}
                  className="w-4 h-4 accent-[#4b5e1e] cursor-pointer"
                />
              </label>
            </div>

            {message && (
              <p
                className={`text-xs font-semibold ${
                  isError ? "text-red-500" : "text-[#4b5e1e] dark:text-[#b8c460]"
                }`}
              >
                {message}
              </p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-[#4b5e1e] hover:bg-[#3d4c18] dark:bg-[#b8c460] dark:hover:bg-[#a6b350] text-white dark:text-[#0f1611] text-xs sm:text-sm font-semibold transition-transform hover:-translate-y-0.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-8 bg-surface dark:bg-[#121815] rounded-3xl border border-line dark:border-white/10 p-6 sm:p-7 shadow-xs flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink">Sign out of Courseyl</h3>
            <p className="text-xs text-ink-soft">End your current session safely.</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-full border border-line dark:border-white/15 text-xs font-semibold text-[#a0473b] hover:bg-[#f6e1dd] dark:hover:bg-[#331815] transition-colors cursor-pointer"
          >
            Log out
          </button>
        </div>
      </main>
    </div>
  );
}

