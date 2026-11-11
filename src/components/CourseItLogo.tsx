"use client";

import React from "react";
import Link from "next/link";
import { useSiteSettings } from "./SiteSettingsProvider";

export function CourseItLogo({
  className = "",
  size = "default",
  href = "/",
}: {
  className?: string;
  size?: "sm" | "default" | "lg";
  href?: string;
}) {
  const { settings } = useSiteSettings();
  const logoIcon = settings?.branding?.logoIcon || "grad-cap";

  const iconSizes = {
    sm: "w-5 h-4",
    default: "w-[27px] h-5",
    lg: "w-8 h-6",
  };

  const textSizes = {
    sm: "text-[1.1rem]",
    default: "text-[1.25rem]",
    lg: "text-[1.5rem]",
  };

  // Render icon based on setting
  const renderIcon = () => {
    if (logoIcon === "sparkles") {
      return (
        <span className="text-[#0f1611] dark:text-[#f1f3ea] text-lg leading-none shrink-0">✨</span>
      );
    }
    if (logoIcon === "code") {
      return (
        <span className="text-[#0f1611] dark:text-[#f1f3ea] text-lg font-mono font-bold leading-none shrink-0">&lt;/&gt;</span>
      );
    }
    if (logoIcon === "rocket") {
      return (
        <span className="text-[#0f1611] dark:text-[#f1f3ea] text-lg leading-none shrink-0">🚀</span>
      );
    }
    if (logoIcon === "video") {
      return (
        <span className="text-[#0f1611] dark:text-[#f1f3ea] text-lg leading-none shrink-0">▶</span>
      );
    }

    // Default: Official Graduation Cap + Play button SVG in Dark (light mode) / Crisp Ivory White (dark mode)
    return (
      <svg
        viewBox="2 6 60 44"
        aria-hidden="true"
        className={`${iconSizes[size]} fill-current text-[#0f1611] dark:text-[#f1f3ea] shrink-0`}
      >
        <path
          fillRule="evenodd"
          d="M32 10 L60 24 L32 38 L4 24 Z M27 15.5 L41 23.5 L27 31.5 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M14 33 L32 42 L50 33 V43 A18 6.5 0 0 1 14 43 Z"
          fill="currentColor"
        />
        <path
          d="M52 28 V36"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="52" cy="37" r="2" fill="currentColor" />
        <path d="M50.6 38.5 H53.4 L55 47 H49 Z" fill="currentColor" />
      </svg>
    );
  };

  const rawBrand = settings?.branding?.brandName?.trim() || "Courseyl";
  const rawSuffix = settings?.branding?.brandSuffix?.trim() || "";
  const matchesEnd =
    rawSuffix.length > 0 &&
    rawBrand.length > rawSuffix.length &&
    rawBrand.toLowerCase().endsWith(rawSuffix.toLowerCase());
  const brandPrefix = matchesEnd
    ? rawBrand.slice(0, rawBrand.length - rawSuffix.length)
    : rawBrand;
  const brandHighlight = matchesEnd
    ? rawBrand.slice(rawBrand.length - rawSuffix.length)
    : "";

  const Content = (
    <div className={`inline-flex items-center gap-2 font-display font-bold tracking-tight ${className}`}>
      {renderIcon()}
      <span className={`${textSizes[size]} font-bold tracking-tight`}>
        <span className="text-ink">{brandPrefix}</span>
        {brandHighlight ? <span className="text-moss">{brandHighlight}</span> : null}
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center transition-opacity hover:opacity-85">
        {Content}
      </Link>
    );
  }

  return Content;
}
