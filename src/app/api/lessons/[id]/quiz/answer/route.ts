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

    const { id: lessonId } = await params;
    const body = await req.json();
    const questionId = typeof body?.questionId === "string" ? body.questionId.trim() : "";
    const shouldClear = body?.clear === true || body?.selectedOptionIndex === null;
    const rawOptionIndex =
      body?.selectedOptionIndex ?? body?.optionIndex ?? body?.answerIndex;

    if (!questionId) {
      return NextResponse.json({ error: "questionId is required" }, { status: 400 });
    }

    const question = await prisma.quizQuestion.findFirst({
      where: { id: questionId, lessonId },
      include: {
        options: {
          orderBy: { optionIndex: "asc" },
        },
      },
    });

    if (!question) {
      return NextResponse.json({ error: "Quiz question not found for this lesson" }, { status: 404 });
    }

    if (shouldClear) {
      await prisma.quizAnswer.deleteMany({
        where: {
          userId: user.id,
          questionId: question.id,
        },
      });

      return NextResponse.json({
        success: true,
        cleared: true,
        questionId: question.id,
      });
    }

    const selectedOptionIndex = Number(rawOptionIndex);
    if (
      !Number.isInteger(selectedOptionIndex) ||
      selectedOptionIndex < 0 ||
      selectedOptionIndex >= question.options.length
    ) {
      return NextResponse.json({ error: "Invalid selectedOptionIndex" }, { status: 400 });
    }

    const isCorrect = selectedOptionIndex === question.correctOptionIndex;

    const saved = await prisma.quizAnswer.upsert({
      where: {
        userId_questionId: {
          userId: user.id,
          questionId: question.id,
        },
      },
      update: {
        selectedOptionIndex,
        isCorrect,
      },
      create: {
        userId: user.id,
        questionId: question.id,
        selectedOptionIndex,
        isCorrect,
      },
    });

    return NextResponse.json({
      success: true,
      questionId: question.id,
      selectedOptionIndex: saved.selectedOptionIndex,
      isCorrect: saved.isCorrect,
      correctOptionIndex: question.correctOptionIndex,
      explanation: question.explanation,
      replayTimestampSeconds: question.replayTimestampSeconds,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: lessonId } = await params;
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get("questionId")?.trim() || "";

    if (!questionId) {
      return NextResponse.json({ error: "questionId is required" }, { status: 400 });
    }

    const question = await prisma.quizQuestion.findFirst({
      where: { id: questionId, lessonId },
      select: { id: true },
    });

    if (!question) {
      return NextResponse.json({ error: "Quiz question not found for this lesson" }, { status: 404 });
    }

    await prisma.quizAnswer.deleteMany({
      where: {
        userId: user.id,
        questionId: question.id,
      },
    });

    return NextResponse.json({
      success: true,
      cleared: true,
      questionId: question.id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

