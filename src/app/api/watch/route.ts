import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { mergeWatchRanges } from "@/lib/watchRanges";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawText = await req.text();
    let body: any = {};
    try {
      body = rawText ? JSON.parse(rawText) : {};
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const lessonId = typeof body?.lessonId === "string" ? body.lessonId.trim() : "";
    const seconds = body?.seconds;
    const rawLastSecond = Number(body?.lastSecond ?? 0);

    if (!lessonId) {
      return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        durationSeconds: true,
        startSeconds: true,
        endSeconds: true,
        chapter: {
          select: { courseId: true },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const lessonDuration =
      lesson.durationSeconds > 0
        ? lesson.durationSeconds
        : Math.max(1, lesson.endSeconds - lesson.startSeconds);

    const existing = await prisma.lessonWatchProgress.findUnique({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId: lesson.id,
        },
      },
    });

    const fallbackLast = Number.isFinite(rawLastSecond)
      ? Math.max(0, Math.floor(rawLastSecond))
      : existing?.lastSecond ?? 0;

    const merged = mergeWatchRanges(
      existing?.watchedRanges,
      seconds,
      lessonDuration,
      fallbackLast
    );

    const finalWatchedSeconds = Math.max(
      existing?.watchedSeconds ?? 0,
      merged.totalWatchedSeconds
    );
    const completionThreshold = Math.min(
      lessonDuration,
      Math.max(10, Math.floor(lessonDuration * 0.8))
    );
    const isWatched = Boolean(existing?.watched) || finalWatchedSeconds >= completionThreshold;
    const finalLastSecond =
      merged.lastSecond > 0 ? merged.lastSecond : existing?.lastSecond ?? 0;

    const updated = await prisma.lessonWatchProgress.upsert({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId: lesson.id,
        },
      },
      update: {
        watchedSeconds: finalWatchedSeconds,
        watched: isWatched,
        lastSecond: finalLastSecond,
        watchedRanges: merged.rangesJson,
      },
      create: {
        userId: user.id,
        lessonId: lesson.id,
        watchedSeconds: finalWatchedSeconds,
        watched: isWatched,
        lastSecond: finalLastSecond,
        watchedRanges: merged.rangesJson,
      },
    });

    // Sync resume timestamp safely if user is enrolled, without altering completion state
    if (finalLastSecond > 0) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: lesson.chapter.courseId,
          },
        },
        select: { id: true },
      });

      if (enrollment) {
        const absoluteSecond = lesson.startSeconds + finalLastSecond;
        await prisma.lessonProgress
          .upsert({
            where: {
              enrollmentId_lessonId: {
                enrollmentId: enrollment.id,
                lessonId: lesson.id,
              },
            },
            update: {
              lastPlaybackSeconds: absoluteSecond,
            },
            create: {
              enrollmentId: enrollment.id,
              lessonId: lesson.id,
              lastPlaybackSeconds: absoluteSecond,
            },
          })
          .catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      lessonId: lesson.id,
      watchedSeconds: updated.watchedSeconds,
      watched: updated.watched,
      lastSecond: updated.lastSecond,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

