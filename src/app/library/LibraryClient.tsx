"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { formatDuration } from "@/lib/courseCategories";

export interface SerializedCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  totalDurationSeconds: number;
  channelTitle: string | null;
  lessonCount: number;
  enrollmentCount: number;
  category: string;
}

export interface CategoryGroup {
  id: string;
  name: string;
  courses: SerializedCourse[];
}

interface LibraryClientProps {
  categories: CategoryGroup[];
  totalCoursesCount: number;
}

export function LibraryClient({
  categories,
  totalCoursesCount,
}: LibraryClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return categories.filter((c) => c.courses.length > 0);
    }

    return categories
      .map((cat) => {
        const matched = cat.courses.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            (c.channelTitle && c.channelTitle.toLowerCase().includes(q)) ||
            (c.description && c.description.toLowerCase().includes(q))
        );
        return { ...cat, courses: matched };
      })
      .filter((cat) => cat.courses.length > 0);
  }, [categories, searchQuery]);

  return (
    <div className="w-full">
      {/* Sleek Minimalist Search Bar */}
      <div className="mt-8 relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-soft">
          <Search className="size-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter courses by title, topic, or channel..."
          className="w-full h-10 pl-10 pr-4 rounded-full bg-surface text-sm text-ink placeholder:text-ink-soft/60 shadow-[inset_0_0_0_1px_var(--line)] focus:outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-moss)] transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-ink-soft hover:text-ink cursor-pointer font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {/* Topics Nav with Exact Competitor Pill Styling */}
      {!searchQuery && (
        <nav aria-label="Topics" className="mt-8 flex flex-wrap gap-2">
          {categories
            .filter((c) => c.courses.length > 0)
            .map((cat) => (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className="rounded-full bg-surface px-3.5 py-1.5 text-[0.88rem] text-ink-soft shadow-[inset_0_0_0_1px_var(--line)] hover:text-ink transition-colors cursor-pointer"
              >
                {cat.name}{" "}
                <span className="tabular-nums text-ink-soft/80">
                  ({cat.courses.length})
                </span>
              </a>
            ))}
        </nav>
      )}

      {/* Search results notice */}
      {searchQuery && (
        <div className="mt-6 text-sm text-ink-soft">
          Showing matching courses for &ldquo;<span className="font-medium text-ink">{searchQuery}</span>&rdquo;
        </div>
      )}

      {/* Course Sections */}
      <div className="mt-14 space-y-14">
        {filteredCategories.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-base text-ink-soft">No courses found matching &ldquo;{searchQuery}&rdquo;</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-3 text-xs font-semibold text-moss hover:underline cursor-pointer"
            >
              Clear search filter
            </button>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <section
              key={cat.id}
              id={cat.id}
              aria-labelledby={`${cat.id}-title`}
              className="scroll-mt-28"
            >
              <div className="flex items-baseline justify-between">
                <h2
                  id={`${cat.id}-title`}
                  className="text-h3 font-medium text-ink flex items-baseline gap-2.5"
                >
                  <span>{cat.name}</span>
                  <span className="text-xs font-mono font-normal text-ink-soft/70 tabular-nums">
                    ({cat.courses.length})
                  </span>
                </h2>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-xs text-ink-soft hover:text-ink font-medium transition-colors"
                >
                  ↑ Top
                </a>
              </div>

              <ul className="mt-4 flex flex-col divide-y divide-[var(--line)]">
                {cat.courses.map((course) => (
                  <li key={course.id} className="py-3">
                    <Link
                      href={`/courses/${course.slug || course.id}`}
                      prefetch={true}
                      className="font-medium text-ink hover:text-moss text-[1.05rem] transition-colors leading-snug inline-block"
                    >
                      {course.title}
                    </Link>
                    <p className="text-[0.88rem] text-ink-soft tabular-nums mt-0.5">
                      {course.channelTitle ? `${course.channelTitle} · ` : ""}
                      {course.lessonCount} lessons ·{" "}
                      {formatDuration(course.totalDurationSeconds)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
