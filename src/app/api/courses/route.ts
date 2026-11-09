import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const difficulty = searchParams.get("difficulty");
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    const where: any = {
      isPublic: true,
      status: "READY",
    };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (difficulty && ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(difficulty.toUpperCase())) {
      where.difficulty = difficulty.toUpperCase();
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        take: limit,
        skip,
        orderBy: { enrollmentCount: "desc" },
        include: {
          creator: {
            select: {
              profile: {
                select: { displayName: true, avatarUrl: true },
              },
            },
          },
          source: {
            select: {
              channelTitle: true,
              youtubeId: true,
            },
          },
          chapters: {
            include: {
              lessons: {
                select: { id: true, durationSeconds: true },
              },
            },
          },
        },
      }),
      prisma.course.count({ where }),
    ]);

    const formatted = courses.map((c) => {
      let lessonCount = 0;
      c.chapters.forEach((ch) => {
        lessonCount += ch.lessons.length;
      });

      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        difficulty: c.difficulty,
        thumbnailUrl: c.thumbnailUrl,
        totalDurationSeconds: c.totalDurationSeconds,
        estimatedStudyMinutes: c.estimatedStudyMinutes,
        enrollmentCount: c.enrollmentCount,
        creatorName: c.creator?.profile?.displayName || "CourseIt Creator",
        creator: c.source?.channelTitle || c.creator?.profile?.displayName || "Instructor",
        duration: `${Math.floor(c.totalDurationSeconds / 3600)}h ${Math.floor((c.totalDurationSeconds % 3600) / 60)}m`,
        lessonCount,
        chapterCount: c.chapters.length,
        createdAt: c.createdAt,
      };
    });

    return NextResponse.json({
      courses: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

