"use client";

import React, { useState } from "react";

export interface AdminCourseItem {
  id: string;
  title: string;
  slug: string;
  description?: string;
  status: string;
  isPublic: boolean;
  difficulty: string;
  durationSeconds: number;
  enrollmentCount: number;
  creatorEmail: string;
  creatorName: string;
  channelTitle?: string;
  youtubeId?: string;
  chapterCount: number;
  thumbnailUrl: string;
  createdAt: string;
}

interface AdminCoursesStudioProps {
  courses: AdminCourseItem[];
  onRefreshCourses: () => Promise<void>;
  onToast: (type: "success" | "error", text: string) => void;
}

const VERIFIED_SAMPLES = [
  { label: "Gen AI Full Course", id: "3iFMc6ELt7k", channel: "Coding With Sagar" },
  { label: "Harvard CS50 Python", id: "nLRL_NcnK-4", channel: "freeCodeCamp.org" },
  { label: "System Design", id: "m8Icp_Cid5o", channel: "freeCodeCamp.org" },
  { label: "Python for AI", id: "ygXn5nV5qFc", channel: "Dave Ebbelaar" },
  { label: "Complete Agentic AI", id: "eynUbHweaQM", channel: "Krish Naik" },
];

export function AdminCoursesStudio({
  courses,
  onRefreshCourses,
  onToast,
}: AdminCoursesStudioProps) {
  const [search, setSearch] = useState("");
  const [createMode, setCreateMode] = useState<"DUMMY" | "YOUTUBE">("DUMMY");
  const [submitting, setSubmitting] = useState(false);

  // Create form state
  const [title, setTitle] = useState("");
  const [addedByName, setAddedByName] = useState("Mr Sami");
  const [learnersCount, setLearnersCount] = useState<number>(84);
  const [channelTitle, setChannelTitle] = useState("Courseyl Studio");
  const [durationMinutes, setDurationMinutes] = useState<number>(240);
  const [chaptersCount, setChaptersCount] = useState<number>(4);
  const [lessonsPerChapter, setLessonsPerChapter] = useState<number>(3);
  const [difficulty, setDifficulty] = useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED">("BEGINNER");
  const [youtubeUrlOrId, setYoutubeUrlOrId] = useState("3iFMc6ELt7k");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  // Edit modal state
  const [editingCourse, setEditingCourse] = useState<AdminCourseItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAddedBy, setEditAddedBy] = useState("");
  const [editLearners, setEditLearners] = useState<number>(0);
  const [editChannel, setEditChannel] = useState("");
  const [editDifficulty, setEditDifficulty] = useState("BEGINNER");
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createMode === "DUMMY" && !title.trim()) {
      onToast("error", "Please enter a course title.");
      return;
    }
    if (createMode === "YOUTUBE" && !youtubeUrlOrId.trim()) {
      onToast("error", "Please enter a valid YouTube link.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: createMode,
          title: title.trim() || undefined,
          addedByName: addedByName.trim() || "Mr Sami",
          enrollmentCount: learnersCount,
          channelTitle: channelTitle.trim() || undefined,
          durationMinutes,
          chaptersCount,
          lessonsPerChapter,
          difficulty,
          youtubeUrlOrId: youtubeUrlOrId.trim(),
          url: youtubeUrlOrId.trim(),
          thumbnailUrl: thumbnailUrl.trim() || undefined,
          description: description.trim() || undefined,
          isPublic,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        onToast("error", data.error || "Failed to create course.");
        return;
      }

      onToast("success", data.message || "Course created and published!");
      setTitle("");
      setDescription("");
      setThumbnailUrl("");
      await onRefreshCourses();
    } catch {
      onToast("error", "Network error while creating course.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditor = (c: AdminCourseItem) => {
    setEditingCourse(c);
    setEditTitle(c.title);
    setEditAddedBy(c.creatorName || "Mr Sami");
    setEditLearners(c.enrollmentCount || 0);
    setEditChannel(c.channelTitle || "");
    setEditDifficulty(c.difficulty || "BEGINNER");
    setEditIsPublic(c.isPublic);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: editingCourse.id,
          title: editTitle.trim(),
          addedByName: editAddedBy.trim(),
          enrollmentCount: editLearners,
          channelTitle: editChannel.trim() || undefined,
          difficulty: editDifficulty,
          isPublic: editIsPublic,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onToast("error", data.error || "Failed to update course.");
        return;
      }
      onToast("success", "Course attribution, learners, and metadata updated!");
      setEditingCourse(null);
      await onRefreshCourses();
    } catch {
      onToast("error", "Failed to save course changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleTogglePublic = async (c: AdminCourseItem) => {
    try {
      const res = await fetch("/api/admin/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: c.id, isPublic: !c.isPublic }),
      });
      if (res.ok) {
        onToast("success", !c.isPublic ? "Published to Community." : "Moved to Private.");
        await onRefreshCourses();
      }
    } catch {
      onToast("error", "Failed to toggle visibility.");
    }
  };

  const handleDelete = async (courseId: string, courseTitle: string) => {
    if (!confirm(`Delete "${courseTitle}" permanently?`)) return;
    try {
      const res = await fetch(`/api/admin/courses?id=${courseId}`, { method: "DELETE" });
      if (res.ok) {
        onToast("success", "Course deleted.");
        await onRefreshCourses();
      }
    } catch {
      onToast("error", "Failed to delete course.");
    }
  };

  const filtered = courses.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      c.creatorName.toLowerCase().includes(q) ||
      (c.channelTitle || "").toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q)
    );
  });

  const formatHrs = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-8">
      {/* Course Creator Studio Card */}
      <div className="rounded-[28px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-soft px-3 py-1 font-mono text-[0.68rem] font-semibold uppercase tracking-wider text-pill-ink">
              Course Builder Studio
            </span>
            <h2 className="mt-2 text-2xl font-display font-bold text-ink">
              Add Custom, Dummy, or <em className="italic text-moss font-serif">YouTube Courses</em>
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft mt-1">
              Publish ready-to-watch courses with any <strong>Added By Name</strong> and exact <strong>Learners Count</strong>.
            </p>
          </div>

          <div className="inline-flex rounded-full bg-paper p-1 shadow-[0_0_0_1px_var(--line)] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setCreateMode("DUMMY")}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                createMode === "DUMMY"
                  ? "bg-moss text-on-moss shadow-xs"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              ✨ Custom / Dummy Course
            </button>
            <button
              type="button"
              onClick={() => setCreateMode("YOUTUBE")}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                createMode === "YOUTUBE"
                  ? "bg-moss text-on-moss shadow-xs"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              ▶ Real YouTube Import
            </button>
          </div>
        </div>

        <form onSubmit={handleCreateCourse} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[0.7rem] font-mono font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                {createMode === "DUMMY" ? "Course Title *" : "Custom Title Override (Optional)"}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required={createMode === "DUMMY"}
                placeholder="e.g. Complete Agentic AI Engineering Bootcamp 2026"
                className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none focus:ring-2 focus:ring-moss/30"
              />
            </div>

            <div>
              <label className="block text-[0.7rem] font-mono font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                Added By Name (Shown on Card) *
              </label>
              <input
                type="text"
                value={addedByName}
                onChange={(e) => setAddedByName(e.target.value)}
                required
                placeholder="e.g. Mr Sami"
                className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none focus:ring-2 focus:ring-moss/30"
              />
            </div>

            <div>
              <label className="block text-[0.7rem] font-mono font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                Learners Count (&quot;X learning&quot;)
              </label>
              <input
                type="number"
                min={0}
                value={learnersCount}
                onChange={(e) => setLearnersCount(Number(e.target.value))}
                className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none focus:ring-2 focus:ring-moss/30"
              />
            </div>

            <div>
              <label className="block text-[0.7rem] font-mono font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                Instructor / Channel Name
              </label>
              <input
                type="text"
                value={channelTitle}
                onChange={(e) => setChannelTitle(e.target.value)}
                placeholder="e.g. freeCodeCamp.org"
                className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none focus:ring-2 focus:ring-moss/30"
              />
            </div>

            <div>
              <label className="block text-[0.7rem] font-mono font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none focus:ring-2 focus:ring-moss/30"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-[0.7rem] font-mono font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                {createMode === "YOUTUBE" ? "YouTube Video or Playlist URL *" : "YouTube Video URL or ID (For Player & Thumb)"}
              </label>
              <input
                type="text"
                value={youtubeUrlOrId}
                onChange={(e) => setYoutubeUrlOrId(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or Video ID (e.g. 3iFMc6ELt7k)"
                className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none focus:ring-2 focus:ring-moss/30"
              />
              {createMode === "DUMMY" && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {VERIFIED_SAMPLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setYoutubeUrlOrId(s.id);
                        if (!channelTitle || channelTitle === "Courseyl Studio") {
                          setChannelTitle(s.channel);
                        }
                      }}
                      className="px-2 py-0.5 rounded-full bg-lime-soft/70 hover:bg-lime-soft text-[0.65rem] font-medium text-pill-ink transition-colors cursor-pointer"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[0.7rem] font-mono font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                Custom Thumbnail URL (Optional)
              </label>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="Auto-fetched if left blank"
                className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none focus:ring-2 focus:ring-moss/30"
              />
            </div>

            {createMode === "DUMMY" && (
              <div>
                <label className="block text-[0.7rem] font-mono font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Total Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={15}
                  max={3600}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none focus:ring-2 focus:ring-moss/30"
                />
              </div>
            )}
          </div>

          {createMode === "DUMMY" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[0.7rem] font-mono font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Days / Modules
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={chaptersCount}
                  onChange={(e) => setChaptersCount(Number(e.target.value))}
                  className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                />
              </div>
              <div>
                <label className="block text-[0.7rem] font-mono font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Lessons per Day
                </label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={lessonsPerChapter}
                  onChange={(e) => setLessonsPerChapter(Number(e.target.value))}
                  className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[0.7rem] font-mono font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Course Summary (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description shown on syllabus page..."
                  className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-line">
            <label className="inline-flex items-center gap-2.5 text-sm font-medium text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 accent-[#4b5e1e] rounded"
              />
              <span>Publish immediately in Community & Homepage catalog</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-full bg-moss text-on-moss hover:bg-moss-dark font-semibold text-sm shadow-sm transition-all hover:-translate-y-px disabled:opacity-50 cursor-pointer"
            >
              {submitting
                ? createMode === "YOUTUBE"
                  ? "Ingesting & Building with AI..."
                  : "Creating Course..."
                : createMode === "YOUTUBE"
                ? "Ingest & Publish YouTube Course"
                : "+ Create & Publish Course"}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Courses Management Grid */}
      <div className="rounded-[28px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-display font-bold text-ink">
              All Platform Courses ({courses.length})
            </h3>
            <p className="text-xs text-ink-soft">
              Click <strong>Edit Details</strong> on any course to change its <strong>Added By Name</strong> or <strong>Learners Count</strong> anytime.
            </p>
          </div>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses or creators..."
            className="w-full sm:w-72 h-10 rounded-full bg-paper px-4 text-xs sm:text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none focus:ring-2 focus:ring-moss/30"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl bg-paper p-3.5 shadow-[0_0_0_1px_var(--line)] flex flex-col justify-between gap-3 hover:shadow-md transition-all"
            >
              <div className="space-y-3">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.thumbnailUrl}
                    alt={c.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://i.ytimg.com/vi/3iFMc6ELt7k/hqdefault.jpg";
                    }}
                  />
                  <span
                    className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[0.65rem] font-bold font-mono ${
                      c.isPublic ? "bg-lime text-[#0f1611]" : "bg-black/75 text-white"
                    }`}
                  >
                    {c.isPublic ? "PUBLIC" : "PRIVATE"}
                  </span>
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/80 text-white text-[0.65rem] font-mono">
                    {formatHrs(c.durationSeconds)}
                  </span>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-ink line-clamp-2 leading-snug">
                    {c.title}
                  </h4>
                  <p className="text-xs text-ink-soft mt-1 truncate">
                    {c.channelTitle || "Courseyl Studio"} · {c.chapterCount} modules
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-line space-y-2.5">
                <div className="flex items-center justify-between text-xs text-ink-soft">
                  <span className="truncate">
                    added by <strong className="text-ink">{c.creatorName}</strong>
                  </span>
                  <span className="font-mono font-semibold text-moss shrink-0 ml-2">
                    {c.enrollmentCount} learning
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditor(c)}
                    className="flex-1 py-1.5 px-3 rounded-full bg-moss text-on-moss text-xs font-semibold hover:bg-moss-dark transition-colors cursor-pointer"
                  >
                    Edit Details
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePublic(c)}
                    className="py-1.5 px-3 rounded-full bg-surface text-ink text-xs font-medium shadow-[inset_0_0_0_1px_var(--line)] hover:bg-muted transition-colors cursor-pointer"
                  >
                    {c.isPublic ? "Hide" : "Publish"}
                  </button>
                  <a
                    href={`/courses/${c.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-2.5 rounded-full bg-surface text-ink-soft text-xs font-medium shadow-[inset_0_0_0_1px_var(--line)] hover:text-ink transition-colors"
                    title="Open Course Page"
                  >
                    ↗
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id, c.title)}
                    className="py-1.5 px-2.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors cursor-pointer"
                    title="Delete Course"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-surface p-6 sm:p-8 shadow-2xl border border-line space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-display font-bold text-ink">Edit Course Attribution & Stats</h3>
              <button
                type="button"
                onClick={() => setEditingCourse(null)}
                className="w-8 h-8 rounded-full bg-paper text-ink-soft hover:text-ink flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[0.7rem] font-mono font-bold uppercase tracking-wider text-ink-soft mb-1">
                  Course Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full h-10 rounded-xl bg-paper px-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.7rem] font-mono font-bold uppercase tracking-wider text-ink-soft mb-1">
                    Added By Name
                  </label>
                  <input
                    type="text"
                    value={editAddedBy}
                    onChange={(e) => setEditAddedBy(e.target.value)}
                    required
                    className="w-full h-10 rounded-xl bg-paper px-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[0.7rem] font-mono font-bold uppercase tracking-wider text-ink-soft mb-1">
                    Learners Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editLearners}
                    onChange={(e) => setEditLearners(Number(e.target.value))}
                    className="w-full h-10 rounded-xl bg-paper px-3 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.7rem] font-mono font-bold uppercase tracking-wider text-ink-soft mb-1">
                    Instructor / Channel
                  </label>
                  <input
                    type="text"
                    value={editChannel}
                    onChange={(e) => setEditChannel(e.target.value)}
                    className="w-full h-10 rounded-xl bg-paper px-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[0.7rem] font-mono font-bold uppercase tracking-wider text-ink-soft mb-1">
                    Difficulty
                  </label>
                  <select
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(e.target.value)}
                    className="w-full h-10 rounded-xl bg-paper px-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsPublic}
                  onChange={(e) => setEditIsPublic(e.target.checked)}
                  className="w-4 h-4 accent-[#4b5e1e]"
                />
                <span>Public in Community & Homepage</span>
              </label>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 rounded-full border border-line text-xs font-semibold text-ink-soft hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-full bg-moss text-on-moss text-xs font-semibold hover:bg-moss-dark disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

