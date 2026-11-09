"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CourseItLogo } from "@/components/CourseItLogo";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/metrics")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => setMetrics(data))
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfcfa] text-[#4c4c3d] text-sm">
        Loading admin telemetry...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfa] text-[#0f1611]">
      <header className="h-16 px-6 bg-white border-b border-[#0f1611]/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <CourseItLogo size="default" />
          <span className="px-2.5 py-0.5 rounded-full bg-[#e4e9c6] text-[#4b5e1e] text-xs font-bold uppercase">
            Admin Console
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <Link href="/admin/users" className="text-[#4c4c3d] hover:text-[#0f1611]">Users</Link>
          <Link href="/admin/courses" className="text-[#4c4c3d] hover:text-[#0f1611]">Courses</Link>
          <Link href="/admin/ai" className="text-[#4c4c3d] hover:text-[#0f1611]">AI Config</Link>
          <Link href="/dashboard" className="px-3 py-1.5 rounded-full bg-[#4b5e1e] text-[#f6f8ec]">
            Learner View →
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold text-[#0f1611]">
            Platform Telemetry & System Health
          </h1>
          <p className="text-xs sm:text-sm text-[#4c4c3d] mt-1">
            Real-time aggregate database metrics, user engagement, and AI generation status.
          </p>
        </div>

        {/* 5 Neon Stat Cards in clean CourseIt theme */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Total Users", val: metrics?.usersCount || 0 },
            { label: "Active Courses", val: metrics?.coursesCount || 0 },
            { label: "Enrollments", val: metrics?.enrollmentsCount || 0 },
            { label: "Quiz Attempts", val: metrics?.quizAttemptsCount || 0 },
            { label: "Study Notes", val: metrics?.notesCount || 0 },
          ].map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-[#0f1611]/10 p-5 shadow-sm">
              <p className="text-xs text-[#4c4c3d]">{item.label}</p>
              <p className="text-3xl font-display font-bold text-[#0f1611] mt-1">{item.val}</p>
            </div>
          ))}
        </div>

        {/* Quick Management Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/admin/users"
            className="p-6 rounded-3xl bg-white border border-[#0f1611]/10 shadow-sm hover:border-[#4b5e1e]/40 transition-all space-y-2"
          >
            <h3 className="text-base font-bold text-[#0f1611]">User Management →</h3>
            <p className="text-xs text-[#4c4c3d]">
              Manage user accounts, roles (Learner/Admin), subscriptions, and streaks.
            </p>
          </Link>

          <Link
            href="/admin/courses"
            className="p-6 rounded-3xl bg-white border border-[#0f1611]/10 shadow-sm hover:border-[#4b5e1e]/40 transition-all space-y-2"
          >
            <h3 className="text-base font-bold text-[#0f1611]">Course Management →</h3>
            <p className="text-xs text-[#4c4c3d]">
              Review all YouTube-generated courses, syllabus structure, and visibility.
            </p>
          </Link>

          <Link
            href="/admin/ai"
            className="p-6 rounded-3xl bg-white border border-[#0f1611]/10 shadow-sm hover:border-[#4b5e1e]/40 transition-all space-y-2"
          >
            <h3 className="text-base font-bold text-[#0f1611]">AI Engine Configuration →</h3>
            <p className="text-xs text-[#4c4c3d]">
              Switch active LLM provider between NVIDIA Nemotron, OpenAI, and heuristic parser.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
