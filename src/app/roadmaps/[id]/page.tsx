"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";

export default function RoadmapDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const id = resolvedParams.id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [courseUrl, setCourseUrl] = useState("");
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [buildingStatus, setBuildingStatus] = useState<string | null>(null);

  // Interactivity states for editing & sharing
  const [shareCopied, setShareCopied] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageTitleDraft, setStageTitleDraft] = useState("");
  const [isSavingStage, setIsSavingStage] = useState(false);
  const [isAddingStage, setIsAddingStage] = useState(false);

  const fetchRoadmap = () => {
    fetch(`/api/roadmaps/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Roadmap not found");
        return res.json();
      })
      .then((d) => {
        setData(d);
        if (d?.roadmap?.title) {
          setTitleDraft(d.roadmap.title);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRoadmap();
  }, [id]);

  const fallbackCopyText = (text: string) => {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).catch(() => {
          fallbackCopyText(url);
        });
      } else {
        fallbackCopyText(url);
      }
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
  };

  const handleSaveTitle = async () => {
    if (!titleDraft.trim()) return;
    setIsSavingTitle(true);
    try {
      const res = await fetch(`/api/roadmaps/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleDraft.trim() }),
      });
      if (res.ok) {
        setIsEditingTitle(false);
        fetchRoadmap();
      } else {
        alert("Failed to update roadmap title.");
      }
    } catch {
      alert("Failed to update roadmap title.");
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleSaveStageTitle = async (stageId: string) => {
    if (!stageTitleDraft.trim()) return;
    setIsSavingStage(true);
    try {
      const res = await fetch(`/api/roadmaps/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageId,
          stageTitle: stageTitleDraft.trim(),
        }),
      });
      if (res.ok) {
        setEditingStageId(null);
        fetchRoadmap();
      } else {
        alert("Failed to update stage title.");
      }
    } catch {
      alert("Failed to update stage title.");
    } finally {
      setIsSavingStage(false);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm("Are you sure you want to delete this stage?")) return;
    try {
      const res = await fetch(`/api/roadmaps/${id}/stages`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId }),
      });
      if (res.ok) {
        fetchRoadmap();
      } else {
        alert("Failed to delete stage.");
      }
    } catch {
      alert("Failed to delete stage.");
    }
  };

  const handleAddStage = async () => {
    setIsAddingStage(true);
    try {
      const res = await fetch(`/api/roadmaps/${id}/stages`, {
        method: "POST",
      });
      if (res.ok) {
        fetchRoadmap();
      } else {
        alert("Failed to add stage.");
      }
    } catch {
      alert("Failed to add stage.");
    } finally {
      setIsAddingStage(false);
    }
  };

  const handleAddCourse = async (e: React.FormEvent, stageId: string) => {
    e.preventDefault();
    if (!courseUrl.trim()) return;

    setIsAddingCourse(true);
    setBuildingStatus("Building");

    try {
      const res = await fetch(`/api/roadmaps/${id}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageId,
          url: courseUrl.trim(),
        }),
      });

      if (res.ok) {
        setCourseUrl("");
        fetchRoadmap();
        setTimeout(() => {
          setBuildingStatus(null);
        }, 3000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add course.");
        setBuildingStatus(null);
      }
    } catch {
      alert("Failed to add course.");
      setBuildingStatus(null);
    } finally {
      setIsAddingCourse(false);
    }
  };

  const handleRemoveCourse = async (stageId: string, courseId: string) => {
    try {
      const res = await fetch(`/api/roadmaps/${id}/courses`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId, courseId }),
      });
      if (res.ok) {
        fetchRoadmap();
      }
    } catch (err) {
      console.error(err);
    }
  };

  function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex bg-paper text-ink">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center p-12 text-sm text-ink-soft">
          Loading roadmap...
        </div>
      </div>
    );
  }

  if (!data?.roadmap) {
    return (
      <div className="min-h-screen flex bg-paper text-ink">
        <AppSidebar />
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <h2 className="text-xl font-bold text-ink">Roadmap not found</h2>
          <Link
            href="/roadmaps"
            className="mt-4 px-5 py-2.5 rounded-full bg-[#b8c460] text-[#0f1611] font-semibold text-sm hover:bg-[#a6b350] transition-colors"
          >
            ← Back to Roadmaps
          </Link>
        </div>
      </div>
    );
  }

  const roadmap = data.roadmap;
  const stages = roadmap.stages || [];
  const allCourses = stages.flatMap((st: any) => st.courses || []);
  const totalCoursesCount = allCourses.length;
  const overallProgress = data.userState?.overallProgress || 0;

  // Extract unique creators across courses in this roadmap
  const creators: string[] = Array.from(
    new Set(allCourses.map((c: any) => String(c.author || c.source?.channelTitle || c.channelTitle || "Mayank Aggarwal")).filter(Boolean))
  );

  return (
    <div className="min-h-screen flex bg-paper text-ink">
      {/* Left Application Shell Sidebar */}
      <AppSidebar />

      {/* Main Roadmap Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-6xl w-full space-y-6">
        {/* Top Back Navigation */}
        <Link
          href="/roadmaps"
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-ink-soft hover:text-ink transition-colors group cursor-pointer"
        >
          <span className="transition-transform group-hover:-translate-x-0.5 font-bold">←</span>
          <span>All roadmaps</span>
        </Link>

        {/* Roadmap Meta Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[0.68rem] font-bold text-ink-soft/80 uppercase tracking-widest font-mono">
                ROADMAP · BY YOU
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#1e2338] text-[#8e9bc7] text-[0.68rem] font-medium">
                • Private
              </span>
            </div>

            {/* Title styled with distinctive lime-moss font matching Screenshot 9 */}
            {isEditingTitle ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-moss bg-surface dark:bg-[#121815] text-xl font-bold text-ink dark:text-white outline-none w-full"
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  disabled={isSavingTitle}
                  className="px-4 py-1.5 rounded-xl bg-[#b8c460] text-[#0f1611] text-xs font-semibold hover:bg-[#a6b350] transition-colors cursor-pointer shrink-0"
                >
                  {isSavingTitle ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="px-3 py-1.5 rounded-xl border border-line text-xs text-ink-soft hover:text-ink transition-colors cursor-pointer shrink-0"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <h1 className="text-3xl sm:text-4xl font-display font-medium text-[#b8c460] italic tracking-tight">
                {roadmap.title}
              </h1>
            )}
          </div>

          {/* Top Right Action Buttons (Share & Edit) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className={`px-4 py-2 rounded-full border text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${shareCopied
                  ? "border-[#b8c460] bg-[#b8c460] text-[#0f1611]"
                  : "border-line dark:border-white/10 bg-surface dark:bg-[#121815] text-ink hover:bg-black/5 dark:hover:bg-white/5"
                }`}
            >
              {shareCopied ? (
                <>
                  <span>✓</span>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Share</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setIsEditingTitle(!isEditingTitle);
                setTitleDraft(roadmap.title);
              }}
              className="px-4 py-2 rounded-full border border-line dark:border-white/10 bg-surface dark:bg-[#121815] text-xs font-semibold text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Content Layout: Left Stage Cards + Right Stats Card */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* Left Column: Stages */}
          <div className="space-y-5">
            {stages.map((stage: any, sIdx: number) => {
              const stageCourses = stage.courses || [];
              const hasCourses = stageCourses.length > 0;
              const isEditingThisStage = editingStageId === stage.id;

              return (
                <div
                  key={stage.id || sIdx}
                  className={`rounded-3xl p-6 sm:p-7 space-y-5 transition-all shadow-xs ${hasCourses
                      ? "border-2 border-[#b8c460] bg-surface dark:bg-[#0c120e]"
                      : "border border-line dark:border-white/10 bg-surface dark:bg-[#0c120e]"
                    }`}
                >
                  {/* Stage Header Row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Circle Number */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 ${hasCourses
                            ? "bg-[#b8c460] text-[#0f1611]"
                            : "bg-black/10 dark:bg-[#1c2438] text-ink-soft dark:text-slate-300"
                          }`}
                      >
                        {sIdx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        {isEditingThisStage ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={stageTitleDraft}
                              onChange={(e) => setStageTitleDraft(e.target.value)}
                              className="px-2.5 py-1 text-sm rounded-lg border border-moss bg-surface dark:bg-[#161c18] text-ink dark:text-white outline-none w-full max-w-xs"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveStageTitle(stage.id)}
                              disabled={isSavingStage}
                              className="px-3 py-1 rounded-lg bg-[#b8c460] text-[#0f1611] text-xs font-semibold cursor-pointer"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingStageId(null)}
                              className="px-2.5 py-1 rounded-lg border border-line text-xs text-ink-soft cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            <h3 className="font-bold text-base text-ink leading-tight truncate">
                              {stage.title || `Stage ${sIdx + 1}`}
                            </h3>
                            <p className="text-xs text-ink-soft">
                              {hasCourses ? `${stageCourses.length} course · you are here` : "0 courses"}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Status Badge */}
                      {hasCourses ? (
                        <div className="px-3 py-1 rounded-full bg-[#1b2b1a] text-[#86efac] text-xs font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                          <span>In progress</span>
                        </div>
                      ) : (
                        <div className="px-3 py-1 rounded-full bg-[#1e2338] text-[#8e9bc7] text-xs font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#64748b]" />
                          <span>No courses yet</span>
                        </div>
                      )}

                      {/* Pencil Edit Icon */}
                      <button
                        onClick={() => {
                          setEditingStageId(stage.id);
                          setStageTitleDraft(stage.title || `Stage ${sIdx + 1}`);
                        }}
                        className="text-ink-soft hover:text-ink p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        title="Edit stage name"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>

                      {/* Trash Delete Icon */}
                      <button
                        onClick={() => handleDeleteStage(stage.id)}
                        className="text-ink-soft hover:text-red-400 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        title="Delete stage"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* List of Courses in this stage matching Screenshot 4 */}
                  {hasCourses && (
                    <div className="space-y-2 pt-1">
                      {stageCourses.map((c: any) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-2xl bg-white/5 dark:bg-[#131b15] border border-line dark:border-white/5 flex items-center justify-between gap-3 group transition-all"
                        >
                          <Link
                            href={`/courses/${c.slug || c.id}`}
                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          >
                            <div className="relative aspect-video w-16 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-line">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={c.thumbnailUrl || "https://i.ytimg.com/vi/J9BI0jGOds8/hqdefault.jpg"}
                                alt={c.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-semibold text-ink group-hover:text-[#b8c460] transition-colors truncate">
                                {c.title}
                              </h4>
                              <p className="text-[0.7rem] text-ink-soft mt-0.5 truncate">
                                {c.author || "Mayank Aggarwal"} · {formatDuration(c.totalDurationSeconds || 3600)}
                              </p>
                            </div>
                          </Link>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Building status pill only when actively building or processing */}
                            {buildingStatus ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-[#232918] text-[#b8c460] text-[0.68rem] font-semibold flex items-center gap-1 font-mono">
                                <span>⟳</span>
                                <span>{buildingStatus}</span>
                              </span>
                            ) : c.status === "PROCESSING" ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-[#232918] text-[#b8c460] text-[0.68rem] font-semibold flex items-center gap-1 font-mono">
                                <span>⟳</span>
                                <span>Building</span>
                              </span>
                            ) : null}

                            {/* Remove Course Button */}
                            <button
                              onClick={() => handleRemoveCourse(stage.id, c.id)}
                              className="text-ink-soft hover:text-red-400 p-1 transition-colors cursor-pointer"
                              title="Remove course"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Course Intake Box inside the Stage */}
                  <form onSubmit={(e) => handleAddCourse(e, stage.id)}>
                    <div className="flex items-center gap-2 p-1.5 rounded-full border border-line dark:border-[#263528] bg-white dark:bg-[#161c18] shadow-inner focus-within:border-moss focus-within:ring-2 focus-within:ring-moss/20 transition-all">
                      <input
                        type="url"
                        value={courseUrl}
                        onChange={(e) => setCourseUrl(e.target.value)}
                        placeholder="Paste a YouTube video or playlist link"
                        className="w-full px-4 bg-transparent dark:bg-transparent text-xs sm:text-sm text-ink dark:text-white placeholder-ink-soft/60 outline-none border-none shadow-none"
                      />
                      <button
                        type="submit"
                        disabled={isAddingCourse}
                        className="shrink-0 px-4 py-2 rounded-full border border-line dark:border-white/10 bg-black/5 dark:bg-[#1b231c] text-xs font-semibold text-ink hover:bg-black/10 dark:hover:bg-white/10 transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <span>+</span>
                        <span>{isAddingCourse ? "Adding..." : "Add course"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              );
            })}

            {/* + Add a stage Button */}
            <div>
              <button
                onClick={handleAddStage}
                disabled={isAddingStage}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-line dark:border-white/10 bg-surface dark:bg-[#0c120e] text-xs sm:text-sm font-semibold text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors shadow-xs cursor-pointer"
              >
                <span className="font-bold">+</span>
                <span>{isAddingStage ? "Adding stage..." : "Add a stage"}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Roadmap Progress Stats Card + Creators Card */}
          <div className="space-y-4">
            {/* Lime Puzzle Notch Card */}
            <div className="relative bg-[#b8c460] text-[#0f1611] rounded-3xl p-6 overflow-hidden flex flex-col justify-between min-h-[150px] shadow-sm">
              <span className="text-[0.68rem] font-bold tracking-widest uppercase font-mono">
                ROADMAP PROGRESS
              </span>

              <div className="my-2">
                <h3 className="text-4xl sm:text-5xl font-display font-bold leading-none">
                  {overallProgress}%
                </h3>
              </div>

              <div className="text-[0.72rem] text-[#0f1611]/85 font-medium">
                {totalCoursesCount} of {totalCoursesCount} courses · stage 1 of {stages.length || 1}
              </div>

              {/* Puzzle notch cutouts */}
              <div className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
              <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
            </div>

            {/* Creators Card */}
            <div className="bg-surface dark:bg-[#0c120e] rounded-3xl border border-line dark:border-white/10 p-5 space-y-3 shadow-xs">
              <h4 className="text-[0.68rem] font-bold text-ink-soft uppercase tracking-wider font-mono">
                Creators
              </h4>

              {creators.length === 0 ? (
                <p className="text-xs text-ink-soft">No courses in this roadmap yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {creators.map((authorName) => (
                    <div key={authorName} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1e2b20] border border-[#b8c460]/40 flex items-center justify-center font-bold text-xs text-[#b8c460]">
                        {authorName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-ink leading-tight">
                          {authorName}
                        </p>
                        <p className="text-[0.68rem] text-ink-soft leading-tight">
                          {allCourses.filter((c: any) => (c.author || "Mayank Aggarwal") === authorName).length} course in this roadmap
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
