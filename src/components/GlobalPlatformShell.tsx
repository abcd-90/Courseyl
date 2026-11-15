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

  const [isDismissed, setIsDismissed] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined" && banner?.text) {
      try {
        const key = `courseyl_banner_${banner.text.slice(0, 30)}`;
        setIsDismissed(sessionStorage.getItem(key) === "true");
      } catch {}
    }
  }, [banner?.text]);

  const handleDismiss = () => {
    if (banner?.text) {
      try {
        sessionStorage.setItem(`courseyl_banner_${banner.text.slice(0, 30)}`, "true");
      } catch {}
    }
    setIsDismissed(true);
  };

  const variant = banner?.variant || "info";
  const bgClass =
    variant === "alert"
      ? "bg-[#b45309] text-white"
      : variant === "urgent"
      ? "bg-[#be123c] text-white"
      : "bg-moss text-on-moss";

  const btnBgClass =
    variant === "alert"
      ? "bg-white text-[#78350f]"
      : variant === "urgent"
      ? "bg-white text-[#881337]"
      : "bg-lime text-[#0f1611]";

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
      {showBanner && banner && !isDismissed && (
        <div
          className={`w-full ${bgClass} px-8 sm:px-12 py-2 text-xs sm:text-[0.8rem] font-medium flex items-center justify-center gap-2.5 text-center z-50 relative transition-all`}
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span>{banner.text}</span>
            {banner.linkLabel && banner.linkHref && (
              <Link
                href={banner.linkHref}
                className={`inline-flex items-center gap-1 rounded-full ${btnBgClass} px-2.5 py-0.5 text-[0.72rem] font-bold hover:opacity-90 transition-opacity`}
              >
                {banner.linkLabel} →
              </Link>
            )}
          </div>
          {banner.dismissible !== false && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss announcement"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-black/15 hover:bg-black/30 text-current transition-colors cursor-pointer text-[0.68rem] font-bold"
            >
              ✕
            </button>
          )}
        </div>
      )}
      {children}
    </>
  );
}

