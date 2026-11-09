"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notes")
      .then((res) => res.json())
      .then((data) => {
        if (data.notes) {
          setNotes(data.notes);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredNotes = notes.filter(
    (n) =>
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      (n.lessonTitle || n.lesson?.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (n.courseTitle || n.lesson?.chapter?.course?.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-paper text-ink">
      <AppSidebar />

      <main className="w-full min-w-0 flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-5xl">
        {/* Category Tag matching Screenshot 3 */}
        <div className="mb-2">
          <span className="text-[0.7rem] font-bold text-ink-soft/70 tracking-widest uppercase font-mono">
            Notes
          </span>
        </div>

        {/* Headline matching Screenshot 3 */}
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink tracking-tight">
          Your notes, <span className="italic text-moss font-serif">course by course.</span>
        </h1>

        {/* Full-Width Search Input matching Screenshot 3 */}
        <div className="relative w-full mt-6">
          <div className="absolute left-4 top-3.5 text-ink-soft/70 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a course..."
            className="w-full bg-surface dark:bg-[#0d140f] border border-line dark:border-[#1b261e] rounded-2xl pl-11 pr-4 py-3 text-sm text-ink placeholder-ink-soft/60 outline-none focus:border-moss focus:ring-1 focus:ring-moss/30 transition-all shadow-xs"
          />
        </div>

        {/* Notes Content or Empty State matching Screenshot 3 */}
        <div className="mt-6">
          {loading ? (
            <div className="p-12 text-center text-sm text-ink-soft">Loading notes...</div>
          ) : filteredNotes.length === 0 ? (
            /* Empty State Card matching Screenshot 3 exactly */
            <div className="w-full bg-surface dark:bg-[#0d140f] rounded-3xl border border-line dark:border-[#1b261e] p-16 sm:p-20 text-center shadow-sm flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-lime-soft dark:bg-[#182315] border border-line dark:border-[#26371a] text-moss dark:text-[#b8c460] flex items-center justify-center mb-5 shadow-xs">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-bold text-ink">
                No notes yet
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-ink-soft max-w-md leading-relaxed">
                Write in &ldquo;My notes&rdquo; under any lesson. Each course you write in gets a place here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-surface dark:bg-[#0d140f] rounded-2xl border border-line dark:border-[#1b261e] p-5 shadow-xs space-y-2 hover:border-moss/40 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-moss">
                      {note.lessonTitle || note.lesson?.title || "Lesson Note"}
                    </span>
                    <span className="text-ink-soft font-mono">
                      {note.timestampFormatted || `${Math.floor((note.timestampSeconds || 0) / 60)}:${String((note.timestampSeconds || 0) % 60).padStart(2, "0")}`}
                    </span>
                  </div>
                  <p className="text-sm text-ink whitespace-pre-wrap">{note.content}</p>
                  {note.lessonId && (
                    <div className="pt-2 text-right">
                      <Link
                        href={`/courses/${note.courseSlug || "course"}/learn/${note.lessonId}`}
                        className="text-xs text-moss hover:underline font-medium"
                      >
                        Jump to video moment →
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
