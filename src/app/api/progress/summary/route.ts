import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoDateStr = weekAgo.toISOString().split("T")[0];

    const [recentProgress, recentWatchProgress, recentPlans, quizAttempts] = await Promise.all([
      prisma.lessonProgress.findMany({
        where: {
          enrollment: { userId: user.id },
          OR: [
            { completedAt: { gte: weekAgo } },
            { updatedAt: { gte: weekAgo } },
          ],
        },
        include: {
          lesson: {
            select: {
              id: true,
              startSeconds: true,
              durationSeconds: true,
            },
          },
        },
      }),
      prisma.lessonWatchProgress.findMany({
        where: {
          userId: user.id,
          updatedAt: { gte: weekAgo },
        },
        select: {
          lessonId: true,
          watchedSeconds: true,
        },
      }),
      prisma.dailyPlan.findMany({
        where: {
          userId: user.id,
          planDate: { gte: weekAgoDateStr },
        },
      }),
      prisma.quizAttempt.findMany({
        where: { userId: user.id },
        orderBy: { attemptedAt: "desc" },
        select: {
          lessonId: true,
          scorePercentage: true,
          totalQuestions: true,
          correctQuestions: true,
          attemptedAt: true,
        },
      }),
    ]);

    let lessonsThisWeek = 0;
    const perLessonWatchedSeconds = new Map<string, number>();

    for (const lp of recentProgress) {
      const completedInWindow =
        lp.isCompleted &&
        ((lp.completedAt && lp.completedAt >= weekAgo) ||
          (!lp.completedAt && lp.updatedAt >= weekAgo));

      if (completedInWindow) {
        lessonsThisWeek++;
        const prev = perLessonWatchedSeconds.get(lp.lesson.id) ?? 0;
        perLessonWatchedSeconds.set(
          lp.lesson.id,
          Math.max(prev, Math.max(0, lp.lesson.durationSeconds || 0))
        );
      } else if (
        !lp.isCompleted &&
        lp.lesson.durationSeconds > 0 &&
        lp.lastPlaybackSeconds > lp.lesson.startSeconds
      ) {
        const watchedDelta = lp.lastPlaybackSeconds - lp.lesson.startSeconds;
        const clamped = Math.min(
          lp.lesson.durationSeconds,
          Math.max(0, watchedDelta)
        );
        const prev = perLessonWatchedSeconds.get(lp.lesson.id) ?? 0;
        perLessonWatchedSeconds.set(lp.lesson.id, Math.max(prev, clamped));
      }
    }

    for (const wp of recentWatchProgress) {
      const prev = perLessonWatchedSeconds.get(wp.lessonId) ?? 0;
      perLessonWatchedSeconds.set(
        wp.lessonId,
        Math.max(prev, Math.max(0, wp.watchedSeconds || 0))
      );
    }

    let lessonProgressSecondsThisWeek = 0;
    for (const secs of perLessonWatchedSeconds.values()) {
      lessonProgressSecondsThisWeek += secs;
    }

    const dailyPlanMinutesThisWeek = recentPlans.reduce(
      (sum, plan) => sum + (plan.completedMinutes || 0),
      0
    );
    const lessonProgressMinutesThisWeek = Math.round(
      lessonProgressSecondsThisWeek / 60
    );
    const watchedMinutesThisWeek = Math.max(
      dailyPlanMinutesThisWeek,
      lessonProgressMinutesThisWeek
    );

    // Average across the user's most recent attempt per lesson
    let quizScorePercentage: number | null = null;
    const latestPerLesson = new Map<string, number>();
    for (const attempt of quizAttempts) {
      if (!latestPerLesson.has(attempt.lessonId)) {
        latestPerLesson.set(attempt.lessonId, attempt.scorePercentage);
      }
    }
    if (latestPerLesson.size > 0) {
      const scores = Array.from(latestPerLesson.values());
      quizScorePercentage = Math.round(
        scores.reduce((sum, s) => sum + s, 0) / scores.length
      );
    }

    return NextResponse.json({
      streakDays: user.profile?.currentStreakDays ?? 0,
      lessonsThisWeek,
      quizScorePercentage,
      quizLessonsAttempted: latestPerLesson.size,
      watchedMinutesThisWeek,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

