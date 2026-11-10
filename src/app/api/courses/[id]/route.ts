import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const courseIncludes = {
      creator: {
        select: {
          email: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      },
      source: true,
      chapters: {
        orderBy: { orderIndex: "asc" as const },
        include: {
          lessons: {
            orderBy: { orderIndex: "asc" as const },
            select: {
              id: true,
              orderIndex: true,
              title: true,
              description: true,
              summary: true,
              durationSeconds: true,
              startSeconds: true,
              endSeconds: true,
              status: true,
            },
          },
        },
      },
      placementQuestions: {
        select: { id: true },
      },
    };

    // 1. Query course by exact id or slug
    let course = await prisma.course.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: courseIncludes,
    });

    // 2. If no exact match, try smart prefix or keyword match on slug
    if (!course) {
      course = await prisma.course.findFirst({
        where: {
          OR: [
            { slug: { startsWith: id } },
            { slug: { contains: id } },
          ],
        },
        include: courseIncludes,
      });
    }

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    let enrollment = null;
    let lessonProgressMap: Record<string, { isCompleted: boolean; isSkipped: boolean; lastPlaybackSeconds: number }> = {};
    let placementAttempt = null;

    if (user) {
      enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: course.id,
          },
        },
        include: {
          lessonProgress: true,
          placementAttempts: {
            orderBy: { completedAt: "desc" },
            take: 1,
          },
        },
      });

      if (enrollment) {
        placementAttempt = enrollment.placementAttempts[0] || null;
        enrollment.lessonProgress.forEach((lp) => {
          lessonProgressMap[lp.lessonId] = {
            isCompleted: lp.isCompleted,
            isSkipped: lp.isSkipped,
            lastPlaybackSeconds: lp.lastPlaybackSeconds,
          };
        });
      }
    }

    let totalLessons = 0;
    let completedLessons = 0;
    let skippedLessons = 0;
    let activeDurationSeconds = 0;

    const formattedChapters = course.chapters.map((ch) => {
      const lessons = ch.lessons.map((l) => {
        totalLessons++;
        const prog = lessonProgressMap[l.id];
        const isCompleted = prog?.isCompleted ?? false;
        const isSkipped = prog?.isSkipped ?? false;

        if (isCompleted) completedLessons++;
        if (isSkipped) skippedLessons++;
        if (!isSkipped) activeDurationSeconds += l.durationSeconds;

        return {
          ...l,
          description: l.description || l.summary || "",
          summary: l.summary || l.description || "",
          isCompleted,
          isSkipped,
          lastPlaybackSeconds: prog?.lastPlaybackSeconds ?? 0,
        };
      });

      return {
        ...ch,
        lessons,
      };
    });

    const activeLessons = Math.max(1, totalLessons - skippedLessons);
    const progressPercentage = enrollment
      ? Math.round((completedLessons / activeLessons) * 100)
      : 0;

    return NextResponse.json({
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        targetAudience: course.targetAudience,
        difficulty: course.difficulty,
        thumbnailUrl: course.thumbnailUrl,
        totalDurationSeconds: course.totalDurationSeconds,
        activeDurationSeconds,
        estimatedStudyMinutes: Math.ceil(activeDurationSeconds / 60),
        status: course.status,
        isPublic: course.isPublic,
        enrollmentCount: course.enrollmentCount,
        creatorName:
          course.creator?.profile?.displayName ||
          (course.creator?.email ? course.creator.email.split("@")[0] : "") ||
          "Sheikhsami3082",
        source: course.source
          ? {
              channelTitle: course.source.channelTitle,
              youtubeId: course.source.youtubeId,
            }
          : null,
        channelTitle:
          course.source?.channelTitle ||
          course.creator?.profile?.displayName ||
          "CodeWithHarry",
        hasPlacementTest: course.placementQuestions.length > 0,
        chapters: formattedChapters,
      },
      userState: {
        isEnrolled: !!enrollment,
        enrollmentId: enrollment?.id,
        progressPercentage,
        completedLessons,
        skippedLessons,
        totalLessons,
        hasCompletedPlacementTest: !!placementAttempt,
        placementScore: placementAttempt?.scorePercentage ?? null,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

