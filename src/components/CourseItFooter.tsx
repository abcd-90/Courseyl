"use client";

import React from "react";
import Link from "next/link";
import { useSiteSettings } from "./SiteSettingsProvider";

export function CourseItFooter() {
  const { settings } = useSiteSettings();
  const brandName = settings.branding?.brandName || "Courseyl";
  return (
    <footer className="bg-[#b8c460] !text-[#0f1611] mt-auto">
      <div className="mx-auto max-w-[1200px] px-6 pt-16 pb-7">
        <div className="grid gap-12 md:grid-cols-[1.4fr_2fr]">
          {/* Brand info */}
          <div className="flex flex-col items-start">
            <Link className="flex items-center gap-2 font-display text-[2rem] font-medium leading-none text-[#0f1611]" href="/">
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
              <span>{brandName}</span>
            </Link>

            <p className="mt-5 max-w-sm text-[0.95rem] leading-relaxed text-[#0f1611]/75">
              Paste any YouTube video or playlist and NVIDIA Nemotron turns it into a distraction-free course: bite-sized
              lessons, a daily plan, quizzes that replay the moment you missed, and notes pinned to the video.
            </p>

            <Link
              href="/generate"
              className="mt-8 flex w-full max-w-sm items-center justify-center gap-2 bg-[#0f1611] px-6 py-4 font-medium text-lime shadow-[6px_6px_0_0_#4b5e1e] transition-[translate,box-shadow] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_#4b5e1e]"
            >
              Build your first course{" "}
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
            <div className="mt-8 flex gap-3">
              <a
                href="https://www.linkedin.com/in/abhishek-01k/"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="flex size-11 items-center justify-center bg-[#0f1611]/10 text-[#0f1611] transition-colors hover:bg-[#0f1611] hover:text-[#b8c460] [&_svg]:size-5"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.2 8.5H2.4V21h2.8V8.5ZM3.8 2.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4ZM21.6 13.8c0-3.7-2-5.5-4.7-5.5-2.2 0-3.2 1.2-3.8 2.1V8.5h-2.8V21h2.8v-6.2c0-1.6.3-3.2 2.4-3.2s2.1 1.9 2.1 3.3V21h2.8l1.2-7.2Z" />
                </svg>
              </a>
              <a
                href="https://x.com/abhish_3k"
                target="_blank"
                rel="noreferrer"
                aria-label="X"
                className="flex size-11 items-center justify-center bg-[#0f1611]/10 text-[#0f1611] transition-colors hover:bg-[#0f1611] hover:text-[#b8c460] [&_svg]:size-5"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.18h1.7L7.4 4.73H5.58l11.09 14.45Z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/why_singh_why/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="flex size-11 items-center justify-center bg-[#0f1611]/10 text-[#0f1611] transition-colors hover:bg-[#0f1611] hover:text-[#b8c460] [&_svg]:size-5"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
                </svg>
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <h2 className="font-mono text-label font-medium tracking-[0.2em] uppercase text-[#0f1611]">Product</h2>
              <ul className="mt-6 flex flex-col gap-4 text-[0.95rem] text-[#0f1611]/75">
                <li>
                  <Link className="text-[#0f1611]/80 hover:text-[#0f1611] hover:underline" href="/#features">
                    Features
                  </Link>
                </li>
                <li>
                  <Link className="text-[#0f1611]/80 hover:text-[#0f1611] hover:underline" href="/#courses">
                    Courses
                  </Link>
                </li>
                <li>
                  <Link className="text-[#0f1611]/80 hover:text-[#0f1611] hover:underline" href="/#how-it-works">
                    How it works
                  </Link>
                </li>
                <li>
                  <Link className="text-[#0f1611]/80 hover:text-[#0f1611] hover:underline" href="/community">
                    Community
                  </Link>
                </li>
                <li>
                  <Link className="text-[#0f1611]/80 hover:text-[#0f1611] hover:underline" href="/pricing">
                    Pricing
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
                  <a className="text-[#0f1611]/80 hover:text-[#0f1611] hover:underline" href="mailto:hello@triggerfy.xyz">
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
            © 2026 CourseIt, a{" "}
            <a
              href="https://triggerfy.xyz"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-3 hover:text-[#0f1611]"
            >
              Triggerfy
            </a>{" "}
            product. Made for people who finish what they start.
          </span>
          <span>Videos play in YouTube&apos;s own player. Creators keep their views.</span>
        </div>
      </div>
    </footer>
  );
}
