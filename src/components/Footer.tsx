import Link from "next/link";
import { Sparkles, Shield, Flame, BookOpen, Layers, CheckCircle2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#05070b] text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4 lg:gap-12">
          {/* Brand Info */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 text-white shadow-lg shadow-sky-500/25">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-xl font-black tracking-tight text-white">
                Course<span className="text-gradient-vibrant">It</span>
              </span>
            </Link>
            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              Transform unstructured YouTube tutorials and playlists into structured, high-retention online courses with interactive quizzes, timestamped notes, and adaptive placement testing.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational</span>
            </div>
          </div>

          {/* Column 1: Learning Platform */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">
              Platform
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link href="/generate" className="transition hover:text-white hover:underline">
                  YouTube Course Generator
                </Link>
              </li>
              <li>
                <Link href="/community" className="transition hover:text-white hover:underline">
                  Explore Courses
                </Link>
              </li>
              <li>
                <Link href="/roadmaps" className="transition hover:text-white hover:underline">
                  Learning Roadmaps
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="transition hover:text-white hover:underline">
                  Subscription Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Key Features */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">
              Features
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />
                <span>Diagnostic Placement Tests</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-400" />
                <span>Replay the Moment Quizzes</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                <span>Timestamped Study Notes</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>30–120m Daily Study Planner</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
                <span>Nemotron & OpenAI Synthesis</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Trust & Security */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">
              Security & Trust
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li className="text-slate-400">Authorized YouTube API</li>
              <li className="text-slate-400">Data Privacy & Encryption</li>
              <li>
                <span className="cursor-pointer transition hover:text-white">Terms of Service</span>
              </li>
              <li>
                <span className="cursor-pointer transition hover:text-white">Privacy Policy</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="mt-12 flex flex-col items-center justify-between border-t border-white/[0.08] pt-8 text-xs text-slate-500 sm:flex-row">
          <p>© 2026 CourseIt Learning Platform. All rights reserved.</p>
          <div className="mt-4 flex items-center gap-4 sm:mt-0">
            <span className="text-[11px] text-slate-400">Engineered for active mastery</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
