import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const user = await getCurrentUser().catch(() => null);
    const { id, lessonId } = await params;
    const { isSkipped } = await req.json();

    if (!user) {
      // Allow guest to toggle skip without throwing error
      return NextResponse.json({ success: true, isSkipped: !!isSkipped, guest: true });
    }

    const course = await prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    let enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
    });

    if (!enrollment) {
      enrollment = await prisma.enrollment.create({
        data: {
          userId: user.id,
          courseId: course.id,
        },
      });
    }

    const progress = await prisma.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId,
        },
      },
      update: {
        isSkipped: !!isSkipped,
      },
      create: {
        enrollmentId: enrollment.id,
        lessonId,
        isSkipped: !!isSkipped,
        isCompleted: false,
      },
    });

    return NextResponse.json({ success: true, isSkipped: progress.isSkipped });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

