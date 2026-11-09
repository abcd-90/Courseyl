"use client";

import React from "react";
import { AppSidebar } from "@/components/AppSidebar";

export default function InboxPage() {
  const notifications = [
    {
      id: "notif_1",
      title: "Welcome to CourseIt",
      body: "You get 5 hours of video free every month. Paste any long YouTube video to start.",
      timestamp: "19 h ago",
    },
  ];

  return (
    <div className="min-h-screen flex bg-paper text-ink">
      <AppSidebar />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-5xl">
        {/* Category Tag matching Screenshot 4 */}
        <div className="mb-2">
          <span className="text-[0.7rem] font-bold text-ink-soft/70 tracking-widest uppercase font-mono">
            Inbox
          </span>
        </div>

        {/* Headline matching Screenshot 4 */}
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink tracking-tight">
          What&apos;s <span className="italic text-moss font-serif">new for you.</span>
        </h1>

        {/* Notification Cards List matching Screenshot 4 */}
        <div className="mt-6 space-y-4">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="bg-surface dark:bg-[#0d140f] rounded-2xl border border-line dark:border-[#1b261e] p-5 sm:p-6 flex items-start justify-between gap-4 shadow-xs hover:border-moss/40 transition-colors"
            >
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-ink leading-snug">
                  {notif.title}
                </h3>
                <p className="text-xs sm:text-sm text-ink-soft leading-relaxed max-w-2xl">
                  {notif.body}
                </p>
              </div>
              <span className="text-xs text-ink-soft font-mono whitespace-nowrap shrink-0 mt-0.5">
                {notif.timestamp}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

