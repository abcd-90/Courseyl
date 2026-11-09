import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notes = await prisma.studyNote.findMany({
      where: {
        userId: user.id,
        lessonId: id,
      },
      orderBy: { timestampSeconds: "asc" },
    });

    return NextResponse.json({ notes });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

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
    const reqBody = await req.json();
    const content = reqBody.content;
    const timestampSeconds = reqBody.timestampSeconds !== undefined ? reqBody.timestampSeconds : reqBody.timestamp;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Note content cannot be empty." }, { status: 400 });
    }

    const note = await prisma.studyNote.create({
      data: {
        userId: user.id,
        lessonId: id,
        timestampSeconds: Math.max(0, Math.floor(timestampSeconds || 0)),
        content: content.trim(),
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

