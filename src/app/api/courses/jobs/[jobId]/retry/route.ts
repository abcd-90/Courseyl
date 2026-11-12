import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  advanceCourseGenerationJob,
  retryCourseGenerationJob,
} from "@/lib/ai/courseGenerator";

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
    const existing = await prisma.generationJob.findUnique({
      where: { id: jobId },
      select: { id: true, userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Generation job not found" }, { status: 404 });
    }

    if (existing.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const retryResult = await retryCourseGenerationJob(jobId);

    if (retryResult.job.status !== "COMPLETED") {
      after(async () => {
        try {
          await advanceCourseGenerationJob(jobId, {
            maxSteps: 4,
            timeBudgetMs: 38_000,
          });
        } catch (bgErr) {
          console.error("Background retry advance error:", bgErr);
        }
      });
    }

    return NextResponse.json({
      success: true,
      resumedFromStep: retryResult.resumedFromStep,
      job: retryResult.job,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to retry generation job";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

