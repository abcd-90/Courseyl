"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSiteSettings } from "./SiteSettingsProvider";

export function CourseItFooter() {
  const pathname = usePathname();
  const { settings } = useSiteSettings();
  const brandName = settings.branding?.brandName || "Courseyl";
  const customLogoUrl = settings.branding?.customLogoUrl?.trim();
  const structure = settings.structure;
  const footerDesc =
    structure?.footerDescription ||
    "Paste any YouTube video or playlist and NVIDIA Nemotron turns it into a distraction-free course: bite-sized lessons, a daily plan, quizzes that replay the moment you missed, and notes pinned to the video.";
  const copyrightName = structure?.footerCopyrightName || brandName;
  const footerSubNote =
    structure?.footerSubNote || "Made for people who finish what they start.";
  const footerRightNote =
    structure?.footerRightNote || "Videos play in YouTube's own player. Creators keep their views.";
  const socialLinks = structure?.socialLinks || {
    twitterUrl: "https://twitter.com/courseitxyz",
    linkedinUrl: "https://www.linkedin.com/company/courseit/",
    instagramUrl: "https://www.instagram.com/courseitxyz",
    contactEmail: "thecourseyl@gmail.com",
  };
  const productLinks = structure?.navLinks?.filter((n) => n.visible !== false) || [];

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
  return (
    <footer className="bg-[#b8c460] !text-[#0f1611] mt-auto">
      <div className="mx-auto max-w-[1200px] px-6 pt-16 pb-7">
        <div className="grid gap-12 md:grid-cols-[1.4fr_2fr]">
          {/* Brand info */}
          <div className="flex flex-col items-start">
            <Link className="flex items-center gap-2 font-display text-[2rem] font-medium leading-none text-[#0f1611]" href="/">
              {customLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={customLogoUrl} alt={brandName} className="h-[40px] w-auto object-contain rounded-lg" />
              ) : (
                <svg viewBox="2 6 60 44" aria-hidden="true" className="h-[40px] w-[52px] fill-current text-[#0f1611]">
                  <path
                    fillRule="evenodd"
                    d="M32 10 L60 24 L32 38 L4 24 Z M27 15.5 L41 23.5 L27 31.5 Z"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                  <path d="M14 33 L32 42 L50 33 V43 A18 6.5 0 0 1 14 43 Z" fill="currentColor" />
                  <path d="M52 28 V36" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <circle cx="52" cy="37" r="2" fill="currentColor" />
                  <path d="M50.6 38.5 H53.4 L55 47 H49 Z" fill="currentColor" />
                </svg>
              )}
              <span>{brandName}</span>
            </Link>

            <p className="mt-5 max-w-sm text-[0.95rem] leading-relaxed text-[#0f1611]/75">
              {footerDesc}
            </p>

            <Link
              href="/generate"
              className="mt-8 flex w-full max-w-sm items-center justify-center gap-2 bg-[#0f1611] px-6 py-4 font-medium text-lime shadow-[6px_6px_0_0_#4b5e1e] transition-[translate,box-shadow] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_#4b5e1e]"
            >
              {structure?.heroPrimaryCtaLabel || "Build your first course"}{" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>

            {/* Social Buttons */}
            <div className="mt-8 flex flex-wrap gap-3">
              {[
                {
                  id: "linkedin",
                  label: "LinkedIn",
                  url: socialLinks.linkedinUrl,
                  enabled: socialLinks.linkedinEnabled !== false,
                  icon: (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5.2 8.5H2.4V21h2.8V8.5ZM3.8 2.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4ZM21.6 13.8c0-3.7-2-5.5-4.7-5.5-2.2 0-3.2 1.2-3.8 2.1V8.5h-2.8V21h2.8v-6.2c0-1.6.3-3.2 2.4-3.2s2.1 1.9 2.1 3.3V21h2.8l1.2-7.2Z" />
                    </svg>
                  ),
                },
                {
                  id: "twitter",
                  label: "X",
                  url: socialLinks.twitterUrl,
                  enabled: socialLinks.twitterEnabled !== false,
                  icon: (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.18h1.7L7.4 4.73H5.58l11.09 14.45Z" />
                    </svg>
                  ),
                },
                {
                  id: "instagram",
                  label: "Instagram",
                  url: socialLinks.instagramUrl,
                  enabled: socialLinks.instagramEnabled !== false,
                  icon: (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  ),
                },
                {
                  id: "youtube",
                  label: "YouTube",
                  url: socialLinks.youtubeUrl,
                  enabled: socialLinks.youtubeEnabled !== false,
                  icon: (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  ),
                },
                {
                  id: "facebook",
                  label: "Facebook",
                  url: socialLinks.facebookUrl,
                  enabled: socialLinks.facebookEnabled !== false,
                  icon: (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  ),
                },
                {
                  id: "github",
                  label: "GitHub",
                  url: socialLinks.githubUrl,
                  enabled: socialLinks.githubEnabled !== false,
                  icon: (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                  ),
                },
                {
                  id: "discord",
                  label: "Discord",
                  url: socialLinks.discordUrl,
                  enabled: socialLinks.discordEnabled !== false,
                  icon: (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                  ),
                },
                {
                  id: "tiktok",
                  label: "TikTok",
                  url: socialLinks.tiktokUrl,
                  enabled: socialLinks.tiktokEnabled !== false,
                  icon: (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298 0 .591.045.87.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.95-4.48V8.7a8.28 8.28 0 0 0 5.21 1.83V7.08a4.83 4.83 0 0 1-1.39-.39z" />
                    </svg>
                  ),
                },
                {
                  id: "telegram",
                  label: "Telegram",
                  url: socialLinks.telegramUrl,
                  enabled: socialLinks.telegramEnabled !== false,
                  icon: (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.943z" />
                    </svg>
                  ),
                },
              ]
                .filter((s) => s.enabled && s.url && s.url.trim().length > 0)
                .map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label}
                    className="flex size-11 items-center justify-center bg-[#0f1611]/10 text-[#0f1611] transition-colors hover:bg-[#0f1611] hover:text-[#b8c460] [&_svg]:size-5"
                  >
                    {s.icon}
                  </a>
                ))}
            </div>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <h2 className="font-mono text-label font-medium tracking-[0.2em] uppercase text-[#0f1611]">Product</h2>
              <ul className="mt-6 flex flex-col gap-4 text-[0.95rem] text-[#0f1611]/75">
                {productLinks.map((nav) => {
                  const isHash = nav.href.startsWith("/#");
                  const targetId = isHash ? nav.href.slice(2) : "";
                  return (
                    <li key={nav.id}>
                      <Link
                        className="text-[#0f1611]/80 hover:text-[#0f1611] hover:underline cursor-pointer"
                        href={nav.href}
                        onClick={isHash ? (e) => scrollToSection(e, targetId) : undefined}
                      >
                        {nav.label}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link className="text-[#0f1611]/80 hover:text-[#0f1611] hover:underline" href="/community">
                    Community
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-mono text-label font-medium tracking-[0.2em] uppercase text-[#0f1611]">Company</h2>
              <ul className="mt-6 flex flex-col gap-4 text-[0.95rem] text-[#0f1611]/75">
                <li>
                  <Link className="text-[#0f1611]/80 hover:text-[#0f1611] hover:underline" href="/about">
                    About
                  </Link>
                </li>
                <li>
                  <Link className="text-[#0f1611]/80 hover:text-[#0f1611] hover:underline" href="/vs-courseit">
                    CourseIt Alternative
                  </Link>
                </li>
                <li>
                  <a className="text-[#0f1611]/80 hover:text-[#0f1611] hover:underline" href={`mailto:${socialLinks.contactEmail || "thecourseyl@gmail.com"}`}>
                    Contact us
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-mono text-label font-medium tracking-[0.2em] uppercase text-[#0f1611]">Legal</h2>
              <ul className="mt-6 flex flex-col gap-4 text-[0.95rem] text-[#0f1611]/75">
                <li>
                  <Link className="text-[#0f1611]/80 hover:text-[#0f1611] hover:underline" href="/privacy">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link className="text-[#0f1611]/80 hover:text-[#0f1611] hover:underline" href="/terms">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link className="text-[#0f1611]/80 hover:text-[#0f1611] hover:underline" href="/refunds">
                    Refunds
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        {/* Bottom copyright banner */}
        <div className="mt-14 flex flex-wrap justify-between gap-3 border-t border-[#0f1611]/20 pt-5 text-sm text-[#0f1611]/75">
          <span>
            © 2026 {copyrightName}. {footerSubNote}
          </span>
          <span>{footerRightNote}</span>
        </div>
      </div>
    </footer>
  );
}
