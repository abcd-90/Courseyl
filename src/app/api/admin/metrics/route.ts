import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Administrator access required." }, { status: 403 });
    }

    const [
      totalUsers,
      totalCourses,
      totalLessons,
      totalEnrollments,
      totalJobs,
      completedJobs,
      proSubscribers,
      courses,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.lesson.count(),
      prisma.enrollment.count(),
      prisma.generationJob.count(),
      prisma.generationJob.count({ where: { status: "COMPLETED" } }),
      prisma.subscription.count({ where: { tier: { in: ["PRO", "MAX"] } } }),
      prisma.course.findMany({ select: { totalDurationSeconds: true } }),
    ]);

    const totalSeconds = courses.reduce((acc, c) => acc + c.totalDurationSeconds, 0);
    const totalLearningHours = Math.round((totalSeconds / 3600) * 10) / 10;
    const aiSuccessRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 100;

    return NextResponse.json({
      metrics: {
        totalUsers,
        totalCourses,
        totalLessons,
        totalEnrollments,
        totalLearningHours,
        proSubscribers,
        totalJobs,
        completedJobs,
        aiSuccessRate,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

