import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatGenerationJobPayload } from "@/lib/ai/courseGenerator";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;

    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      include: {
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            thumbnailUrl: true,
            totalDurationSeconds: true,
            difficulty: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Generation job not found" }, { status: 404 });
    }

    if (job.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      job: formatGenerationJobPayload(job),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load generation job";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

