import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Administrator role required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase().trim() || "";

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        profile: true,
        subscription: true,
        _count: {
          select: {
            coursesCreated: true,
            enrollments: true,
            studyNotes: true,
          },
        },
      },
    });

    const filtered = search
      ? users.filter(
          (u) =>
            u.email.toLowerCase().includes(search) ||
            (u.profile?.displayName && u.profile.displayName.toLowerCase().includes(search))
        )
      : users;

    const formatted = filtered.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      emailVerified: u.emailVerified,
      authProvider: u.authProvider || "email",
      displayName: u.profile?.displayName || u.email.split("@")[0],
      avatarUrl: u.profile?.avatarUrl,
      tier: u.subscription?.tier || "FREE",
      dailyStudyMinutes: u.profile?.dailyStudyMinutes || 60,
      streakDays: u.profile?.currentStreakDays || 0,
      coursesCreated: u._count.coursesCreated,
      coursesEnrolled: u._count.enrollments,
      notesCount: u._count.studyNotes,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ users: formatted });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Administrator role required." }, { status: 403 });
    }

    const body = await req.json();
    const { targetUserId, role, tier, streakDays, emailVerified } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId is required." }, { status: 400 });
    }

    // 1. Update Role and/or Verification if specified
    if (role || typeof emailVerified === "boolean") {
      if (role && !["USER", "ADMIN"].includes(role)) {
        return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
      }
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          ...(role ? { role } : {}),
          ...(typeof emailVerified === "boolean"
            ? {
                emailVerified,
                emailVerifiedAt: emailVerified ? new Date() : null,
              }
            : {}),
        },
      });
    }

    // 2. Update Subscription Tier if specified
    if (tier) {
      if (!["FREE", "PRO", "MAX"].includes(tier)) {
        return NextResponse.json({ error: "Invalid tier specified." }, { status: 400 });
      }
      await prisma.subscription.upsert({
        where: { userId: targetUserId },
        update: { tier },
        create: {
          userId: targetUserId,
          tier,
          status: "ACTIVE",
        },
      });
    }

    // 3. Update Streak Days if specified
    if (typeof streakDays === "number") {
      await prisma.profile.upsert({
        where: { userId: targetUserId },
        update: { currentStreakDays: Math.max(0, streakDays) },
        create: {
          userId: targetUserId,
          displayName: "Learner",
          currentStreakDays: Math.max(0, streakDays),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "User attributes updated successfully.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Administrator role required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    let targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      const body = await req.json().catch(() => null);
      if (body && typeof body.targetUserId === "string") {
        targetUserId = body.targetUserId;
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own active administrator account." },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    if (targetUser.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last remaining administrator account." },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(
      async (tx) => {
        const [userEnrollments, userRoadmapEnrollments] = await Promise.all([
          tx.enrollment.findMany({
            where: { userId: targetUserId },
            select: { courseId: true },
          }),
          tx.roadmapEnrollment.findMany({
            where: { userId: targetUserId },
            select: { roadmapId: true },
          }),
        ]);

        const enrolledCourseIds = Array.from(
          new Set(userEnrollments.map((e) => e.courseId))
        );
        const enrolledRoadmapIds = Array.from(
          new Set(userRoadmapEnrollments.map((e) => e.roadmapId))
        );

        if (enrolledCourseIds.length > 0) {
          await tx.course.updateMany({
            where: {
              id: { in: enrolledCourseIds },
              creatorId: { not: targetUserId },
              enrollmentCount: { gt: 0 },
            },
            data: { enrollmentCount: { decrement: 1 } },
          });
        }

        if (enrolledRoadmapIds.length > 0) {
          await tx.roadmap.updateMany({
            where: {
              id: { in: enrolledRoadmapIds },
              creatorId: { not: targetUserId },
              enrollmentCount: { gt: 0 },
            },
            data: { enrollmentCount: { decrement: 1 } },
          });
        }

        // Purge all user-owned records cleanly inside the atomic transaction
        // so zero orphaned enrollments, progress, notes, quizzes, or tokens remain.
        await tx.authVerificationToken.deleteMany({
          where: {
            email: { equals: targetUser.email, mode: "insensitive" },
          },
        });
        await tx.quizAnswer.deleteMany({ where: { userId: targetUserId } });
        await tx.quizAttempt.deleteMany({ where: { userId: targetUserId } });
        await tx.lessonWatchProgress.deleteMany({
          where: { userId: targetUserId },
        });
        await tx.studyNote.deleteMany({ where: { userId: targetUserId } });
        await tx.dailyPlan.deleteMany({ where: { userId: targetUserId } });
        await tx.notification.deleteMany({ where: { userId: targetUserId } });
        await tx.lessonProgress.deleteMany({
          where: { enrollment: { userId: targetUserId } },
        });
        await tx.placementAttempt.deleteMany({
          where: { enrollment: { userId: targetUserId } },
        });
        await tx.enrollment.deleteMany({ where: { userId: targetUserId } });
        await tx.roadmapEnrollment.deleteMany({
          where: { userId: targetUserId },
        });
        await tx.generationJob.deleteMany({ where: { userId: targetUserId } });
        await tx.roadmap.deleteMany({ where: { creatorId: targetUserId } });
        await tx.course.deleteMany({ where: { creatorId: targetUserId } });
        await tx.profile.deleteMany({ where: { userId: targetUserId } });
        await tx.subscription.deleteMany({ where: { userId: targetUserId } });
        await tx.user.delete({ where: { id: targetUserId } });
      },
      { maxWait: 10000, timeout: 20000 }
    );

    return NextResponse.json({
      success: true,
      deletedEmail: targetUser.email,
      message: `${targetUser.email} deleted permanently from database.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
