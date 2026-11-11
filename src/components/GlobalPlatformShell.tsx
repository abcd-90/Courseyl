"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSiteSettings } from "./SiteSettingsProvider";

export function GlobalPlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const { settings } = useSiteSettings();

  const isBypassRoute =
    pathname.startsWith("/studio-hub") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth");

  const maintenanceActive = Boolean(settings?.plans?.maintenanceMode) && !isBypassRoute;
  const banner = settings?.structure?.announcementBanner;
  const showBanner = Boolean(banner?.visible && banner?.text?.trim()) && !pathname.startsWith("/studio-hub");

  if (maintenanceActive) {
    return (
      <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-3xl bg-surface border border-line p-8 sm:p-10 shadow-xl text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-lime-soft text-moss flex items-center justify-center text-2xl font-bold">
            ⚡
          </div>
          <div className="space-y-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-lime-soft text-pill-ink text-xs font-mono font-semibold uppercase tracking-wider">
              {settings?.branding?.brandName || "Courseyl"} · Maintenance
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">
              We&apos;ll be right back
            </h1>
            <p className="text-sm text-ink-soft leading-relaxed">
              {settings?.plans?.maintenanceMessage ||
                "We are currently performing scheduled upgrades. Please check back shortly."}
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/studio-hub"
              className="px-4 py-2 rounded-full border border-line text-xs font-semibold text-ink-soft hover:text-ink hover:bg-muted transition-colors"
            >
              Admin Access
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showBanner && banner && (
        <div className="w-full bg-moss text-on-moss px-4 py-2 text-xs sm:text-[0.8rem] font-medium flex flex-wrap items-center justify-center gap-2.5 text-center z-50 relative">
          <span>{banner.text}</span>
          {banner.linkLabel && banner.linkHref && (
            <Link
              href={banner.linkHref}
              className="inline-flex items-center gap-1 rounded-full bg-lime text-[#0f1611] px-2.5 py-0.5 text-[0.72rem] font-bold hover:opacity-90 transition-opacity"
            >
              {banner.linkLabel} →
            </Link>
          )}
        </div>
      )}
      {children}
    </>
  );
}

