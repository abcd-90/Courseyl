import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { profile: { displayName: { contains: search } } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
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

    const formatted = users.map((u) => ({
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { targetUserId, role } = await req.json();

    if (!["USER", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

