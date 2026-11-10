"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { CourseItLogo } from "./CourseItLogo";

export function MarketingNavbar() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);

    // Check live authentication state
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setIsAuthenticated(!!data?.authenticated);
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    if (pathname === "/") {
      e.preventDefault();
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", `/#${targetId}`);
      }
    }
  };

  const toggleTheme = () => {
    const isCurrentlyDark = document.documentElement.classList.contains("dark");
    if (isCurrentlyDark) {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.style.colorScheme = "light";
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <header className="fixed inset-x-0 top-[18px] z-50 flex justify-center px-4 pointer-events-none">
      <div className="flex w-full max-w-[880px] items-center gap-3 rounded-full bg-paper/80 py-1.5 pr-1.5 pl-4 shadow-[0_0_0_1px_var(--line),0_20px_40px_-24px_rgba(22,49,92,0.35)] backdrop-blur-[14px] pointer-events-auto">
        {/* Brand */}
        <CourseItLogo size="default" href="/" />

        {/* Navigation Links (Desktop) */}
        <nav aria-label="Main" className="ml-auto hidden gap-6 text-[0.92rem] text-ink-soft md:flex items-center">
          <Link
            className="transition-colors hover:text-ink cursor-pointer"
            href="/#features"
            onClick={(e) => scrollToSection(e, "features")}
          >
            Features
          </Link>
          <Link
            className="transition-colors hover:text-ink cursor-pointer"
            href="/#courses"
            onClick={(e) => scrollToSection(e, "courses")}
          >
            Courses
          </Link>
          <Link
            className="transition-colors hover:text-ink cursor-pointer"
            href="/#how-it-works"
            onClick={(e) => scrollToSection(e, "how-it-works")}
          >
            How it works
          </Link>
          <Link className="transition-colors hover:text-ink cursor-pointer" href="/pricing">
            Pricing
          </Link>
        </nav>

        {/* Right action cluster */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle light and dark theme"
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-transparent size-10 sm:size-11 text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-muted transition-colors cursor-pointer"
          >
            {/* Sun icon visible in dark mode */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="hidden dark:block text-ink"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
            {/* Moon icon visible in light mode */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:hidden text-ink"
            >
              <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
            </svg>
          </button>

          {/* Dynamic Auth Button: "Dashboard" if logged in, "Start learning" if not */}
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-moss-dark hover:-translate-y-px transition-all font-medium h-10 sm:h-11 px-4 sm:px-5 text-xs sm:text-[0.92rem] shadow-sm cursor-pointer whitespace-nowrap"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login?next=/dashboard"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-moss-dark hover:-translate-y-px transition-all font-medium h-10 sm:h-11 px-3.5 sm:px-5 text-xs sm:text-[0.92rem] shadow-sm cursor-pointer whitespace-nowrap"
            >
              Start learning
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
