import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        quizQuestions: {
          orderBy: { orderIndex: "asc" },
        },
        chapter: {
          select: { courseId: true },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    let correctCount = 0;
    const totalQuestions = lesson.quizQuestions.length;

    const results = lesson.quizQuestions.map((q) => {
      const selected = answers?.[q.id];
      const isCorrect = selected === q.correctOptionIndex;
      if (isCorrect) correctCount++;

      return {
        questionId: q.id,
        isCorrect,
        correctOptionIndex: q.correctOptionIndex,
        userSelectedOption: selected ?? -1,
        explanation: q.explanation,
        // Crucial for "Replay the Moment"
        replayTimestampSeconds: q.replayTimestampSeconds,
      };
    });

    const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;

    // Save quiz attempt in database
    await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        lessonId: lesson.id,
        scorePercentage,
        totalQuestions,
        correctQuestions: correctCount,
      },
    });

    // If score >= 70%, mark lesson as completed
    if (scorePercentage >= 70) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: lesson.chapter.courseId,
          },
        },
      });

      if (enrollment) {
        await prisma.lessonProgress.upsert({
          where: {
            enrollmentId_lessonId: {
              enrollmentId: enrollment.id,
              lessonId: lesson.id,
            },
          },
          update: { isCompleted: true, completedAt: new Date() },
          create: {
            enrollmentId: enrollment.id,
            lessonId: lesson.id,
            isCompleted: true,
            completedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      scorePercentage,
      correctCount,
      totalQuestions,
      passed: scorePercentage >= 70,
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

