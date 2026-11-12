import React from "react";
import Link from "next/link";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { CourseItFooter } from "@/components/CourseItFooter";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfa] text-[#0f1611]">
      <MarketingNavbar />

      <main className="flex-1 max-w-3xl mx-auto px-6 pt-36 pb-24">
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-[#0f1611] tracking-tight">
          About <em className="italic text-[#4b5e1e] font-serif">CourseIt.</em>
        </h1>

        <div className="mt-8 space-y-6 text-[#4c4c3d] text-base sm:text-lg leading-relaxed">
          <p>
            The best teachers in the world are on YouTube, for free. What YouTube doesn&apos;t give you is a course: a
            plan, a finish line, and a way to check you actually understood. CourseIt adds those, and nothing else.
          </p>

          <p>
            Courseyl is built to provide simple, focused tools for learners and creators.
          </p>

          <h2 className="text-2xl font-display font-semibold text-[#0f1611] pt-6">How it works</h2>
          <p>
            Paste a video or playlist. NVIDIA Nemotron models read the transcript, split it into bite-sized lessons, and
            write study notes, quizzes and a placement test for each course. Videos play in YouTube&apos;s own player, so
            creators keep their views.
          </p>

          <h2 className="text-2xl font-display font-semibold text-[#0f1611] pt-6">Who&apos;s building it</h2>
          <p>
            I&apos;m Abhishek Kumar, a full-stack AI engineer from New Delhi. I built CourseIt because of Andrej
            Karpathy&apos;s &ldquo;Zero to Hero&rdquo; playlist: it sat in my Watch Later for months, I started it three
            times, and I never made it past video two. Forty minutes into &ldquo;Let&apos;s build GPT&rdquo;, YouTube
            would have me watching travel vlogs instead. The teaching was never the problem; the missing structure was.
          </p>

          <h2 className="text-2xl font-display font-semibold text-[#0f1611] pt-6">Get in touch</h2>
          <p>
            Questions, ideas or a course that didn&apos;t build right? Write to{" "}
            <a href="mailto:thecourseyl@gmail.com" className="text-[#4b5e1e] underline underline-offset-4 font-medium">
              thecourseyl@gmail.com
            </a>
            , or{" "}
            <Link href="/dashboard" className="text-[#4b5e1e] underline underline-offset-4 font-medium">
              build your first course
            </Link>
            .
          </p>
        </div>
      </main>

      <CourseItFooter />
    </div>
  );
}

