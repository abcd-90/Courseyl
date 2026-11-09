"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CourseItLogo } from "@/components/CourseItLogo";

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/courses")
      .then((res) => res.json())
      .then((data) => {
        if (data.courses) setCourses(data.courses);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfa] text-[#0f1611]">
      <header className="h-16 px-6 bg-white border-b border-[#0f1611]/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <CourseItLogo size="default" />
          <Link href="/admin" className="text-xs font-semibold text-[#4c4c3d] hover:underline">
            ← Admin Console
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
        <h1 className="text-3xl font-display font-bold text-[#0f1611]">Course Inventory</h1>
        <p className="text-xs sm:text-sm text-[#4c4c3d] mt-1">
          Review YouTube-generated courses and curriculum coverage.
        </p>

        <div className="mt-8 bg-white rounded-3xl border border-[#0f1611]/10 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#4c4c3d]">Loading courses...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#f6f7f1] border-b border-[#0f1611]/10 text-[#4c4c3d] font-semibold">
                  <tr>
                    <th className="p-4">Title</th>
                    <th className="p-4">Difficulty</th>
                    <th className="p-4">Duration</th>
                    <th className="p-4">Enrollments</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0f1611]/10">
                  {courses.map((c) => (
                    <tr key={c.id} className="hover:bg-black/5">
                      <td className="p-4 font-bold text-[#0f1611] max-w-xs truncate">{c.title}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full bg-[#e4e9c6] text-[#4b5e1e] font-bold text-xs">
                          {c.difficulty}
                        </span>
                      </td>
                      <td className="p-4">{c.totalDurationHours}h</td>
                      <td className="p-4">{c._count?.enrollments || 0}</td>
                      <td className="p-4">
                        <Link
                          href={`/courses/${c.slug}`}
                          className="text-[#4b5e1e] font-semibold hover:underline"
                        >
                          View Syllabus →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
