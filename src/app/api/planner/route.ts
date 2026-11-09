import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const targetMinutes = user.profile?.dailyStudyMinutes || 60;

    const todayPlan = await prisma.dailyPlan.upsert({
      where: {
        userId_planDate: {
          userId: user.id,
          planDate: todayStr,
        },
      },
      update: {},
      create: {
        userId: user.id,
        planDate: todayStr,
        targetMinutes,
        completedMinutes: 0,
        isGoalAchieved: false,
      },
    });

    // Fetch user's active enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            chapters: {
              orderBy: { orderIndex: "asc" },
              include: {
                lessons: {
                  orderBy: { orderIndex: "asc" },
                },
              },
            },
          },
        },
        lessonProgress: true,
      },
      orderBy: { lastAccessedAt: "desc" },
    });

    // Build list of upcoming scheduled lessons
    const scheduledTasks: any[] = [];
    let allocatedMinutesToday = 0;

    for (const enr of enrollments) {
      const progressMap = new Map(
        enr.lessonProgress.map((p) => [p.lessonId, p])
      );

      for (const chapter of enr.course.chapters) {
        for (const lesson of chapter.lessons) {
          const prog = progressMap.get(lesson.id);
          const isCompleted = prog?.isCompleted ?? false;
          const isSkipped = prog?.isSkipped ?? false;

          if (!isCompleted && !isSkipped) {
            const lessonEstMinutes = Math.max(5, Math.ceil(lesson.durationSeconds / 60));
            const isToday = allocatedMinutesToday + lessonEstMinutes <= targetMinutes * 1.5;

            scheduledTasks.push({
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              durationSeconds: lesson.durationSeconds,
              durationMinutes: lessonEstMinutes,
              courseId: enr.course.id,
              courseSlug: enr.course.slug,
              courseTitle: enr.course.title,
              courseThumbnail: enr.course.thumbnailUrl,
              chapterTitle: chapter.title,
              isToday,
            });

            if (isToday) {
              allocatedMinutesToday += lessonEstMinutes;
            }
          }
        }
      }
    }

    return NextResponse.json({
      targetMinutes,
      completedMinutes: todayPlan.completedMinutes,
      isGoalAchieved: todayPlan.isGoalAchieved,
      currentStreakDays: user.profile?.currentStreakDays || 0,
      todayTasks: scheduledTasks.filter((t) => t.isToday),
      upcomingTasks: scheduledTasks.filter((t) => !t.isToday).slice(0, 10),
      totalPendingTasks: scheduledTasks.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dailyStudyMinutes } = await req.json();
    const validMinutes = [30, 60, 90, 120];

    if (!validMinutes.includes(dailyStudyMinutes)) {
      return NextResponse.json(
        { error: "Daily study duration must be 30, 60, 90, or 120 minutes." },
        { status: 400 }
      );
    }

    if (user.profile) {
      await prisma.profile.update({
        where: { id: user.profile.id },
        data: { dailyStudyMinutes },
      });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    await prisma.dailyPlan.upsert({
      where: {
        userId_planDate: {
          userId: user.id,
          planDate: todayStr,
        },
      },
      update: { targetMinutes: dailyStudyMinutes },
      create: {
        userId: user.id,
        planDate: todayStr,
        targetMinutes: dailyStudyMinutes,
        completedMinutes: 0,
      },
    });

    return NextResponse.json({
      success: true,
      dailyStudyMinutes,
      message: `Daily study goal updated to ${dailyStudyMinutes} minutes.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

