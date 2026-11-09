"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  BookOpen,
  Compass,
  Map,
  CreditCard,
  LogOut,
  User,
  Shield,
  Menu,
  X,
  Flame,
  LayoutDashboard,
  FileText,
  Calendar,
} from "lucide-react";

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN" | "CREATOR";
  profile?: {
    streakDays: number;
    dailyGoalMin: number;
  };
  subscription?: {
    tier: "FREE" | "PRO" | "MAX";
    status: string;
  };
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  };

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#07090e]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 transition-all hover:scale-105">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 text-white shadow-lg shadow-sky-500/25 ring-1 ring-white/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-white">
              Course<span className="text-gradient-vibrant">It</span>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1.5 md:flex">
          <Link
            href="/community"
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
              isActive("/community")
                ? "bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-[0_0_12px_rgba(14,165,233,0.2)]"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            Explore Courses
          </Link>
          <Link
            href="/roadmaps"
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
              isActive("/roadmaps")
                ? "bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-[0_0_12px_rgba(14,165,233,0.2)]"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            Roadmaps
          </Link>
          <Link
            href="/pricing"
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
              isActive("/pricing")
                ? "bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-[0_0_12px_rgba(14,165,233,0.2)]"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            Pricing
          </Link>

          {user && (
            <>
              <Link
                href="/dashboard"
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                  isActive("/dashboard")
                    ? "bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-[0_0_12px_rgba(14,165,233,0.2)]"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/planner"
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                  isActive("/planner")
                    ? "bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-[0_0_12px_rgba(14,165,233,0.2)]"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                Daily Plan
              </Link>
              <Link
                href="/notes"
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                  isActive("/notes")
                    ? "bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-[0_0_12px_rgba(14,165,233,0.2)]"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                Notes
              </Link>
            </>
          )}
        </nav>

        {/* Right Action Area */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Streak Badge */}
              <div
                title={`${user.profile?.streakDays || 1} day study streak`}
                className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
              >
                <Flame className="h-4 w-4 fill-amber-400 text-amber-400 animate-pulse" />
                <span>{user.profile?.streakDays || 1}d</span>
              </div>

              {/* Course Generator Button */}
              <Link
                href="/generate"
                className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 transition-all hover:scale-[1.03] hover:shadow-sky-500/30 active:scale-[0.98]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Build Course</span>
              </Link>

              {/* User Avatar Menu Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 text-xs font-bold text-sky-300 transition-all hover:border-sky-500/50 hover:shadow-[0_0_12px_rgba(14,165,233,0.25)]"
                >
                  {user.name ? user.name[0].toUpperCase() : "U"}
                </button>

                {isProfileOpen && (
                  <div
                    onMouseLeave={() => setIsProfileOpen(false)}
                    className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-[#0d121e]/95 p-2 shadow-2xl backdrop-blur-2xl ring-1 ring-black/50"
                  >
                    <div className="border-b border-white/10 p-3">
                      <p className="truncate text-sm font-bold text-white">{user.name}</p>
                      <p className="truncate text-xs text-slate-400">{user.email}</p>
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                        <span>{user.subscription?.tier || "FREE"} TIER</span>
                      </div>
                    </div>

                    <div className="py-1 text-xs">
                      <Link
                        href="/dashboard"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                      >
                        <LayoutDashboard className="h-4 w-4 text-sky-400" />
                        <span>Dashboard</span>
                      </Link>
                      <Link
                        href="/planner"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                      >
                        <Calendar className="h-4 w-4 text-emerald-400" />
                        <span>Daily Planner</span>
                      </Link>
                      <Link
                        href="/notes"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                      >
                        <FileText className="h-4 w-4 text-amber-400" />
                        <span>My Notes</span>
                      </Link>
                      <Link
                        href="/billing"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                      >
                        <CreditCard className="h-4 w-4 text-purple-400" />
                        <span>Billing & Quota</span>
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                      >
                        <User className="h-4 w-4 text-slate-400" />
                        <span>Account Settings</span>
                      </Link>

                      {user.role === "ADMIN" && (
                        <Link
                          href="/admin"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-bold text-amber-300 transition-all hover:bg-amber-500/10"
                        >
                          <Shield className="h-4 w-4 text-amber-400" />
                          <span>Admin Console</span>
                        </Link>
                      )}

                      <div className="my-1 border-t border-white/10" />

                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-rose-400 transition-all hover:bg-rose-500/10 hover:text-rose-300"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="rounded-xl px-3.5 py-2 text-xs font-bold text-slate-300 transition-all hover:bg-white/5 hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 transition-all hover:scale-[1.03] active:scale-[0.98]"
              >
                Get Started Free
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 md:hidden"
            aria-label="Toggle navigation menu"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMenuOpen && (
        <div className="border-b border-white/10 bg-[#07090e]/95 px-4 pt-2 pb-6 backdrop-blur-2xl md:hidden">
          <nav className="flex flex-col gap-1">
            <Link
              href="/community"
              onClick={() => setIsMenuOpen(false)}
              className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
            >
              Explore Courses
            </Link>
            <Link
              href="/roadmaps"
              onClick={() => setIsMenuOpen(false)}
              className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
            >
              Roadmaps
            </Link>
            <Link
              href="/pricing"
              onClick={() => setIsMenuOpen(false)}
              className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
            >
              Pricing
            </Link>

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  Dashboard
                </Link>
                <Link
                  href="/generate"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl px-3.5 py-2.5 text-sm font-bold text-sky-400 hover:bg-sky-500/10"
                >
                  ✨ Build New Course
                </Link>
                <Link
                  href="/planner"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  Daily Planner
                </Link>
                <Link
                  href="/notes"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  My Notes
                </Link>
                <Link
                  href="/billing"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  Billing & Quota
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  Settings
                </Link>

                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="rounded-xl px-3.5 py-2.5 text-sm font-bold text-amber-300 hover:bg-amber-500/10"
                  >
                    🛡️ Admin Console
                  </Link>
                )}

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleLogout();
                  }}
                  className="mt-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-left text-sm font-bold text-rose-300"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full rounded-xl border border-white/10 py-2.5 text-center text-sm font-bold text-slate-300 hover:bg-white/5"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 py-2.5 text-center text-sm font-bold text-white shadow-lg shadow-indigo-500/25"
                >
                  Get Started Free
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
