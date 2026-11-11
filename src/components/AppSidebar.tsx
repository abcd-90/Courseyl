"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CourseItLogo } from "./CourseItLogo";
import { useSiteSettings } from "./SiteSettingsProvider";
import { getCleanThumbnailUrl } from "@/lib/thumbnail";
import { supabase } from "@/lib/supabaseClient";

export function AppSidebar() {
  const pathname = usePathname();
  const { settings } = useSiteSettings();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState<number>(0);

  const isUnlimitedMode =
    settings?.plans?.unlimitedFreeMode === true ||
    (settings?.plans?.unlimitedFreeMode === undefined &&
      settings?.plans?.freeHoursLimit &&
      settings.plans.freeHoursLimit >= 999);
  const rawFreeHours =
    settings?.plans?.freeHoursLimit && settings.plans.freeHoursLimit < 999
      ? settings.plans.freeHoursLimit
      : 5;
  const effectiveFreeHours =
    currentUser?.subscription?.tier === "MAX"
      ? settings?.plans?.maxHoursLimit || 40
      : currentUser?.subscription?.tier === "PRO"
      ? settings?.plans?.proHoursLimit || 20
      : rawFreeHours;

  // Dynamic recent courses from user's actual activity
  const [recents, setRecents] = useState<any[]>([]);

  useEffect(() => {
    const fetchUserData = () => {
      fetch("/api/auth/me", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
            // Fetch user's real enrolled courses count
            fetch("/api/courses?enrolled=true", { cache: "no-store" })
              .then((r) => r.json())
              .then((cd) => {
                if (Array.isArray(cd.courses) && cd.courses.length > 0) {
                  setEnrolledCount(cd.courses.length);

                  // Auto-enrich recents with accurate thumbnails from database
                  setRecents((prev) => {
                    if (!prev || prev.length === 0) {
                      const fallbackRecents = cd.courses.slice(0, 3).map((c: any) => {
                        const cleanThumb = getCleanThumbnailUrl(c.thumbnailUrl, c.slug);
                        return {
                          id: c.id,
                          slug: c.slug,
                          title: c.title,
                          thumbnail: cleanThumb,
                          thumbnailUrl: cleanThumb,
                          progress: c.progressPercentage || 0,
                        };
                      });
                      try {
                        localStorage.setItem("courseit_recent_courses", JSON.stringify(fallbackRecents));
                      } catch {}
                      return fallbackRecents;
                    }

                    const enriched = prev.map((r: any) => {
                      const match = cd.courses.find((c: any) => c.slug === r.slug || c.id === r.id);
                      const thumb = getCleanThumbnailUrl(
                        match?.thumbnailUrl || r.thumbnail || r.thumbnailUrl,
                        r.slug || match?.slug
                      );

                      return {
                        ...r,
                        title: r.title || match?.title,
                        thumbnail: thumb,
                        thumbnailUrl: thumb,
                        progress: typeof r.progress === "number" ? r.progress : (match?.progressPercentage || 0),
                      };
                    });

                    try {
                      localStorage.setItem("courseit_recent_courses", JSON.stringify(enriched));
                    } catch {}
                    return enriched;
                  });
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    };

    fetchUserData();

    const handleUserUpdated = (e: any) => {
      if (e.detail) {
        setCurrentUser(e.detail);
      } else {
        fetchUserData();
      }
    };

    window.addEventListener("user-updated", handleUserUpdated);
    window.addEventListener("focus", fetchUserData);

    try {
      const stored = localStorage.getItem("courseit_recent_courses");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.map((item: any) => {
            const cleanThumb = getCleanThumbnailUrl(item.thumbnail || item.thumbnailUrl, item.slug);
            return {
              ...item,
              thumbnail: cleanThumb,
              thumbnailUrl: cleanThumb,
            };
          });
          setRecents(cleaned);
          localStorage.setItem("courseit_recent_courses", JSON.stringify(cleaned));
        }
      }
    } catch {}

    return () => {
      window.removeEventListener("user-updated", handleUserUpdated);
      window.removeEventListener("focus", fetchUserData);
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
    setShowUserMenu(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut().catch(() => {});
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {}
  };

  const navItems = [
    {
      name: "Today",
      href: "/dashboard",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      active: pathname === "/dashboard" || pathname === "/",
    },
    {
      name: "My courses",
      href: "/courses",
      badge: enrolledCount > 0 ? String(enrolledCount) : undefined,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      active: pathname.startsWith("/courses") && !pathname.includes("/learn"),
    },
    {
      name: "Roadmaps",
      href: "/roadmaps",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      active: pathname.startsWith("/roadmaps"),
    },
    {
      name: "Notes",
      href: "/notes",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      active: pathname === "/notes",
    },
    {
      name: "Inbox",
      href: "/inbox",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      active: pathname === "/inbox",
    },
  ];

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col justify-between h-full min-h-0 space-y-5">
      <div className="space-y-5 overflow-y-auto pr-1">
        {/* Top Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <CourseItLogo size="default" />
          {isMobile ? (
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 rounded-xl text-ink-soft hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              className="text-ink-soft hover:text-ink p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="CourseIt Workspace"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M9 4v16" />
              </svg>
            </button>
          )}
        </div>

        {/* Primary CTA: + New course */}
        <div>
          <Link
            href="/generate"
            onClick={() => isMobile && setIsMobileOpen(false)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#b8c460] text-[#0f1611] text-sm font-semibold hover:bg-[#a6b350] transition-transform hover:-translate-y-0.5 shadow-sm"
          >
            <span className="text-base font-bold">+</span>
            <span>New course</span>
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => isMobile && setIsMobileOpen(false)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                item.active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "text-ink-soft hover:bg-black/5 dark:hover:bg-white/5 hover:text-ink"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={item.active ? "text-moss" : "text-ink-soft"}>{item.icon}</span>
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[0.68rem] px-2 py-0.5 rounded-full font-mono font-medium ${
                    (item as any).badgeVariant === "lime"
                      ? "bg-[#b8c460] text-[#0f1611] font-bold"
                      : "bg-black/10 dark:bg-white/10 text-ink-soft"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* RECENTS Section */}
        <div className="pt-2 px-2 space-y-2">
          <h5 className="text-[0.68rem] font-bold text-ink-soft/70 tracking-wider uppercase font-mono px-1">
            RECENTS
          </h5>
          {recents.length > 0 ? (
            <div className="space-y-1.5">
              {recents.slice(0, 3).map((r, idx) => {
                const thumb = getCleanThumbnailUrl(
                  r.thumbnail || r.thumbnailUrl,
                  r.slug
                );

                return (
                  <Link
                    key={r.slug || idx}
                    href={`/courses/${r.slug}`}
                    onClick={() => isMobile && setIsMobileOpen(false)}
                    className="flex items-center justify-between p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-md overflow-hidden bg-black shrink-0 border border-line">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumb}
                          alt={r.title || "Course thumbnail"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              "https://i.ytimg.com/vi/3iFMc6ELt7k/hqdefault.jpg";
                          }}
                        />
                      </div>
                      <span className="truncate text-ink-soft group-hover:text-ink transition-colors font-medium">
                        {r.title}
                      </span>
                    </div>
                    <span className="text-[0.68rem] font-mono text-ink-soft shrink-0 ml-1">
                      {r.progress || 0}%
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-ink-soft/60 px-1 leading-snug">
              Courses you start will show up here.
            </p>
          )}
        </div>

        {/* Quota Meter Card */}
        <div className="bg-surface dark:bg-[#121a15] rounded-2xl border border-line dark:border-white/10 p-3.5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-ink">Hours left</span>
            {isUnlimitedMode ? (
              <span className="px-2 py-0.5 rounded-full bg-[#e4e9c6] dark:bg-[#283117] text-[#4b5e1e] dark:text-[#b8c460] text-[0.68rem] font-bold font-mono">
                Unlimited
              </span>
            ) : (
              <span className="text-ink-soft font-mono">
                {currentUser?.subscription
                  ? `${Math.max(0, effectiveFreeHours - Math.floor((currentUser.subscription.monthlyHoursUsedSeconds || 0) / 3600))}h / ${effectiveFreeHours}h`
                  : `${effectiveFreeHours}h / ${effectiveFreeHours}h`}
              </span>
            )}
          </div>
          <div className="w-full bg-lime-soft dark:bg-[#1a2517] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-moss dark:bg-[#b8c460] h-full rounded-full transition-all duration-500"
              style={{
                width: isUnlimitedMode
                  ? "100%"
                  : `${
                      currentUser?.subscription
                        ? Math.max(
                            5,
                            100 -
                              Math.min(
                                100,
                                Math.round(
                                  ((currentUser.subscription.monthlyHoursUsedSeconds || 0) /
                                    (effectiveFreeHours * 3600)) *
                                    100
                                )
                              )
                          )
                        : 100
                    }%`,
              }}
            />
          </div>
          <p className="text-[0.7rem] text-ink-soft/80">
            {isUnlimitedMode
              ? "Testing mode active · Unlimited video hours & courses"
              : currentUser?.subscription?.tier === "PRO" || currentUser?.subscription?.tier === "MAX"
              ? `${currentUser.subscription.tier} plan active · Unlimited courses`
              : `Courses up to ${effectiveFreeHours}h · Free tier`}
          </p>
        </div>

        {/* EXPLORE Section */}
        <div className="pt-1 px-1">
          <h5 className="text-[0.68rem] font-bold text-ink-soft/70 tracking-wider uppercase font-mono px-2 mb-1">
            EXPLORE
          </h5>
          <Link
            href="/community"
            onClick={() => isMobile && setIsMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              pathname === "/community"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                : "text-ink-soft hover:bg-black/5 dark:hover:bg-white/5 hover:text-ink"
            }`}
          >
            <span className={pathname === "/community" ? "text-moss dark:text-[#b8c460]" : "text-ink-soft"}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <span>Community</span>
          </Link>
        </div>
      </div>

      {/* User profile capsule at bottom */}
      <div className="pt-4 border-t border-line dark:border-white/10 relative mt-auto">
        {currentUser ? (
          <div>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#f97316] text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden shadow-xs">
                  {currentUser.profile?.avatarUrl && !currentUser.profile.avatarUrl.includes("dicebear.com") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentUser.profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>
                      {(
                        (currentUser.profile?.displayName || currentUser.name || currentUser.email || "S")
                          .replace(/^(mr|dr|ms|mrs)\.?\s+/i, "")
                          .trim()
                          .charAt(0) ||
                        (currentUser.profile?.displayName || currentUser.name || "S").charAt(0) ||
                        "S"
                      ).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-ink leading-tight truncate">
                    {currentUser.profile?.displayName || currentUser.name || currentUser.displayName || currentUser.email.split("@")[0]}
                  </p>
                  <p className="text-xs text-ink-soft leading-tight">
                    {currentUser.subscription?.tier ? `${currentUser.subscription.tier.charAt(0) + currentUser.subscription.tier.slice(1).toLowerCase()} plan` : "Free plan"}
                  </p>
                </div>
              </div>
              <svg className="w-4 h-4 text-ink-soft shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUserMenu && (
              <div className="absolute bottom-16 left-0 right-0 bg-surface dark:bg-[#121a15] rounded-2xl border border-line dark:border-white/10 p-2 shadow-2xl space-y-1 z-30">
                <div className="px-3 py-2 border-b border-line dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-ink truncate">
                      {currentUser.profile?.displayName || currentUser.name || currentUser.displayName || "Learner"}
                    </p>
                    {currentUser.role === "ADMIN" && (
                      <span className="px-1.5 py-0.5 rounded-md bg-[#b8c460] text-[#0f1611] font-mono font-bold text-[0.6rem]">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <p className="text-[0.68rem] text-ink-soft truncate">{currentUser.email}</p>
                </div>
                {currentUser.role === "ADMIN" && (
                  <Link
                    href="/studio-hub"
                    onClick={() => isMobile && setIsMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-[#b8c460] hover:bg-[#b8c460]/10 transition-colors"
                  >
                    <span>⚡</span>
                    <span>Studio Vault (Admin)</span>
                  </Link>
                )}
                <Link
                  href="/settings"
                  onClick={() => isMobile && setIsMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <span>⚙️</span>
                  <span>Account Settings</span>
                </Link>
                <Link
                  href="/billing"
                  onClick={() => isMobile && setIsMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <span>💳</span>
                  <span>Subscription</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const isDark = document.documentElement.classList.contains("dark");
                    if (isDark) {
                      document.documentElement.classList.remove("dark");
                      document.documentElement.classList.add("light");
                      localStorage.setItem("theme", "light");
                    } else {
                      document.documentElement.classList.add("dark");
                      document.documentElement.classList.remove("light");
                      localStorage.setItem("theme", "dark");
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
                >
                  <span>🌓</span>
                  <span>Toggle Light / Dark Mode</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                >
                  <span>🚪</span>
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            onClick={() => isMobile && setIsMobileOpen(false)}
            className="flex items-center justify-between p-2.5 rounded-2xl bg-[#b8c460]/10 border border-[#b8c460]/30 hover:bg-[#b8c460]/20 transition-all text-ink group"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#b8c460] text-[#0f1611] flex items-center justify-center font-bold text-xs">
                👤
              </span>
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">Sign in / Register</p>
                <p className="text-[0.65rem] text-ink-soft leading-tight">Access your saved courses</p>
              </div>
            </div>
            <span className="text-xs text-[#b8c460] font-bold group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. MOBILE TOP NAVIGATION BAR (Visible on screens < lg) */}
      <header className="lg:hidden sticky top-0 z-40 w-full flex items-center justify-between px-4 py-3 bg-paper/95 dark:bg-[#0c120e]/95 backdrop-blur-md border-b border-line dark:border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-1.5 -ml-1 rounded-xl text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <CourseItLogo size="default" />
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/generate"
            className="px-3 py-1.5 rounded-full bg-[#b8c460] text-[#0f1611] text-xs font-bold hover:bg-[#a6b350] transition-colors shadow-xs"
          >
            + New
          </Link>

          {currentUser ? (
            <button
              onClick={() => setIsMobileOpen(true)}
              className="w-8 h-8 rounded-full bg-[#f97316] text-white flex items-center justify-center font-bold text-xs overflow-hidden border border-moss/30 cursor-pointer"
              title="Open profile"
            >
              {currentUser.profile?.avatarUrl && !currentUser.profile.avatarUrl.includes("dicebear.com") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentUser.profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>
                  {(
                    (currentUser.profile?.displayName || currentUser.name || currentUser.email || "S")
                      .replace(/^(mr|dr|ms|mrs)\.?\s+/i, "")
                      .trim()
                      .charAt(0) ||
                    (currentUser.profile?.displayName || currentUser.name || "S").charAt(0) ||
                    "S"
                  ).toUpperCase()}
                </span>
              )}
            </button>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-full border border-line dark:border-white/10 text-xs font-medium text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* 2. MOBILE SLIDE-OVER DRAWER (Visible when isMobileOpen is true on screens < lg) */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        />
      )}

      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-sidebar border-r border-sidebar-border p-4 text-sidebar-foreground shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderSidebarContent(true)}
      </aside>

      {/* 3. DESKTOP PERMANENT SIDEBAR (Fixed to viewport matching reference site) */}
      <div className="hidden lg:block lg:w-64 lg:shrink-0" aria-hidden="true" />
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 bg-sidebar border-r border-sidebar-border flex-col justify-between h-screen p-4 text-sidebar-foreground">
        {renderSidebarContent(false)}
      </aside>
    </>
  );
}
