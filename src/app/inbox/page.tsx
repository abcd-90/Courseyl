"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  linkUrl?: string | null;
  createdAt: string;
}

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 60_000) return "Just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

export default function InboxPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox", { cache: "no-store" });
      if (res.status === 401) {
        setUnauthenticated(true);
        setNotifications([]);
        return;
      }
      const data = await res.json();
      if (res.ok && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setUnreadCount(
          typeof data.unreadCount === "number"
            ? data.unreadCount
            : data.notifications.filter((n: NotificationItem) => !n.isRead).length
        );
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markOneRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch(`/api/inbox/${id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
        keepalive: true,
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
      }
    } catch {}
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await fetch("/api/inbox/all/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
    } catch {}
  };

  const typeLabel = (t: string) => {
    switch (t) {
      case "COURSE":
        return "Course";
      case "QUIZ":
        return "Quiz";
      case "ROADMAP":
        return "Roadmap";
      default:
        return "System";
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-paper text-ink">
      <AppSidebar />

      <main className="w-full min-w-0 flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="mb-2">
              <span className="text-[0.7rem] font-bold text-ink-soft/70 tracking-widest uppercase font-mono">
                Inbox
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink tracking-tight">
              What&apos;s <span className="italic text-moss font-serif">new for you.</span>
            </h1>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="px-4 py-2 rounded-full border border-line dark:border-white/15 bg-surface dark:bg-[#121815] text-xs font-semibold text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors self-start sm:self-auto cursor-pointer"
            >
              Mark all read ({unreadCount})
            </button>
          )}
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="p-12 text-center text-sm text-ink-soft">
              Loading notifications...
            </div>
          ) : unauthenticated ? (
            <div className="bg-surface dark:bg-[#0d140f] rounded-2xl border border-line dark:border-[#1b261e] p-8 text-center space-y-3">
              <p className="text-sm font-medium text-ink">
                Sign in to view your course completion alerts and study updates.
              </p>
              <Link
                href="/login?next=/inbox"
                className="inline-flex px-5 py-2.5 rounded-full bg-[#4b5e1e] dark:bg-[#b8c460] text-white dark:text-[#0f1611] text-xs font-semibold"
              >
                Sign in
              </Link>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-surface dark:bg-[#0d140f] rounded-2xl border border-line dark:border-[#1b261e] p-10 text-center">
              <p className="text-sm font-semibold text-ink">All caught up</p>
              <p className="text-xs text-ink-soft mt-1">
                Course generation completions, placement results, and roadmap updates will appear here.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.isRead) markOneRead(notif.id);
                }}
                className={`bg-surface dark:bg-[#0d140f] rounded-2xl border p-5 sm:p-6 flex items-start justify-between gap-4 shadow-xs transition-colors ${
                  notif.isRead
                    ? "border-line dark:border-[#1b261e] opacity-80"
                    : "border-[#b8c460]/70 dark:border-[#b8c460]/50 hover:border-moss/60"
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {!notif.isRead && (
                      <span
                        className="w-2 h-2 rounded-full bg-[#4b5e1e] dark:bg-[#b8c460] shrink-0"
                        title="Unread"
                      />
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-lime-soft dark:bg-[#1c2717] text-moss dark:text-[#b8c460] text-[0.65rem] font-mono font-bold uppercase">
                      {typeLabel(notif.type)}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-ink leading-snug">
                      {notif.title}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-ink-soft leading-relaxed max-w-2xl">
                    {notif.message}
                  </p>
                  {notif.linkUrl && (
                    <div className="pt-1">
                      <Link
                        href={notif.linkUrl}
                        onClick={() => {
                          if (!notif.isRead) markOneRead(notif.id);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-moss dark:text-[#b8c460] hover:underline"
                      >
                        <span>Open →</span>
                      </Link>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs text-ink-soft font-mono whitespace-nowrap mt-0.5">
                    {formatRelativeTime(notif.createdAt)}
                  </span>
                  {!notif.isRead && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        markOneRead(notif.id);
                      }}
                      className="text-[0.68rem] font-semibold text-moss dark:text-[#b8c460] hover:underline cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
