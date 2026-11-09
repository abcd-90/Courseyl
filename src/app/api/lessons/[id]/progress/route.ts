import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const isCompleted = body.isCompleted !== undefined ? body.isCompleted : body.completed;
    const lastPlaybackSeconds = body.lastPlaybackSeconds;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        chapter: {
          include: {
            course: {
              include: {
                chapters: {
                  include: {
                    lessons: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const course = lesson.chapter.course;

    const enrollment = await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
      update: {
        lastAccessedAt: new Date(),
      },
      create: {
        userId: user.id,
        courseId: course.id,
      },
    });

    // Update lesson progress
    const updatedProgress = await prisma.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
        },
      },
      update: {
        isCompleted: isCompleted !== undefined ? isCompleted : undefined,
        lastPlaybackSeconds: lastPlaybackSeconds !== undefined ? lastPlaybackSeconds : undefined,
        completedAt: isCompleted ? new Date() : undefined,
      },
      create: {
        enrollmentId: enrollment.id,
        lessonId: lesson.id,
        isCompleted: !!isCompleted,
        lastPlaybackSeconds: lastPlaybackSeconds || lesson.startSeconds,
        completedAt: isCompleted ? new Date() : null,
      },
    });

    // Recalculate enrollment progress
    const allCourseProgress = await prisma.lessonProgress.findMany({
      where: { enrollmentId: enrollment.id },
    });

    let totalLessonsCount = 0;
    course.chapters.forEach((ch) => {
      totalLessonsCount += ch.lessons.length;
    });

    const completedCount = allCourseProgress.filter((p) => p.isCompleted).length;
    const skippedCount = allCourseProgress.filter((p) => p.isSkipped).length;
    const activeLessonsCount = Math.max(1, totalLessonsCount - skippedCount);
    const progressPercentage = Math.min(100, Math.round((completedCount / activeLessonsCount) * 100));

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        completedLessonsCount: completedCount,
        progressPercentage,
      },
    });

    // Update user daily study time & streak if lesson was completed
    if (isCompleted) {
      const todayStr = new Date().toISOString().split("T")[0];
      const lessonMinutes = Math.max(5, Math.ceil(lesson.durationSeconds / 60));

      const dailyPlan = await prisma.dailyPlan.upsert({
        where: {
          userId_planDate: {
            userId: user.id,
            planDate: todayStr,
          },
        },
        update: {
          completedMinutes: { increment: lessonMinutes },
        },
        create: {
          userId: user.id,
          planDate: todayStr,
          targetMinutes: user.profile?.dailyStudyMinutes || 60,
          completedMinutes: lessonMinutes,
        },
      });

      const goalMet = dailyPlan.completedMinutes >= dailyPlan.targetMinutes;
      if (goalMet && !dailyPlan.isGoalAchieved) {
        await prisma.dailyPlan.update({
          where: { id: dailyPlan.id },
          data: { isGoalAchieved: true },
        });

        // Increment user streak
        if (user.profile) {
          await prisma.profile.update({
            where: { id: user.profile.id },
            data: {
              currentStreakDays: { increment: 1 },
              lastStudyDate: new Date(),
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      progress: updatedProgress,
      courseProgressPercentage: progressPercentage,
      completedLessonsCount: completedCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

