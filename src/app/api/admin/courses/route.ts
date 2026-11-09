import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        creator: {
          select: { email: true, profile: { select: { displayName: true } } },
        },
        _count: {
          select: { chapters: true, enrollments: true },
        },
      },
    });

    const formatted = courses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      status: c.status,
      isPublic: c.isPublic,
      difficulty: c.difficulty,
      durationSeconds: c.totalDurationSeconds,
      enrollmentCount: c.enrollmentCount,
      creatorEmail: c.creator.email,
      creatorName: c.creator.profile?.displayName || c.creator.email,
      chapterCount: c._count.chapters,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({ courses: formatted });
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

    const { courseId, isPublic } = await req.json();

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: { isPublic },
    });

    return NextResponse.json({ success: true, course: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("id");

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required." }, { status: 400 });
    }

    await prisma.course.delete({
      where: { id: courseId },
    });

    return NextResponse.json({ success: true, message: "Course deleted successfully." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

