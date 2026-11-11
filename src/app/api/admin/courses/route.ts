import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { generateCourse } from "@/lib/ai/courseGenerator";
import { synthesizeLessonQuizQuestions } from "@/lib/ai/quizGenerator";
import { getCleanThumbnailUrl } from "@/lib/thumbnail";
import { parseYouTubeUrl } from "@/lib/youtube";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VERIFIED_DEMO_VIDEOS = [
  "3iFMc6ELt7k",
  "nLRL_NcnK-4",
  "m8Icp_Cid5o",
  "ygXn5nV5qFc",
  "eynUbHweaQM",
];

function slugifySafe(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "course"
  );
}

async function resolveCuratorUserId(addedByName: string | undefined, fallbackUserId: string): Promise<string> {
  const cleanName = (addedByName || "").trim();
  if (!cleanName) return fallbackUserId;

  const emailSlug = slugifySafe(cleanName);
  const curatorEmail = `curator.${emailSlug}@courseyl.local`;

  const existing = await prisma.user.findUnique({
    where: { email: curatorEmail },
    include: { profile: true },
  });

  if (existing) {
    if (existing.profile?.displayName !== cleanName) {
      await prisma.profile.upsert({
        where: { userId: existing.id },
        update: { displayName: cleanName },
        create: {
          userId: existing.id,
          displayName: cleanName,
          dailyStudyMinutes: 60,
          currentStreakDays: 1,
        },
      });
    }
    return existing.id;
  }

  const passwordHash = await hashPassword(`curator-${Date.now()}-${Math.random()}`);
  const created = await prisma.user.create({
    data: {
      email: curatorEmail,
      passwordHash,
      role: "USER",
      profile: {
        create: {
          displayName: cleanName,
          dailyStudyMinutes: 60,
          currentStreakDays: 1,
          lastStudyDate: new Date(),
        },
      },
      subscription: {
        create: {
          tier: "FREE",
          status: "ACTIVE",
          monthlyGenerationsUsed: 0,
          monthlyHoursUsedSeconds: 0,
        },
      },
    },
  });

  return created.id;
}

