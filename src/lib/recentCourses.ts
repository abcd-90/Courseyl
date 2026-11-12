export const RECENT_COURSES_STORAGE_KEY = "courseit_recent_courses";

export interface RecentCourseEntry {
  id: string;
  slug: string;
  title: string;
  thumbnail: string;
  thumbnailUrl: string;
  progress: number;
}

interface ScopedRecentCoursesPayload {
  userId: string;
  items: RecentCourseEntry[];
}

export function clearRecentCourses(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RECENT_COURSES_STORAGE_KEY);
  } catch {}
}

export function readRecentCourses(userId?: string | null): RecentCourseEntry[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = window.localStorage.getItem(RECENT_COURSES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;

    // Reject legacy unscoped arrays or entries belonging to another / deleted userId.
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      (parsed as ScopedRecentCoursesPayload).userId !== userId ||
      !Array.isArray((parsed as ScopedRecentCoursesPayload).items)
    ) {
      clearRecentCourses();
      return [];
    }

    return (parsed as ScopedRecentCoursesPayload).items;
  } catch {
    clearRecentCourses();
    return [];
  }
}

export function writeRecentCourses(
  userId: string | null | undefined,
  items: RecentCourseEntry[]
): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    const payload: ScopedRecentCoursesPayload = {
      userId,
      items: items.slice(0, 5),
    };
    window.localStorage.setItem(
      RECENT_COURSES_STORAGE_KEY,
      JSON.stringify(payload)
    );
  } catch {}
}

export function recordRecentCourse(
  userId: string | null | undefined,
  entry: RecentCourseEntry
): RecentCourseEntry[] {
  if (typeof window === "undefined" || !userId) return [];
  const existing = readRecentCourses(userId);
  const updated = [
    entry,
    ...existing.filter((r) => r.slug !== entry.slug && r.id !== entry.id),
  ].slice(0, 5);
  writeRecentCourses(userId, updated);
  return updated;
}

