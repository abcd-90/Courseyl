import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: lessonId, noteId } = await params;
    const body = await req.json();
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json({ error: "Note content cannot be empty." }, { status: 400 });
    }

    const note = await prisma.studyNote.findUnique({
      where: { id: noteId },
    });

    if (!note || note.lessonId !== lessonId) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this note" }, { status: 403 });
    }

    const updateData: { content: string; timestampSeconds?: number } = { content };
    if (body?.timestampSeconds !== undefined) {
      updateData.timestampSeconds = Math.max(0, Math.floor(Number(body.timestampSeconds) || 0));
    }

    const updated = await prisma.studyNote.update({
      where: { id: noteId },
      data: updateData,
    });

    return NextResponse.json({ success: true, note: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { noteId } = await params;

    const note = await prisma.studyNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this note" }, { status: 403 });
    }

    await prisma.studyNote.delete({
      where: { id: noteId },
    });

    return NextResponse.json({ success: true, message: "Note deleted." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