function resolveVideoId(input?: string): string {
  const trimmed = (input || "").trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  if (trimmed) {
    const parsed = parseYouTubeUrl(trimmed);
    if (parsed.valid && parsed.videoId) return parsed.videoId;
  }
  return VERIFIED_DEMO_VIDEOS[0];
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Administrator role required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase().trim() || "";

    const courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        creator: {
          select: { email: true, profile: { select: { displayName: true } } },
        },
        source: {
          select: { youtubeId: true, channelTitle: true, sourceUrl: true },
        },
        _count: {
          select: { chapters: true, enrollments: true },
        },
      },
    });

    const filtered = search
      ? courses.filter(
          (c) =>
            c.title.toLowerCase().includes(search) ||
            c.slug.toLowerCase().includes(search) ||
            c.creator.email.toLowerCase().includes(search) ||
            (c.creator.profile?.displayName || "").toLowerCase().includes(search)
        )
      : courses;

    const formatted = filtered.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      status: c.status,
      isPublic: c.isPublic,
      difficulty: c.difficulty,
      durationSeconds: c.totalDurationSeconds,
      enrollmentCount: c.enrollmentCount,
      creatorEmail: c.creator.email,
      creatorName: c.creator.profile?.displayName || c.creator.email,
      channelTitle: c.source?.channelTitle || "",
      youtubeId: c.source?.youtubeId || "",
      chapterCount: c._count.chapters,
      thumbnailUrl: getCleanThumbnailUrl(c.thumbnailUrl, c.slug, c.source?.youtubeId),
      createdAt: c.createdAt,
    }));

    return NextResponse.json({ courses: formatted });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Administrator role required." }, { status: 403 });
    }

    const body = await req.json();
    const {
      mode = "DUMMY",
      title,
      addedByName,
      enrollmentCount,
      learnersCount,
      channelTitle,
      durationMinutes = 180,
      chaptersCount = 4,
      lessonsPerChapter = 3,
      difficulty = "BEGINNER",
      description,
      youtubeUrlOrId,
      url,
      thumbnailUrl,
      isPublic = true,
    } = body;

    const targetLearners = Math.max(0, Math.floor(Number(enrollmentCount ?? learnersCount ?? 25) || 0));
    const upperDiff = String(difficulty).toUpperCase();
    const safeDifficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" =
      upperDiff === "INTERMEDIATE"
        ? "INTERMEDIATE"
        : upperDiff === "ADVANCED"
        ? "ADVANCED"
        : "BEGINNER";

    if (mode === "YOUTUBE") {
      const targetUrl = String(url || youtubeUrlOrId || "").trim();
      if (!targetUrl) {
        return NextResponse.json({ error: "YouTube URL is required." }, { status: 400 });
      }

      const creatorId = await resolveCuratorUserId(addedByName, user.id);
      const result = await generateCourse({
        url: targetUrl,
        userId: user.id,
        difficulty: safeDifficulty,
      });

      if (result.courseId) {
        const patchData: any = {
          enrollmentCount: targetLearners,
          isPublic: Boolean(isPublic),
          creatorId,
        };
        if (typeof title === "string" && title.trim()) {
          patchData.title = title.trim();
        }
        if (typeof thumbnailUrl === "string" && thumbnailUrl.trim()) {
          patchData.thumbnailUrl = thumbnailUrl.trim();
        }
        await prisma.course.update({
          where: { id: result.courseId },
          data: patchData,
        });
        if (typeof channelTitle === "string" && channelTitle.trim()) {
          await prisma.courseSource.updateMany({
            where: { courseId: result.courseId },
            data: { channelTitle: channelTitle.trim() },
          });
        }
      }

      return NextResponse.json({
        ...result,
        success: true,
        message: "YouTube course imported with custom attribution and learner settings.",
      });
    }

    // DUMMY / CURATED INSTANT COURSE STUDIO MODE
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Course title is required." }, { status: 400 });
    }

    const cleanTitle = title.trim();
    const creatorId = await resolveCuratorUserId(addedByName || "Mr Sami", user.id);
    const videoId = resolveVideoId(youtubeUrlOrId || url);
    const uniqueSlug = `${slugifySafe(cleanTitle)}-${Math.random().toString(36).slice(2, 6)}`;
    const safeThumbnail = getCleanThumbnailUrl(thumbnailUrl, uniqueSlug, videoId);
    const safeChannel = (channelTitle || "Courseyl Academy").trim();
    const totalMinutes = Math.max(15, Math.min(3600, Math.floor(Number(durationMinutes) || 180)));
    const totalSeconds = totalMinutes * 60;
    const chCount = Math.max(1, Math.min(12, Math.floor(Number(chaptersCount) || 4)));
    const lPerCh = Math.max(1, Math.min(8, Math.floor(Number(lessonsPerChapter) || 3)));
    const totalLessons = chCount * lPerCh;
    const baseLessonDuration = Math.floor(totalSeconds / totalLessons);

    const chaptersPayload = Array.from({ length: chCount }, (_, chIdx) => {
      const chapterTopics = [
        "Core Foundations & Setup",
        "Deep Dive & Practical Workflows",
        "Real-World Architecture & Patterns",
        "Optimization & Debugging",
        "Advanced Integration & Mastery",
        "Capstone Build & Review",
      ];
      const topicLabel = chapterTopics[chIdx % chapterTopics.length];

      const lessonsPayload = Array.from({ length: lPerCh }, (_, lIdx) => {
        const globalIdx = chIdx * lPerCh + lIdx;
        const startSeconds = globalIdx * baseLessonDuration;
        const endSeconds =
          globalIdx === totalLessons - 1 ? totalSeconds : (globalIdx + 1) * baseLessonDuration;
        const durationSeconds = Math.max(60, endSeconds - startSeconds);
        const lessonTitle = `${cleanTitle.split(" ")[0]} Module ${chIdx + 1}.${lIdx + 1}: ${topicLabel}`;
        const lessonDescription = `Interactive walkthrough covering essential concepts from ${cleanTitle} (${topicLabel}).`;
        const lessonSummary = `In this lesson, you will master key techniques inside ${cleanTitle}, understand core trade-offs, and test recall with interactive exercises.`;
        const takeawaysList = [
          `Understand core workflow principles for ${topicLabel}`,
          `Apply practical patterns in real projects`,
          `Recognize common mistakes and debug them systematically`,
        ];
        const definitionEntry = {
          term: topicLabel.split(" ")[0] + " Workflow",
          definition: `Structured approach introduced in ${cleanTitle} to keep implementation modular and reliable.`,
        };
        const synthesizedQuizzes = synthesizeLessonQuizQuestions({
          title: lessonTitle,
          description: lessonDescription,
          summary: lessonSummary,
          keyTakeaways: takeawaysList,
          importantDefinitions: [`${definitionEntry.term}: ${definitionEntry.definition}`],
          chapterTitle: `Module ${chIdx + 1}: ${topicLabel}`,
          courseTitle: cleanTitle,
          startSeconds,
          endSeconds,
          durationSeconds,
          lessonIndex: globalIdx,
        });

        return {
          orderIndex: lIdx + 1,
          title: lessonTitle,
          description: lessonDescription,
          youtubeVideoId: videoId,
          startSeconds,
          endSeconds,
          durationSeconds,
          summary: lessonSummary,
          keyTakeaways: JSON.stringify(takeawaysList),
          importantDefinitions: JSON.stringify([definitionEntry]),
          status: "READY",
          quizQuestions: {
            create: synthesizedQuizzes.map((q, qIdx) => ({
              orderIndex: qIdx,
              questionText: q.questionText,
              correctOptionIndex: q.correctOptionIndex,
              explanation: q.explanation,
              replayTimestampSeconds: q.replayTimestampSeconds,
              options: {
                create: q.options.map((optText, optIdx) => ({
                  optionIndex: optIdx,
                  optionText: optText,
                })),
              },
            })),
          },
        };
      });

      return {
        orderIndex: chIdx + 1,
        title: `Module ${chIdx + 1}: ${topicLabel}`,
        description: `Structured section ${chIdx + 1} covering ${topicLabel}.`,
        lessons: {
          create: lessonsPayload,
        },
      };
    });

    const createdCourse = await prisma.course.create({
      data: {
        creatorId,
        title: cleanTitle,
        slug: uniqueSlug,
        description:
          (description || "").trim() ||
          `Structured interactive course based on "${cleanTitle}" by ${safeChannel}. Divided into ${chCount} modules and ${totalLessons} focused lessons with quizzes & study notes.`,
        targetAudience: `${safeDifficulty.charAt(0) + safeDifficulty.slice(1).toLowerCase()} learners`,
        difficulty: safeDifficulty,
        thumbnailUrl: safeThumbnail,
        totalDurationSeconds: totalSeconds,
        estimatedStudyMinutes: totalMinutes,
        status: "READY",
        isPublic: Boolean(isPublic),
        enrollmentCount: targetLearners,
        source: {
          create: {
            sourceType: "YOUTUBE_VIDEO",
            sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
            youtubeId: videoId,
            channelTitle: safeChannel,
          },
        },
        chapters: {
          create: chaptersPayload,
        },
        placementQuestions: {
          create: [
            {
              orderIndex: 1,
              topicName: "Foundations",
              questionText: `Which statement best describes the core goal of ${cleanTitle}?`,
              correctOptionIndex: 0,
              explanation: `Building structured hands-on mastery through focused lessons.`,
              options: {
                create: [
                  { optionIndex: 0, optionText: "Applying foundational concepts step by step" },
                  { optionIndex: 1, optionText: "Ignoring architecture and testing" },
                  { optionIndex: 2, optionText: "Copying unverified snippets blindly" },
                ],
              },
            },
            {
              orderIndex: 2,
              topicName: "Real-World Architecture",
              questionText: `When scaling solutions taught in ${cleanTitle}, what matters most?`,
              correctOptionIndex: 1,
              explanation: `Clean separation of responsibilities and measurable verification.`,
              options: {
                create: [
                  { optionIndex: 0, optionText: "Hardcoding every dependency inline" },
                  { optionIndex: 1, optionText: "Clear modular structure and verification" },
                  { optionIndex: 2, optionText: "Avoiding error handling altogether" },
                ],
              },
            },
          ],
        },
      },
      include: {
        creator: {
          select: { email: true, profile: { select: { displayName: true } } },
        },
        source: { select: { youtubeId: true, channelTitle: true } },
        _count: { select: { chapters: true } },
      },
    });

    return NextResponse.json({
      success: true,
      course: createdCourse,
      message: `Created "${cleanTitle}" added by ${addedByName || "Mr Sami"} with ${targetLearners} learners!`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create course";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Administrator role required." }, { status: 403 });
    }

    const body = await req.json();
    const {
      courseId,
      isPublic,
      title,
      addedByName,
      enrollmentCount,
      learnersCount,
      channelTitle,
      difficulty,
      thumbnailUrl,
    } = body;

    if (!courseId) {
      return NextResponse.json({ error: "courseId is required." }, { status: 400 });
    }

    const data: any = {};
    if (typeof isPublic === "boolean") data.isPublic = isPublic;
    if (title && typeof title === "string" && title.trim()) data.title = title.trim();
    if (typeof difficulty === "string" && ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(difficulty)) {
      data.difficulty = difficulty;
    }
    const rawCount = enrollmentCount !== undefined ? enrollmentCount : learnersCount;
    if (rawCount !== undefined && rawCount !== null && !Number.isNaN(Number(rawCount))) {
      data.enrollmentCount = Math.max(0, Math.floor(Number(rawCount)));
    }
    if (typeof addedByName === "string" && addedByName.trim()) {
      data.creatorId = await resolveCuratorUserId(addedByName.trim(), user.id);
    }
    if (typeof thumbnailUrl === "string" && thumbnailUrl.trim()) {
      data.thumbnailUrl = thumbnailUrl.trim();
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data,
    });

    if (typeof channelTitle === "string" && channelTitle.trim()) {
      await prisma.courseSource.updateMany({
        where: { courseId },
        data: { channelTitle: channelTitle.trim() },
      });
    }

    return NextResponse.json({ success: true, course: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Administrator role required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("id");

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required." }, { status: 400 });
    }

    await prisma.course.delete({
      where: { id: courseId },
    });

    return NextResponse.json({ success: true, message: "Course deleted successfully." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
