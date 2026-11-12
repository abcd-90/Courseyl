import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCleanThumbnailUrl } from "@/lib/thumbnail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const difficulty = searchParams.get("difficulty");
    const enrolledOnly = searchParams.get("enrolled") === "true";
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    const user = await getCurrentUser();

    // If user requested only their enrolled courses
    if (enrolledOnly) {
      if (!user) {
        return NextResponse.json({ courses: [], total: 0, page: 1, totalPages: 0 });
      }

      const enrollments = (await (prisma.enrollment as any).findMany({
        where: { userId: user.id },
        include: {
          course: {
            include: {
              creator: {
                select: {
                  profile: { select: { displayName: true, avatarUrl: true } },
                },
              },
              source: { select: { channelTitle: true, youtubeId: true } },
              chapters: {
                include: {
                  lessons: { select: { id: true, durationSeconds: true } },
                },
              },
            },
          },
          lessonProgress: {
            select: { lessonId: true, isCompleted: true, isSkipped: true },
          },
        },
        orderBy: { lastAccessedAt: "desc" },
      })) as any[];

      const enrolledCourseIds = new Set(
        enrollments.filter((e: any) => e.course).map((e: any) => e.course.id)
      );

      // Include user-created courses (e.g., private drafts) even if enrollment row is missing
      const createdCourses = (await prisma.course.findMany({
        where: {
          creatorId: user.id,
          status: { not: "FAILED" },
          id: { notIn: Array.from(enrolledCourseIds) },
        },
        include: {
          creator: {
            select: {
              profile: { select: { displayName: true, avatarUrl: true } },
            },
          },
          source: { select: { channelTitle: true, youtubeId: true } },
          chapters: {
            include: {
              lessons: { select: { id: true, durationSeconds: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })) as any[];

      const combinedRows = [
        ...enrollments
          .filter((e: any) => e.course && e.course.status !== "FAILED")
          .map((e: any) => ({
            course: e.course,
            lessonProgress: Array.isArray(e.lessonProgress) ? e.lessonProgress : [],
            completedLessonsCount: e.completedLessonsCount || 0,
            progressPercentage: e.progressPercentage || 0,
          })),
        ...createdCourses.map((c: any) => ({
          course: c,
          lessonProgress: [],
          completedLessonsCount: 0,
          progressPercentage: 0,
        })),
      ];

      const formatted = combinedRows.map((e: any) => {
        const c = e.course;
        const courseLessonIds = new Set<string>();
        if (Array.isArray(c.chapters)) {
          c.chapters.forEach((ch: any) => {
            if (Array.isArray(ch.lessons)) {
              ch.lessons.forEach((l: any) => courseLessonIds.add(l.id));
            }
          });
        }

        const lessonCount = courseLessonIds.size;
        const progressList: any[] = e.lessonProgress;
        const completedLessonsCount =
          progressList.length > 0
            ? progressList.filter(
                (p) => p.isCompleted && courseLessonIds.has(p.lessonId)
              ).length
            : e.completedLessonsCount || 0;
        const skippedLessonsCount = progressList.filter(
          (p) => p.isSkipped && courseLessonIds.has(p.lessonId)
        ).length;
        const activeLessonsCount = Math.max(1, lessonCount - skippedLessonsCount);
        const progressPercentage =
          progressList.length > 0 && lessonCount > 0
            ? Math.min(100, Math.round((completedLessonsCount / activeLessonsCount) * 100))
            : Math.round(e.progressPercentage || 0);

        return {
          id: c.id,
          title: c.title,
          slug: c.slug,
          description: c.description,
          difficulty: c.difficulty,
          isPublic: c.isPublic,
          isCreator: c.creatorId === user.id,
          thumbnailUrl: getCleanThumbnailUrl(c.thumbnailUrl, c.slug, c.source?.youtubeId),
          youtubeId: c.source?.youtubeId || null,
          totalDurationSeconds: c.totalDurationSeconds,
          estimatedStudyMinutes: c.estimatedStudyMinutes,
          enrollmentCount: c.enrollmentCount,
          creatorName: c.creator?.profile?.displayName || "Creator",
          creator: c.source?.channelTitle || c.creator?.profile?.displayName || "Instructor",
          duration: `${Math.floor(c.totalDurationSeconds / 3600)}h ${Math.floor((c.totalDurationSeconds % 3600) / 60)}m`,
          lessonCount,
          completedLessonsCount,
          skippedLessonsCount,
          chapterCount: c.chapters?.length || 0,
          progressPercentage,
          createdAt: c.createdAt,
        };
      });

      return NextResponse.json({
        courses: formatted,
        total: formatted.length,
        page: 1,
        totalPages: 1,
      });
    }

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

    const [courses, total, roadmapsCount] = await Promise.all([
      prisma.course.findMany({
        where,
        take: limit,
        skip,
        orderBy: [{ createdAt: "desc" }, { enrollmentCount: "desc" }],
        include: {
          creator: {
            select: {
              email: true,
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
      prisma.roadmap.count().catch(() => 1),
    ]);

    const inferTags = (title: string, desc: string, difficulty: string) => {
      const combined = `${title} ${desc}`.toLowerCase();
      const tags: string[] = [];
      if (combined.includes("python") || combined.includes("javascript") || combined.includes("coding") || combined.includes("programming") || combined.includes("c language") || combined.includes("backend")) {
        tags.push("Programming");
      }
      if (combined.includes("ai") || combined.includes("llm") || combined.includes("agent") || combined.includes("langchain") || combined.includes("gpt") || combined.includes("data")) {
        tags.push("AI & data");
      }
      if (combined.includes("web") || combined.includes("react") || combined.includes("full-stack") || combined.includes("frontend") || combined.includes("fastapi")) {
        tags.push("Web development");
      }
      if (combined.includes("cloud") || combined.includes("docker") || combined.includes("redis") || combined.includes("devops") || combined.includes("kubernetes")) {
        tags.push("Cloud & DevOps");
      }
      if (combined.includes("security") || combined.includes("ethical hacking") || combined.includes("cyber")) {
        tags.push("Cybersecurity");
      }
      if (combined.includes("system design") || combined.includes("database") || combined.includes("sql") || combined.includes("algorithms") || combined.includes("cs50")) {
        tags.push("CS fundamentals");
      }
      if (combined.includes("excel") || combined.includes("business") || combined.includes("finance") || combined.includes("marketing")) {
        tags.push("Business & marketing");
      }
      if (tags.length === 0) {
        tags.push("Programming");
        tags.push(difficulty === "ADVANCED" ? "Advanced" : "General");
      }
      return tags.slice(0, 2);
    };

    const formatted = courses.map((c) => {
      let lessonCount = 0;
      c.chapters.forEach((ch) => {
        lessonCount += ch.lessons.length;
      });

      const tags = inferTags(c.title, c.description || "", c.difficulty);

      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        difficulty: c.difficulty,
        thumbnailUrl: getCleanThumbnailUrl(c.thumbnailUrl, c.slug, c.source?.youtubeId),
        totalDurationSeconds: c.totalDurationSeconds,
        estimatedStudyMinutes: c.estimatedStudyMinutes,
        enrollmentCount: c.enrollmentCount || 1,
        creatorName:
          c.creator?.profile?.displayName ||
          (c.creator?.email ? c.creator.email.split("@")[0] : "") ||
          "Creator",
        creator: c.source?.channelTitle || c.creator?.profile?.displayName || "Instructor",
        duration: `${Math.floor(c.totalDurationSeconds / 3600)}h ${String(Math.floor((c.totalDurationSeconds % 3600) / 60)).padStart(2, "0")}m`,
        lessonCount,
        chapterCount: c.chapters.length,
        tags,
        createdAt: c.createdAt,
      };
    });

    return NextResponse.json({
      courses: formatted,
      total,
      roadmapsCount: roadmapsCount || 1,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

