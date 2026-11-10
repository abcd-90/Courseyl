"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { CourseItFooter } from "@/components/CourseItFooter";
import { LandscapeIllustration, DuskLandscapeIllustration } from "@/components/LandscapeHero";

export default function HomePage() {
  const router = useRouter();
  const [selectedMinutes, setSelectedMinutes] = useState<number>(120);
  const [activeTab, setActiveTab] = useState<"video" | "article">("video");
  const [copiedLink, setCopiedLink] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setIsAuthenticated(!!d?.authenticated))
      .catch(() => setIsAuthenticated(false));
  }, []);

  // Tour section ref for 3D scroll tilt animation
  const tourRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState({
    scale: 0.7,
    rotateX: 20,
    parallaxY: 0,
  });

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);

      if (tourRef.current) {
        const rect = tourRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // u ranges from 0 when top is near bottom of viewport, to 1 when near top/mid
        const start = windowHeight;
        const end = windowHeight * 0.25;
        const rawProgress = (start - rect.top) / (start - end);
        const progress = Math.min(1, Math.max(0, rawProgress));

        const scale = 0.7 + progress * 0.3;
        const rotateX = 20 - progress * 20;
        const parallaxY = progress * 132;

        setTransformStyle({
          scale: Number(scale.toFixed(4)),
          rotateX: Number(rotateX.toFixed(2)),
          parallaxY: Number(parallaxY.toFixed(1)),
        });
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Smooth scroll to hash on initial load/navigation if present
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const id = window.location.hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      }
    }
  }, []);

  const sampleCourses = [
    {
      title: "Python for AI - Full Beginner Course",
      author: "Dave Ebbelaar",
      duration: "5h 16m",
      addedBy: "ABHISHEK",
      learningCount: 54,
      thumbnail: "https://i.ytimg.com/vi/ygXn5nV5qFc/maxresdefault.jpg",
      slug: "python-for-beginners-learn-coding-with-python-in-1-hour-7bjgi",
    },
    {
      title: "Complete Agentic AI Course In 10 Hours- Langchain,...",
      author: "Krish Naik",
      duration: "11h 13m",
      addedBy: "Bhanuranjan",
      learningCount: 29,
      thumbnail: "https://i.ytimg.com/vi/rV3HJ4LEZ7k/maxresdefault.jpg",
      slug: "python-for-beginners-learn-coding-with-python-in-1-hour-7bjgi",
    },
    {
      title: "Full-Stack AI Engineering Course (FastAPI, LLMs, Docker...)",
      author: "Dave Ebbelaar",
      duration: "3h 10m",
      addedBy: "Manish",
      learningCount: 26,
      thumbnail: "https://i.ytimg.com/vi/XzjSx7u9mGw/maxresdefault.jpg",
      slug: "next-js-15-react-19-full-stack-masterclass-3k8pq",
    },
    {
      title: "Python Full Course for Beginners",
      author: "Programming with Mosh",
      duration: "2h 02m",
      addedBy: "twotakesonly",
      learningCount: 11,
      thumbnail: "https://i.ytimg.com/vi/kqtD5dpn9C8/maxresdefault.jpg",
      slug: "python-for-beginners-learn-coding-with-python-in-1-hour-7bjgi",
    },
    {
      title: "Python Full Course for free 🐍",
      author: "Bro Code",
      duration: "12h 00m",
      addedBy: "Prince",
      learningCount: 8,
      thumbnail: "https://i.ytimg.com/vi/ix9cRaBkVe0/maxresdefault.jpg",
      slug: "python-for-beginners-learn-coding-with-python-in-1-hour-7bjgi",
    },
    {
      title: "Harvard CS50's Introduction to Programming with Python ...",
      author: "freeCodeCamp.org",
      duration: "15h 58m",
      addedBy: "Durvesh",
      learningCount: 7,
      thumbnail: "https://i.ytimg.com/vi/nLRL_NcnK-4/maxresdefault.jpg",
      slug: "python-for-beginners-learn-coding-with-python-in-1-hour-7bjgi",
    },
  ];

  // Dynamic pace calculation
  const getPaceDays = (min: number) => {
    if (min === 30) return 8;
    if (min === 60) return 4;
    if (min === 90) return 3;
    return 2;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfa] text-[#0f1611]">
      <MarketingNavbar />

      {/* 1. INTRO HERO SECTION (relative h-[980px] overflow-hidden) */}
      <section aria-label="Intro" className="relative h-[980px] overflow-hidden">
        {/* Parallax Sunrise Landscape Illustration */}
        <div
          className="absolute inset-0 pointer-events-none transition-transform duration-75 ease-out"
          style={{ transform: `translateY(${transformStyle.parallaxY}px)` }}
        >
          <LandscapeIllustration className="h-full w-full object-cover" />
        </div>

        {/* 5 Floating Square Frosted Badges */}
        <span className="float-square top-[700px] left-[5%]" />
        <span className="float-square top-[700px] left-[calc(5%+52px)] [animation-delay:-2s]" />
        <span className="float-square top-[752px] left-[calc(5%+52px)] [animation-delay:-4s]" />
        <span className="float-square top-[640px] right-[6%] [animation-delay:-1s]" />
        <span className="float-square top-[692px] right-[6%] [animation-delay:-3s]" />

        {/* Center Hero Content */}
        <div className="relative z-10 mx-auto flex max-w-[980px] flex-col items-center gap-[22px] px-6 pt-[178px] text-center">
          {/* Powered by NVIDIA Nemotron Badge */}
          <div className="transition-all duration-300">
            <span className="inline-flex items-center gap-2 rounded-full bg-lime-soft px-3.5 py-[7px] text-[0.78rem] font-medium text-pill-ink">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-[#76b900]">
                <path d="M8.948 8.798v-1.43a6.7 6.7 0 0 1 .424-.018c3.922-.124 6.493 3.374 6.493 3.374s-2.774 3.851-5.75 3.851c-.398 0-.787-.062-1.158-.185v-4.346c1.528.185 1.837.857 2.747 2.385l2.04-1.714s-1.492-1.952-4-1.952a6.016 6.016 0 0 0-.796.035m0-4.735v2.138l.424-.027c5.45-.185 9.01 4.47 9.01 4.47s-4.08 4.964-8.33 4.964c-.37 0-.733-.035-1.095-.097v1.325c.3.035.61.062.91.062 3.957 0 6.82-2.023 9.593-4.408.459.371 2.34 1.263 2.73 1.652-2.633 2.208-8.772 3.984-12.253 3.984-.335 0-.653-.018-.971-.053v1.864H24V4.063zm0 10.326v1.131c-3.657-.654-4.673-4.46-4.673-4.46s1.758-1.944 4.673-2.262v1.237H8.94c-1.528-.186-2.73 1.245-2.73 1.245s.68 2.412 2.739 3.11M2.456 10.9s2.164-3.197 6.5-3.533V6.201C4.153 6.59 0 10.653 0 10.653s2.35 6.802 8.948 7.42v-1.237c-4.84-.6-6.492-5.936-6.492-5.936z" />
              </svg>
              Powered by NVIDIA Nemotron
            </span>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-h1 text-ink">
              Turn any YouTube video into a course you{" "}
              <em className="italic text-moss font-serif">actually finish.</em>
            </h1>
          </div>

          {/* Subtitle */}
          <div>
            <p className="max-w-[560px] text-[1.1rem] text-ink-soft leading-relaxed">
              Bite-sized lessons, quizzes that replay what you missed, and a daily plan that fits your pace.
            </p>
          </div>

          {/* Buttons */}
          <div className="mt-1.5 flex flex-wrap justify-center gap-2.5">
            <Link
              href={isAuthenticated ? "/dashboard" : "/login?next=/dashboard"}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:-translate-y-px hover:bg-moss-dark transition-all h-12 gap-2 px-7 text-[0.92rem] font-semibold shadow-sm cursor-pointer"
            >
              Start with a link
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-muted transition-all h-12 gap-2 px-7 text-[0.92rem] font-medium"
            >
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* 2. PRODUCT TOUR WITH AUTHENTIC 3D TILT-TO-FLAT SCROLL ANIMATION */}
      <section aria-label="Product tour" className="relative z-20 -mt-[230px] px-6">
        <div
          ref={tourRef}
          className="mx-auto aspect-[1600/1038] w-[min(100%,calc((100vh-140px)*1600/1038))] max-w-[1200px] overflow-hidden rounded-[32px] bg-card shadow-[0_0_0_6px_var(--surface),0_40px_80px_-30px_rgba(22,49,92,0.5)] transition-transform duration-100 ease-out"
          style={{
            transformOrigin: "center top",
            transform: `perspective(1200px) scale(${transformStyle.scale}) rotateX(${transformStyle.rotateX}deg)`,
          }}
        >
          <video
            src="/video/product-demo-video.mp4"
            poster="/video/product-demo-poster.jpg"
            muted
            loop
            autoPlay
            playsInline
            preload="metadata"
            aria-label="CourseIt demo: paste a YouTube link, get a course with a placement test, lessons and quizzes"
            className="size-full object-cover"
          />
        </div>
      </section>

      {/* 3. BY THE NUMBERS SECTION (#numbers) */}
      <section id="numbers" aria-labelledby="numbers-title" className="scroll-mt-24 px-6 py-[110px]">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-col items-center gap-[18px] text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-lime-soft px-3.5 py-[7px] text-[0.78rem] font-medium text-pill-ink">
              By the numbers
            </span>
            <h2 id="numbers-title" className="text-h2 text-ink">
              Real learners, <em className="italic text-moss font-serif">real courses.</em>
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {[
              {
                stat: "1,100+",
                sub: "learners signed up",
                desc: "Free to start, no card needed",
              },
              {
                stat: "292",
                sub: "courses built",
                desc: "291 of them free for anyone to join",
              },
              {
                stat: "1,300+",
                sub: "hours of YouTube",
                desc: "turned into short, structured lessons",
              },
              {
                stat: "6,900+",
                sub: "lessons written",
                desc: "with study notes from the video",
              },
              {
                stat: "32,000+",
                sub: "quiz questions",
                desc: "each linked to the moment it's explained",
              },
              {
                stat: "172",
                sub: "creators' channels",
                desc: "from 20-minute talks to full bootcamps",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-1 rounded-card bg-surface p-5 shadow-[0_0_0_1px_var(--line)] sm:p-6 transition-transform hover:-translate-y-1 hover:shadow-md"
              >
                <span className="font-display text-[clamp(2rem,5vw,3rem)] leading-none tracking-tight text-ink tabular-nums font-normal">
                  {item.stat}
                </span>
                <span className="mt-2 font-medium text-[0.98rem] text-ink">{item.sub}</span>
                <span className="text-[0.88rem] text-ink-soft">{item.desc}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-[0.85rem] text-ink-soft">
            Counted live from Courseyl, updated every hour.
          </p>
        </div>
      </section>

      {/* 4. FEATURES BENTO GRID (#features) */}
      <section id="features" aria-labelledby="features-title" className="scroll-mt-24 px-6 py-[110px]">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-col items-center gap-[18px] text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-lime-soft px-3.5 py-[7px] text-[0.78rem] font-medium text-pill-ink">
              Features
            </span>
            <h2 id="features-title" className="text-h2 text-ink">
              Everything you need to <em className="italic text-moss font-serif">finish that 6-hour playlist.</em>
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Card 1 (lg:col-span-2 lg:row-span-2): Placement Test & Time Savings */}
            <article className="flex flex-col justify-between gap-6 rounded-card bg-surface p-[26px] shadow-[0_0_0_1px_var(--line)] lg:col-span-2 lg:row-span-2">
              <div>
                <div className="flex flex-wrap items-baseline gap-[18px]">
                  <span className="font-display text-[2rem] text-ink-soft tabular-nums line-through opacity-60">
                    6h 02m
                  </span>
                  <span className="font-display text-[clamp(4rem,9vw,7rem)] leading-[0.9] tracking-[-0.04em] text-moss tabular-nums">
                    2h 40m
                  </span>
                </div>

                <ul className="mt-7 text-[0.95rem]">
                  <li className="flex justify-between gap-3 border-t border-line py-3 text-ink-soft">
                    <span className="line-through">JSX basics</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[0.78rem] font-medium whitespace-nowrap bg-ok-bg text-ok-fg">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                      Known
                    </span>
                  </li>
                  <li className="flex justify-between gap-3 border-t border-line py-3 text-ink-soft">
                    <span className="line-through">Components and props</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[0.78rem] font-medium whitespace-nowrap bg-ok-bg text-ok-fg">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                      Known
                    </span>
                  </li>
                  <li className="flex justify-between gap-3 border-t border-line py-3 text-ink">
                    <span>State with useState</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[0.78rem] font-medium whitespace-nowrap bg-warn-bg text-warn-fg">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                      To learn
                    </span>
                  </li>
                  <li className="flex justify-between gap-3 border-t border-line py-3 text-ink">
                    <span>Effects with useEffect</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[0.78rem] font-medium whitespace-nowrap bg-warn-bg text-warn-fg">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                      To learn
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-h3 font-medium text-ink">This 6-hour course is 2h 40m for you.</h3>
                <p className="mt-1.5 text-[0.92rem] text-ink-soft">
                  A 2-minute placement test finds what you already know and takes those lessons out of your plan.
                </p>
              </div>
            </article>

            {/* Card 2: Video vs Article Switcher */}
            <article className="flex flex-col justify-between gap-6 rounded-card bg-surface p-[26px] shadow-[0_0_0_1px_var(--line)]">
              <div>
                <div>
                  <div
                    role="tablist"
                    aria-label="Lesson format"
                    className="inline-flex gap-1 rounded-full p-1 shadow-[inset_0_0_0_1px_var(--line)] bg-surface"
                  >
                    <button
                      type="button"
                      role="tab"
                      onClick={() => setActiveTab("video")}
                      aria-selected={activeTab === "video"}
                      className={`min-h-[38px] rounded-full px-4 text-[0.85rem] font-medium transition-all ${
                        activeTab === "video" ? "bg-lime-soft text-pill-ink" : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      Video
                    </button>
                    <button
                      type="button"
                      role="tab"
                      onClick={() => setActiveTab("article")}
                      aria-selected={activeTab === "article"}
                      className={`min-h-[38px] rounded-full px-4 text-[0.85rem] font-medium transition-all ${
                        activeTab === "article" ? "bg-lime-soft text-pill-ink" : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      Article
                    </button>
                  </div>

                  <div className="relative mt-4 flex aspect-[2/1] items-center justify-center rounded-[14px] bg-[#16315c] overflow-hidden">
                    {activeTab === "video" ? (
                      <>
                        <span className="flex size-10 items-center justify-center rounded-full bg-white/20">
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
                            className="size-3.5 fill-[#fcfcfa] text-[#fcfcfa]"
                          >
                            <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
                          </svg>
                        </span>
                        <div className="absolute inset-x-3 bottom-2.5 h-1.5 rounded-full bg-[#e4e9c6]">
                          <div className="h-full w-[46%] rounded-full bg-[#4b5e1e]" />
                        </div>
                      </>
                    ) : (
                      <div className="p-4 text-xs text-[#f6f8ec] font-mono leading-relaxed opacity-90">
                        <p className="font-bold text-[#e4e9c6]"># Section 1: Components and Props</p>
                        <p className="mt-1 line-clamp-3">
                          Components let you split the UI into independent, reusable pieces, and think about each piece
                          in isolation...
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-h3 font-medium text-ink">Watch it, then read it.</h3>
                <p className="mt-1.5 text-[0.92rem] text-ink-soft">
                  Distraction-free video for each lesson, plus study notes Nemotron writes from what was said.
                </p>
              </div>
            </article>

            {/* Card 3: Quiz Replay Moment */}
            <article className="flex flex-col justify-between gap-6 rounded-card bg-surface p-[26px] shadow-[0_0_0_1px_var(--line)]">
              <div>
                <div className="flex flex-col gap-2.5 text-[0.88rem]">
                  <p className="font-medium text-ink">Why does the same prompt give different answers?</p>
                  <span className="rounded-xl bg-err-bg px-3 py-2 text-err-fg">
                    The model forgets the prompt
                  </span>
                  <Link
                    href="/dashboard"
                    className="inline-flex h-9 items-center gap-1.5 self-start rounded-full bg-moss px-3.5 font-medium text-on-moss text-xs hover:bg-moss-dark transition-colors"
                  >
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
                      className="size-3 fill-current"
                    >
                      <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
                    </svg>
                    Replay 3:12 that explains it
                  </Link>
                </div>
              </div>

              <div>
                <h3 className="text-h3 font-medium text-ink">Miss one, replay the moment.</h3>
                <p className="mt-1.5 text-[0.92rem] text-ink-soft">
                  Every lesson ends with a quiz. A wrong answer jumps the video to the moment that explains it.
                </p>
              </div>
            </article>

            {/* Card 4 (lg:col-span-2): URL Intake & Pills */}
            <article className="flex flex-col justify-between gap-6 rounded-card bg-surface p-[26px] shadow-[0_0_0_1px_var(--line)] lg:col-span-2">
              <div>
                <div className="flex items-center gap-2.5 rounded-xl bg-surface px-4 py-3.5 font-mono text-[0.88rem] shadow-[inset_0_0_0_1px_var(--line)]">
                  <span className="text-moss font-bold">›</span>
                  <span className="min-w-0 flex-1 truncate text-ink">
                    youtube.com/watch?v=7AMjmCTumuo&amp;list=PL-osiE80TeTs…
                  </span>
                </div>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-lime-soft px-3 py-[7px] font-mono text-[0.72rem] tracking-[0.07em] text-pill-ink uppercase font-medium">
                    Playlists up to 20 hours
                  </span>
                  <span className="rounded-full bg-lime-soft px-3 py-[7px] font-mono text-[0.72rem] tracking-[0.07em] text-pill-ink uppercase font-medium">
                    Notes + quiz per lesson
                  </span>
                  <span className="rounded-full bg-lime-soft px-3 py-[7px] font-mono text-[0.72rem] tracking-[0.07em] text-pill-ink uppercase font-medium">
                    Day-by-day plan
                  </span>
                  <span className="rounded-full bg-lime-soft px-3 py-[7px] font-mono text-[0.72rem] tracking-[0.07em] text-pill-ink uppercase font-medium">
                    Placement test
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-h3 font-medium text-ink">Any YouTube video or whole playlist → a course.</h3>
                <p className="mt-1.5 text-[0.92rem] text-ink-soft">
                  Paste the link straight from YouTube. Lesson 1 is ready to watch while the rest is written.
                </p>
              </div>
            </article>

            {/* Card 5: Minutes per Day Selector */}
            <article className="flex flex-col justify-between gap-6 rounded-card bg-surface p-[26px] shadow-[0_0_0_1px_var(--line)]">
              <div>
                <div role="group" aria-label="Minutes per day" className="flex flex-wrap gap-1.5">
                  {[30, 60, 90, 120].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMinutes(m)}
                      aria-pressed={selectedMinutes === m}
                      className={`h-11 rounded-full px-3.5 text-[0.88rem] font-medium transition-colors ${
                        selectedMinutes === m
                          ? "bg-moss text-on-moss"
                          : "shadow-[inset_0_0_0_1px_var(--line)] hover:bg-muted text-ink"
                      }`}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
                <p className="mt-[18px] font-display text-[2.4rem] leading-[1.05] tracking-[-0.02em] tabular-nums text-ink">
                  4h course · {getPaceDays(selectedMinutes)} days
                </p>
              </div>

              <div>
                <h3 className="text-h3 font-medium text-ink">Your pace, every course.</h3>
                <p className="mt-1.5 text-[0.92rem] text-ink-soft">
                  Set your daily time once. Every course splits into days, and skipped lessons drop out.
                </p>
              </div>
            </article>

            {/* Card 6 (lg:col-span-2): Roadmaps in Stages */}
            <article className="flex flex-col justify-between gap-6 rounded-card bg-surface p-[26px] shadow-[0_0_0_1px_var(--line)] lg:col-span-2">
              <div>
                <ol className="flex flex-wrap items-center gap-2" aria-label="Example roadmap stages">
                  <li className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-[7px] text-[0.85rem] font-medium bg-lime-soft text-pill-ink">
                      <span className="tabular-nums opacity-70">1</span>Python
                    </span>
                    <span aria-hidden="true" className="text-ink-soft">
                      →
                    </span>
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-[7px] text-[0.85rem] font-medium bg-moss text-on-moss">
                      <span className="tabular-nums opacity-70">2</span>Math for ML
                    </span>
                    <span aria-hidden="true" className="text-ink-soft">
                      →
                    </span>
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-[7px] text-[0.85rem] font-medium bg-lime-soft text-pill-ink">
                      <span className="tabular-nums opacity-70">3</span>Machine learning
                    </span>
                    <span aria-hidden="true" className="text-ink-soft">
                      →
                    </span>
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-[7px] text-[0.85rem] font-medium bg-lime-soft text-pill-ink">
                      <span className="tabular-nums opacity-70">4</span>Gen AI
                    </span>
                  </li>
                </ol>

                <div className="mt-4 flex flex-wrap items-center gap-2.5 text-[0.88rem] text-ink-soft">
                  <span className="inline-flex items-center gap-1.5">
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
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <path d="M16 3.128a4 4 0 0 1 0 7.744" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>{" "}
                    1,240 learners enrolled
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin + "/roadmaps");
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-full px-4 font-medium text-ink shadow-[inset_0_0_0_1px_var(--line)] bg-surface hover:bg-muted transition-colors"
                  >
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
                    >
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
                      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
                    </svg>{" "}
                    {copiedLink ? "Copied!" : "Share"}
                  </button>
                  <Link
                    href="/roadmaps"
                    className="inline-flex h-10 items-center rounded-full bg-moss px-4 font-medium text-on-moss hover:bg-moss-dark transition-colors"
                  >
                    Enroll in roadmap
                  </Link>
                </div>
              </div>

              <div>
                <h3 className="text-h3 font-medium text-ink">Roadmaps: courses from many creators, in stages.</h3>
                <p className="mt-1.5 text-[0.92rem] text-ink-soft">
                  Build your own path and share the link. Anyone with it can enroll and track their own progress.
                </p>
              </div>
            </article>

            {/* Card 7: Pinned Notes */}
            <article className="flex flex-col justify-between gap-6 rounded-card bg-surface p-[26px] shadow-[0_0_0_1px_var(--line)]">
              <div>
                <ul className="flex flex-col gap-2 text-[0.88rem]">
                  <li className="flex items-center gap-2.5">
                    <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 font-mono text-[0.78rem] font-medium text-moss tabular-nums shadow-[inset_0_0_0_1px_var(--line)] bg-surface">
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
                        className="size-3 fill-current"
                      >
                        <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
                      </svg>
                      0:42
                    </span>
                    <span className="truncate text-ink-soft">Attention looks back, never ahead.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 font-mono text-[0.78rem] font-medium text-moss tabular-nums shadow-[inset_0_0_0_1px_var(--line)] bg-surface">
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
                        className="size-3 fill-current"
                      >
                        <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
                      </svg>
                      2:08
                    </span>
                    <span className="truncate text-ink-soft">MLP blocks hold most of the weights.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 font-mono text-[0.78rem] font-medium text-moss tabular-nums shadow-[inset_0_0_0_1px_var(--line)] bg-surface">
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
                        className="size-3 fill-current"
                      >
                        <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
                      </svg>
                      5:01
                    </span>
                    <span className="truncate text-ink-soft">Sampling explains different answers.</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-h3 font-medium text-ink">Notes pinned to the moment.</h3>
                <p className="mt-1.5 text-[0.92rem] text-ink-soft">
                  Write while you watch. Each note keeps its time; click it and the video plays from there.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS SECTION (#how-it-works) */}
      <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-24 px-6 py-[110px]">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-col items-center gap-[18px] text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-lime-soft px-3.5 py-[7px] text-[0.78rem] font-medium text-pill-ink">
              How it works
            </span>
            <h2 id="how-title" className="text-h2 text-ink">
              From a 6-hour video to <em className="italic text-moss font-serif">a plan you finish.</em>
            </h2>
          </div>

          <ol className="mt-14 grid gap-7 md:grid-cols-3">
            <li className="flex flex-col gap-3.5">
              <span
                aria-hidden="true"
                className="font-display text-[clamp(8rem,15vw,13rem)] leading-[0.8] tracking-[-0.06em] tabular-nums text-moss font-normal"
              >
                1
              </span>
              <h3 className="text-h3 font-medium text-ink">Paste a video or playlist</h3>
              <p className="max-w-[340px] text-ink-soft leading-relaxed">
                Any YouTube video, or a playlist up to 20 hours. NVIDIA Nemotron plans the lessons and writes study notes
                and quizzes for each one.
              </p>
            </li>
            <li className="flex flex-col gap-3.5">
              <span
                aria-hidden="true"
                className="font-display text-[clamp(8rem,15vw,13rem)] leading-[0.8] tracking-[-0.06em] tabular-nums text-moss/80 font-normal"
              >
                2
              </span>
              <h3 className="text-h3 font-medium text-ink">Learn at your pace</h3>
              <p className="max-w-[340px] text-ink-soft leading-relaxed">
                A 2-minute placement test skips what you know. Set 30 to 120 minutes a day and every course splits into
                days.
              </p>
            </li>
            <li className="flex flex-col gap-3.5">
              <span
                aria-hidden="true"
                className="font-display text-[clamp(8rem,15vw,13rem)] leading-[0.8] tracking-[-0.06em] tabular-nums text-lime font-normal"
              >
                3
              </span>
              <h3 className="text-h3 font-medium text-ink">Prove it, keep it</h3>
              <p className="max-w-[340px] text-ink-soft leading-relaxed">
                Miss a quiz question and the video jumps to the moment that explains it. Pin notes to any moment, and
                chain courses into a roadmap.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* 6. POPULAR COURSES SECTION (#courses) */}
      <section id="courses" aria-labelledby="courses-title" className="scroll-mt-24 px-6 py-[110px]">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-col items-center gap-[18px] text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-lime-soft px-3.5 py-[7px] text-[0.78rem] font-medium text-pill-ink">
              Popular courses
            </span>
            <h2 id="courses-title" className="text-h2 text-ink">
              Courses learners are <em className="italic text-moss font-serif">taking right now.</em>
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
            {sampleCourses.map((c, i) => (
              <div key={i} className="flex">
                <Link
                  href={`/courses/${c.slug}`}
                  className="flex w-full flex-col gap-3 rounded-card bg-surface p-2.5 shadow-[0_0_0_1px_var(--line)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(22,49,92,0.45),0_0_0_1px_var(--line)]"
                >
                  <div className="relative aspect-video overflow-hidden rounded-2xl bg-muted">
                    <img
                      src={c.thumbnail}
                      alt={c.title}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                    <span className="absolute right-3 bottom-3 rounded-full bg-surface px-2.5 py-1.5 font-mono text-[0.72rem] tracking-[0.07em] text-ink tabular-nums font-semibold shadow-sm">
                      {c.duration}
                    </span>
                  </div>
                  <div className="flex flex-col justify-between gap-1.5 px-2 pb-2 flex-1">
                    <div className="flex flex-col gap-1">
                      <h3 className="line-clamp-2 text-[1.1rem] font-medium text-ink leading-snug">
                        {c.title}
                      </h3>
                      <span className="text-[0.9rem] font-medium text-ink-soft">{c.author}</span>
                    </div>
                    <div className="justify-end pt-3">
                      <span className="flex justify-between gap-3 border-t border-line pt-2.5 text-[0.85rem] text-ink-soft">
                        <span>
                          added by <span className="font-medium text-ink">{c.addedBy}</span>
                        </span>
                        <span className="ml-auto tabular-nums">{c.learningCount} learning</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. STORIES & TESTIMONIALS SECTION (#stories) */}
      <section id="stories" aria-labelledby="stories-title" className="scroll-mt-24 px-6 py-[110px]">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-col items-center gap-[18px] text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-lime-soft px-3.5 py-[7px] text-[0.78rem] font-medium text-pill-ink">
              Learners
            </span>
            <h2 id="stories-title" className="text-h2 text-ink">
              People who <em className="italic text-moss font-serif">actually finished.</em>
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5">
            <figure className="flex flex-col justify-between gap-7 rounded-card bg-surface p-7 shadow-[0_0_0_1px_var(--line)]">
              <blockquote className="font-display text-[1.3rem] leading-[1.35] text-ink">
                “I had started that 6-hour React video four times. Courseyl cut it to two and a half hours and I finished
                in nine days.”
              </blockquote>
              <figcaption className="flex flex-col gap-3.5">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-11 items-center justify-center rounded-full bg-lime-soft font-display font-medium text-pill-ink"
                  >
                    KA
                  </span>
                  <div>
                    <div className="font-medium text-ink">Khushi Agrawal</div>
                    <div className="text-[0.88rem] text-ink-soft">Product Designer, India</div>
                  </div>
                </div>
                <span className="font-mono text-[0.72rem] tracking-[0.07em] text-ink-soft uppercase">
                  Finished: Python for AI · 3 days
                </span>
              </figcaption>
            </figure>

            <figure className="flex flex-col justify-between gap-7 rounded-card bg-surface p-7 shadow-[0_0_0_1px_var(--line)]">
              <blockquote className="font-display text-[1.3rem] leading-[1.35] text-ink">
                “Getting a question wrong and landing on the exact 40 seconds that explain it is what made it stick.”
              </blockquote>
              <figcaption className="flex flex-col gap-3.5">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-11 items-center justify-center rounded-full bg-lime-soft font-display font-medium text-pill-ink"
                  >
                    SS
                  </span>
                  <div>
                    <div className="font-medium text-ink">Sankhya Siddesh</div>
                    <div className="text-[0.88rem] text-ink-soft">Developer Success</div>
                  </div>
                </div>
                <span className="font-mono text-[0.72rem] tracking-[0.07em] text-ink-soft uppercase">
                  Finished: Let&apos;s Reproduce GPT-2 · 4 days
                </span>
              </figcaption>
            </figure>

            <figure className="flex flex-col justify-between gap-7 rounded-card bg-surface p-7 shadow-[0_0_0_1px_var(--line)]">
              <blockquote className="font-display text-[1.3rem] leading-[1.35] text-ink">
                “No recommendations, no rabbit holes. Thirty minutes a day and a date to finish by.”
              </blockquote>
              <figcaption className="flex flex-col gap-3.5">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-11 items-center justify-center rounded-full bg-lime-soft font-display font-medium text-pill-ink"
                  >
                    NT
                  </span>
                  <div>
                    <div className="font-medium text-ink">Nisarg Thakkar</div>
                    <div className="text-[0.88rem] text-ink-soft">Backend Developer</div>
                  </div>
                </div>
                <span className="font-mono text-[0.72rem] tracking-[0.07em] text-ink-soft uppercase">
                  Finished: System design basics · 3 days
                </span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* 8. DUSK CALL TO ACTION SECTION */}
      <section aria-labelledby="cta-title" className="px-6 pt-5 pb-[110px]">
        <div className="relative mx-auto h-[620px] max-w-[1200px] overflow-hidden rounded-panel shadow-blue">
          {/* Sunset Dusk Landscape SVG */}
          <DuskLandscapeIllustration className="absolute inset-0 size-full object-cover" />

          {/* 3 Floating Frosted Glass Badges */}
          <span className="float-square top-16 left-[7%]" />
          <span className="float-square top-16 left-[calc(7%+52px)] [animation-delay:-3s]" />
          <span className="float-square top-[110px] right-[8%] [animation-delay:-2s]" />

          {/* Center Floating Glass Card */}
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="glass flex w-full max-w-[640px] flex-col items-center gap-4 rounded-panel px-8 py-12 text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-lime-soft px-3.5 py-[7px] text-[0.78rem] font-medium text-pill-ink">
                Start today
              </span>
              <h2 id="cta-title" className="text-h2 text-ink">
                Your next course starts <em className="italic text-moss font-serif">today.</em>
              </h2>
              <p className="text-ink-soft max-w-md leading-relaxed text-sm sm:text-base">
                Paste a video or playlist and start lesson 1 while the rest of the course builds.
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2.5">
                <Link
                  href={isAuthenticated ? "/dashboard" : "/login?next=/dashboard"}
                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-moss-dark hover:-translate-y-px transition-all h-12 gap-2 px-7 text-[0.92rem] font-semibold shadow-sm cursor-pointer"
                >
                  {isAuthenticated ? "Go to your dashboard" : "Start learning"}
                </Link>
                <Link
                  href={isAuthenticated ? "/dashboard" : "/login?next=/dashboard"}
                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-surface/80 text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-muted transition-all h-12 gap-2 px-7 text-[0.92rem] font-medium cursor-pointer"
                >
                  Paste a link
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. WARM OLIVE COURSEIT FOOTER */}
      <CourseItFooter />
    </div>
  );
}
