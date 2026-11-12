import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { runGenerationJobStep } from "@/lib/ai/courseGenerator";

export const maxDuration = 60;

export async function POST(
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
      select: { id: true, userId: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Generation job not found" }, { status: 404 });
    }

    if (job.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await runGenerationJobStep(jobId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to advance generation step";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

