import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDuration } from "@/lib/youtube";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notes = await prisma.studyNote.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            chapter: {
              select: {
                course: {
                  select: { id: true, title: true, slug: true, thumbnailUrl: true },
                },
              },
            },
          },
        },
      },
    });

    const formatted = notes.map((n) => ({
      id: n.id,
      content: n.content,
      timestampSeconds: n.timestampSeconds,
      timestampFormatted: formatDuration(n.timestampSeconds),
      createdAt: n.createdAt,
      lessonId: n.lesson.id,
      lessonTitle: n.lesson.title,
      courseId: n.lesson.chapter.course.id,
      courseSlug: n.lesson.chapter.course.slug,
      courseTitle: n.lesson.chapter.course.title,
      courseThumbnail: n.lesson.chapter.course.thumbnailUrl,
    }));

    return NextResponse.json({ notes: formatted });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

