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
    const { targetUserId, role, tier, streakDays } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId is required." }, { status: 400 });
    }

    // 1. Update Role if specified
    if (role) {
      if (!["USER", "ADMIN"].includes(role)) {
        return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
      }
      await prisma.user.update({
        where: { id: targetUserId },
        data: { role },
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
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: "Cannot delete your own active administrator account." }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: targetUserId },
    });

    return NextResponse.json({ success: true, message: "User account deleted permanently." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
