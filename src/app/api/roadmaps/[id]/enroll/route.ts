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

    const roadmap = await prisma.roadmap.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        stages: {
          include: {
            courses: true,
          },
        },
      },
    });

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    const enrollment = await prisma.roadmapEnrollment.upsert({
      where: {
        userId_roadmapId: {
          userId: user.id,
          roadmapId: roadmap.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roadmapId: roadmap.id,
        progressPercentage: 0,
      },
    });

    // Also enroll user in all courses within the roadmap
    for (const stage of roadmap.stages) {
      for (const sc of stage.courses) {
        await prisma.enrollment.upsert({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: sc.courseId,
            },
          },
          update: {},
          create: {
            userId: user.id,
            courseId: sc.courseId,
          },
        });
      }
    }

    await prisma.roadmap.update({
      where: { id: roadmap.id },
      data: { enrollmentCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true, enrollment });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

