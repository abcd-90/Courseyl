import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roadmap = await prisma.roadmap.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { stages: { orderBy: { stageIndex: "asc" } } },
    });

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    const nextIndex = roadmap.stages.length;
    const newStage = await prisma.roadmapStage.create({
      data: {
        roadmapId: roadmap.id,
        stageIndex: nextIndex,
        title: `Stage ${nextIndex + 1}`,
        description: "",
      },
    });

    return NextResponse.json({ success: true, stage: newStage });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { stageId } = body;

    if (!stageId) {
      return NextResponse.json({ error: "Stage ID is required" }, { status: 400 });
    }

    // Delete courses in stage first
    await prisma.roadmapCourse.deleteMany({
      where: { roadmapStageId: stageId },
    });

    // Delete stage
    await prisma.roadmapStage.delete({
      where: { id: stageId },
    });

    return NextResponse.json({ success: true, message: "Stage deleted" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

