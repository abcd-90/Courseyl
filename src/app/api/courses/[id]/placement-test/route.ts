import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let course = await prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        placementQuestions: {
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

    if (!course) {
      course = await prisma.course.findFirst({
        orderBy: { enrollmentCount: "desc" },
        include: {
          placementQuestions: {
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
    }

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const questions = course.placementQuestions.map((q) => ({
      id: q.id,
      topicName: q.topicName,
      questionText: q.questionText,
      options: q.options,
    }));

    return NextResponse.json({
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
      },
      questions,
    });
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
    const { answers } = await req.json(); // { [questionId: string]: number }

    const course = await prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        placementQuestions: true,
        chapters: {
          include: {
            lessons: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Ensure enrollment
    const enrollment = await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        courseId: course.id,
      },
    });

    // Evaluate answers
    let correctCount = 0;
    const totalQuestions = course.placementQuestions.length;
    const masteredTopics = new Set<string>();
    const topicScores: Record<string, { total: number; correct: number }> = {};

    course.placementQuestions.forEach((q) => {
      const selected = answers?.[q.id];
      const isCorrect = selected === q.correctOptionIndex;

      if (!topicScores[q.topicName]) {
        topicScores[q.topicName] = { total: 0, correct: 0 };
      }
      topicScores[q.topicName].total++;

      if (isCorrect) {
        correctCount++;
        topicScores[q.topicName].correct++;
      }
    });

    // Topic mastered if score >= 80% (or 1/1 if single question)
    Object.entries(topicScores).forEach(([topic, score]) => {
      if (score.correct / score.total >= 0.8) {
        masteredTopics.add(topic.toLowerCase().trim());
      }
    });

    const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Identify which lessons should be skipped
    // A lesson is skipped if its title or description matches a mastered topic
    const skippedLessonIds: string[] = [];

    for (const chapter of course.chapters) {
      for (const lesson of chapter.lessons) {
        const lessonText = `${lesson.title} ${lesson.description || ""}`.toLowerCase();
        let matchesMasteredTopic = false;

        for (const topic of masteredTopics) {
          if (lessonText.includes(topic) || topic.includes(lesson.title.toLowerCase().replace(/^\d+\.\s*/, ""))) {
            matchesMasteredTopic = true;
            break;
          }
        }

        // Only skip if user achieved >= 60% overall score and topic matched
        if (matchesMasteredTopic && scorePercentage >= 60) {
          skippedLessonIds.push(lesson.id);

          await prisma.lessonProgress.upsert({
            where: {
              enrollmentId_lessonId: {
                enrollmentId: enrollment.id,
                lessonId: lesson.id,
              },
            },
            update: {
              isSkipped: true,
            },
            create: {
              enrollmentId: enrollment.id,
              lessonId: lesson.id,
              isSkipped: true,
              isCompleted: false,
            },
          });
        }
      }
    }

    // Save placement attempt
    await prisma.placementAttempt.create({
      data: {
        enrollmentId: enrollment.id,
        courseId: course.id,
        scorePercentage,
        skippedLessonsCount: skippedLessonIds.length,
      },
    });

    return NextResponse.json({
      success: true,
      scorePercentage,
      correctCount,
      totalQuestions,
      masteredTopics: Array.from(masteredTopics),
      skippedCount: skippedLessonIds.length,
      skippedLessonCount: skippedLessonIds.length,
      skippedLessonIds,
      courseSlug: course.slug,
      message:
        skippedLessonIds.length > 0
          ? `Great job! You mastered ${skippedLessonIds.length} lesson(s) and shaved off study time.`
          : "Placement complete! All lessons are active in your study plan.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

