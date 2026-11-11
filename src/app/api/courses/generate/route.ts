import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateCourse } from "@/lib/ai/courseGenerator";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in to generate courses." }, { status: 401 });
    }

    const body = await req.json();
    const { url, manualTranscript, difficulty } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Please provide a valid YouTube URL." }, { status: 400 });
    }

    const result = await generateCourse({
      url,
      userId: user.id,
      manualTranscript,
      difficulty: difficulty || "BEGINNER",
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate course";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

