export const MIN_DAILY_STUDY_MINUTES = 5;
export const MAX_DAILY_STUDY_MINUTES = 480;
export const DEFAULT_DAILY_STUDY_MINUTES = 60;

export interface PacingLessonInput {
  id: string;
  title?: string;
  durationSeconds?: number | null;
  isCompleted?: boolean;
  isSkipped?: boolean;
  orderIndex?: number;
}

export interface PacingChapterInput<T extends PacingLessonInput = PacingLessonInput> {
  id?: string;
  title?: string;
  description?: string | null;
  orderIndex?: number;
  lessons?: T[];
}

export interface DayBin<T extends PacingLessonInput = PacingLessonInput> {
  dayNumber: number;
  label: string;
  title: string;
  lessons: Array<T & { originalChapterTitle?: string }>;
  totalDurationSeconds: number;
  activeDurationSeconds: number;
  completedCount: number;
  skippedCount: number;
}

/**
 * Clamp and normalize a user's daily study minutes target to the valid 5..480 window.
 */
export function clampDailyStudyMinutes(
  value: unknown,
  fallback: number = DEFAULT_DAILY_STUDY_MINUTES
): number {
  const num = typeof value === "string" ? Number(value.trim()) : Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return fallback;
  }
  return Math.max(
    MIN_DAILY_STUDY_MINUTES,
    Math.min(MAX_DAILY_STUDY_MINUTES, Math.round(num))
  );
}

/**
 * Validate whether an input is an explicit custom daily study goal within 5..480 minutes.
 */
export function isValidDailyStudyMinutes(value: unknown): boolean {
  const num = typeof value === "string" ? Number(value.trim()) : Number(value);
  return (
    Number.isFinite(num) &&
    num >= MIN_DAILY_STUDY_MINUTES &&
    num <= MAX_DAILY_STUDY_MINUTES
  );
}

/**
 * Estimate total study days given active video/lesson seconds and a daily study budget.
 */
export function estimatePacedDays(
  activeDurationSeconds: number,
  dailyStudyMinutes: number
): number {
  if (!Number.isFinite(activeDurationSeconds) || activeDurationSeconds <= 0) {
    return 1;
  }
  const budgetSeconds = clampDailyStudyMinutes(dailyStudyMinutes) * 60;
  return Math.max(1, Math.ceil(activeDurationSeconds / budgetSeconds));
}

/**
 * Pure runtime helper that dynamically packs canonical course chapters/lessons
 * into Day 1..Day N bins according to the user's dailyStudyMinutes without mutating
 * any Chapter records in PostgreSQL.
 */
export function groupLessonsIntoDayBins<T extends PacingLessonInput>(
  chapters: PacingChapterInput<T>[],
  dailyStudyMinutes: number,
  options?: { excludeSkipped?: boolean }
): DayBin<T>[] {
  const safeMinutes = clampDailyStudyMinutes(dailyStudyMinutes);
  const dailyBudgetSeconds = safeMinutes * 60;
  const excludeSkipped = options?.excludeSkipped ?? false;

  const flatLessons: Array<T & { originalChapterTitle?: string }> = [];
  for (const ch of chapters || []) {
    for (const lesson of ch.lessons || []) {
      if (excludeSkipped && lesson.isSkipped) continue;
      flatLessons.push({
        ...lesson,
        originalChapterTitle: ch.title,
      });
    }
  }

  if (flatLessons.length === 0) {
    return [];
  }

  const bins: DayBin<T>[] = [];
  let currentLessons: Array<T & { originalChapterTitle?: string }> = [];
  let currentActiveSeconds = 0;
  let currentTotalSeconds = 0;

  const flushBin = () => {
    if (currentLessons.length === 0) return;
    const dayNumber = bins.length + 1;
    const firstTitle = (currentLessons[0].title || "").replace(/^\d+\.\s*/, "").trim();
    const completedCount = currentLessons.filter((l) => l.isCompleted).length;
    const skippedCount = currentLessons.filter((l) => l.isSkipped).length;
    bins.push({
      dayNumber,
      label: `Day ${dayNumber}`,
      title: firstTitle ? `Day ${dayNumber} · ${firstTitle}` : `Day ${dayNumber}`,
      lessons: currentLessons,
      totalDurationSeconds: currentTotalSeconds,
      activeDurationSeconds: currentActiveSeconds,
      completedCount,
      skippedCount,
    });
    currentLessons = [];
    currentActiveSeconds = 0;
    currentTotalSeconds = 0;
  };

  for (const lesson of flatLessons) {
    const rawDuration =
      typeof lesson.durationSeconds === "number" && lesson.durationSeconds > 0
        ? lesson.durationSeconds
        : 600;
    const activeCost = lesson.isSkipped ? 0 : rawDuration;

    const wouldExceedBudget =
      currentLessons.length > 0 &&
      currentActiveSeconds > 0 &&
      activeCost > 0 &&
      currentActiveSeconds + activeCost > dailyBudgetSeconds * 1.15 &&
      currentActiveSeconds >= dailyBudgetSeconds * 0.65;

    if (wouldExceedBudget) {
      flushBin();
    }

    currentLessons.push(lesson);
    currentTotalSeconds += rawDuration;
    currentActiveSeconds += activeCost;
  }

  flushBin();
  return bins;
}

