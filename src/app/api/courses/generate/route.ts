import { after, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  advanceCourseGenerationJob,
  initializeCourseGenerationJob,
} from "@/lib/ai/courseGenerator";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to generate courses." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { url, manualTranscript, difficulty, isPublic } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Please provide a valid YouTube URL." },
        { status: 400 }
      );
    }

    const result = await initializeCourseGenerationJob({
      url,
      userId: user.id,
      manualTranscript,
      difficulty: difficulty || "BEGINNER",
      isPublic: typeof isPublic === "boolean" ? isPublic : undefined,
    });

    if (!result.isExisting && result.jobId && result.status !== "COMPLETED") {
      const targetJobId = result.jobId;
      after(async () => {
        try {
          await advanceCourseGenerationJob(targetJobId, {
            maxSteps: 4,
            timeBudgetMs: 38_000,
          });
        } catch (bgErr) {
          console.error("Background generation advance error:", bgErr);
        }
      });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to initialize course build";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
