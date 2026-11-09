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
      return NextResponse.json({ error: "Unauthorized. Please log in to enroll." }, { status: 401 });
    }

    const { id } = await params;

    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

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

    await prisma.course.update({
      where: { id: course.id },
      data: { enrollmentCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true, enrollment });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

