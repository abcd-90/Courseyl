import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, lessonId } = await params;
    const { isSkipped } = await req.json();

    const course = await prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 400 });
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

