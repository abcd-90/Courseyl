import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureLessonQuizzesInDb } from "@/lib/ai/quizGenerator";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    let lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        chapter: {
          include: {
            course: {
              include: {
                source: {
                  select: { channelTitle: true, youtubeId: true },
                },
                chapters: {
                  orderBy: { orderIndex: "asc" },
                  include: {
                    lessons: {
                      orderBy: { orderIndex: "asc" },
                      select: { id: true, title: true, orderIndex: true, durationSeconds: true },
                    },
                  },
                },
              },
            },
          },
        },
        quizQuestions: {
          orderBy: { orderIndex: "asc" },
          include: {
            options: {
              orderBy: { optionIndex: "asc" },
              select: { optionIndex: true, optionText: true },
            },
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    let notes: any[] = [];
    let progress = null;

    if (user) {
      notes = await prisma.studyNote.findMany({
        where: {
          userId: user.id,
          lessonId: lesson.id,
        },
        orderBy: { timestampSeconds: "asc" },
      });

      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: lesson.chapter.course.id,
          },
        },
      });

      if (enrollment) {
        progress = await prisma.lessonProgress.findUnique({
          where: {
            enrollmentId_lessonId: {
              enrollmentId: enrollment.id,
              lessonId: lesson.id,
            },
          },
        });
      }
    }

    // Determine Previous and Next lesson across chapters
    const allCourseLessons: { id: string; title: string }[] = [];
    lesson.chapter.course.chapters.forEach((ch) => {
      ch.lessons.forEach((l) => {
        allCourseLessons.push({ id: l.id, title: l.title });
      });
    });

    const currentIdx = allCourseLessons.findIndex((l) => l.id === lesson.id);
    const prevLesson = currentIdx > 0 ? allCourseLessons[currentIdx - 1] : null;
    const nextLesson =
      currentIdx >= 0 && currentIdx < allCourseLessons.length - 1
        ? allCourseLessons[currentIdx + 1]
        : null;

    // Parse JSON arrays safely
    let keyTakeaways = [];
    try {
      keyTakeaways = lesson.keyTakeaways ? JSON.parse(lesson.keyTakeaways) : [];
    } catch {
      keyTakeaways = [];
    }

    let importantDefinitions = [];
    try {
      importantDefinitions = lesson.importantDefinitions
        ? JSON.parse(lesson.importantDefinitions)
        : [];
    } catch {
      importantDefinitions = [];
    }

    const formattedDefinitions: string[] = Array.isArray(importantDefinitions)
      ? importantDefinitions
          .map((d: unknown) =>
            typeof d === "string"
              ? d
              : typeof d === "object" && d !== null && "term" in d && "definition" in d
                ? `${String((d as { term: unknown }).term)}: ${String((d as { definition: unknown }).definition)}`
                : ""
          )
          .filter(Boolean)
      : [];

    const resolvedQuizQuestions =
      lesson.quizQuestions.length > 0
        ? lesson.quizQuestions
        : await ensureLessonQuizzesInDb(lesson.id, {
            lessonId: lesson.id,
            title: lesson.title,
            description: lesson.description,
            summary: lesson.summary,
            keyTakeaways: Array.isArray(keyTakeaways) ? keyTakeaways.map(String) : [],
            importantDefinitions: formattedDefinitions,
            chapterTitle: lesson.chapter.title,
            courseTitle: lesson.chapter.course.title,
            startSeconds: lesson.startSeconds,
            endSeconds: lesson.endSeconds,
            durationSeconds: lesson.durationSeconds,
            lessonIndex: lesson.orderIndex,
          });

    const courseSource = lesson.chapter?.course?.source;
    const resolvedVideoId =
      lesson.youtubeVideoId && lesson.youtubeVideoId !== "urbkF3zPpxw"
        ? lesson.youtubeVideoId
        : courseSource?.youtubeId || "3iFMc6ELt7k";
    const resolvedChannelTitle =
      courseSource?.channelTitle || "Instructor";

    return NextResponse.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        youtubeVideoId: resolvedVideoId,
        startSeconds: lesson.startSeconds,
        endSeconds: lesson.endSeconds,
        durationSeconds: lesson.durationSeconds,
        summary: lesson.summary,
        keyTakeaways,
        importantDefinitions,
        chapterTitle: lesson.chapter.title,
        courseId: lesson.chapter.course.id,
        courseTitle: lesson.chapter.course.title,
        courseSlug: lesson.chapter.course.slug,
        channelTitle: resolvedChannelTitle,
        thumbnailUrl: lesson.chapter.course.thumbnailUrl || `https://img.youtube.com/vi/${resolvedVideoId}/hqdefault.jpg`,
      },
      navigation: {
        prevLesson,
        nextLesson,
        allLessons: allCourseLessons,
      },
      notes,
      quizQuestions: resolvedQuizQuestions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        replayTimestampSeconds: q.replayTimestampSeconds,
        correctOptionIndex: q.correctOptionIndex,
        explanation: q.explanation,
        options: q.options,
      })),
      progress: {
        isCompleted: progress?.isCompleted ?? false,
        isSkipped: progress?.isSkipped ?? false,
        lastPlaybackSeconds: progress?.lastPlaybackSeconds ?? lesson.startSeconds,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

