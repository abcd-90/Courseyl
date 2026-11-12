import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { clampDailyStudyMinutes } from "@/lib/pacing";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "into", "that", "this", "what", "when",
  "which", "where", "how", "why", "who", "are", "was", "were", "will", "can",
  "does", "did", "has", "have", "had", "not", "but", "you", "your", "our",
  "intro", "introduction", "overview", "basics", "fundamentals", "part", "lesson",
  "module", "chapter", "tutorial", "guide", "course", "complete", "full", "deep",
  "dive", "using", "build", "building", "making", "create", "understanding", "learn",
  "core", "setup", "getting", "started", "practical", "example", "examples",
]);

const TOPIC_SYNONYMS: Record<string, string[]> = {
  auth: ["authentication", "authorization", "login", "oauth", "jwt", "session"],
  authentication: ["auth", "login", "oauth", "jwt", "session", "token"],
  db: ["database", "databases", "sql", "postgres", "postgresql", "prisma", "orm"],
  database: ["db", "sql", "postgres", "postgresql", "prisma", "orm", "schema", "query"],
  api: ["apis", "rest", "restful", "endpoint", "endpoints", "http", "fetch", "route"],
  async: ["asynchronous", "promise", "promises", "await", "concurrency", "callback"],
  asynchronous: ["async", "promise", "promises", "await", "event", "loop"],
  oop: ["object", "objects", "class", "classes", "inheritance", "polymorphism"],
  function: ["functions", "func", "method", "methods", "closure", "closures", "lambda"],
  functions: ["function", "method", "methods", "closure", "lambda", "parameter"],
  variable: ["variables", "var", "let", "const", "scope", "datatype", "types"],
  variables: ["variable", "scope", "datatype", "types"],
  state: ["states", "usestate", "reducer", "context", "store", "reactivity"],
  hook: ["hooks", "useeffect", "usestate", "usememo", "usecallback"],
  hooks: ["hook", "useeffect", "usestate", "usememo", "usecallback"],
  routing: ["route", "routes", "router", "navigation", "params"],
  deploy: ["deployment", "hosting", "docker", "ci", "cd", "production", "vercel"],
  deployment: ["deploy", "docker", "container", "hosting", "production"],
  test: ["testing", "tests", "unit", "integration", "mock", "assert", "jest"],
  testing: ["test", "tests", "unit", "integration", "mock", "assert", "vitest"],
  rag: ["retrieval", "vector", "embeddings", "embedding", "chunking", "knowledge"],
  agent: ["agents", "agentic", "tool", "tools", "workflow", "orchestration"],
  llm: ["llms", "language", "model", "models", "prompt", "prompts", "openai", "gpt"],
  prompt: ["prompts", "prompting", "system", "fewshot", "context"],
};

function tokenizeNormalized(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s+#.-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[._-]+|[._-]+$/g, ""))
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

function expandTokens(tokens: string[]): Set<string> {
  const expanded = new Set<string>(tokens);
  for (const t of tokens) {
    if (t.endsWith("s") && t.length > 3) expanded.add(t.slice(0, -1));
    if (t.endsWith("ing") && t.length > 5) expanded.add(t.slice(0, -3));
    const syns = TOPIC_SYNONYMS[t];
    if (syns) {
      for (const s of syns) expanded.add(s);
    }
  }
  return expanded;
}

function scoreSemanticLessonMatch(params: {
  topicName: string;
  questionTexts: string[];
  courseTitleTokens: Set<string>;
  chapterTitle: string;
  lesson: {
    title: string;
    description: string | null;
    summary: string | null;
    keyTakeaways: string | null;
    importantDefinitions: string | null;
  };
}): boolean {
  const { topicName, questionTexts, courseTitleTokens, chapterTitle, lesson } = params;
  const cleanTopic = topicName.toLowerCase().replace(/^\d+\.\s*/, "").trim();
  const cleanLessonTitle = lesson.title.toLowerCase().replace(/^\d+\.\s*/, "").trim();

  if (
    cleanTopic.length >= 4 &&
    (cleanLessonTitle.includes(cleanTopic) || cleanTopic.includes(cleanLessonTitle))
  ) {
    return true;
  }

  const topicRawTokens = tokenizeNormalized(cleanTopic);
  const specificTopicTokens = topicRawTokens.filter((t) => !courseTitleTokens.has(t));
  const coreTopicTokens = specificTopicTokens.length > 0 ? specificTopicTokens : topicRawTokens;
  const questionTokens = tokenizeNormalized(questionTexts.join(" ")).filter(
    (t) => !courseTitleTokens.has(t)
  );

  const topicExpanded = expandTokens([...coreTopicTokens, ...questionTokens.slice(0, 8)]);
  const lessonTitleExpanded = expandTokens(tokenizeNormalized(cleanLessonTitle));
  const lessonBodyText = [
    lesson.description || "",
    lesson.summary || "",
    lesson.keyTakeaways || "",
    lesson.importantDefinitions || "",
    chapterTitle,
  ].join(" ");
  const lessonFullExpanded = expandTokens([
    ...lessonTitleExpanded,
    ...tokenizeNormalized(lessonBodyText),
  ]);

  if (coreTopicTokens.length === 0) return false;

  let titleHits = 0;
  for (const tk of expandTokens(coreTopicTokens)) {
    if (lessonTitleExpanded.has(tk)) titleHits++;
  }

  if (titleHits >= 1 && coreTopicTokens.length <= 2) {
    return true;
  }
  if (titleHits >= 2) {
    return true;
  }

  let bodyHits = 0;
  for (const tk of topicExpanded) {
    if (lessonFullExpanded.has(tk)) bodyHits++;
  }

  const ratio = bodyHits / Math.max(1, expandTokens(coreTopicTokens).size);
  return bodyHits >= 2 && ratio >= 0.5 && titleHits >= 1;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser().catch(() => null);
    const placementIncludes = {
      placementQuestions: {
        orderBy: { orderIndex: "asc" as const },
        include: {
          options: {
            orderBy: { optionIndex: "asc" as const },
            select: { optionIndex: true, optionText: true },
          },
        },
      },
    };

    let course = await prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: placementIncludes,
    });

    if (!course) {
      course = await prisma.course.findFirst({
        where: {
          OR: [{ slug: { startsWith: id } }, { slug: { contains: id } }],
        },
        include: placementIncludes,
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
      dailyStudyMinutes: clampDailyStudyMinutes(user?.profile?.dailyStudyMinutes, 60),
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
    const user = await getCurrentUser().catch(() => null);
    const { id } = await params;
    const body = await req.json();
    const answers = body?.answers || {};

    let course = await prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        placementQuestions: true,
        chapters: {
          orderBy: { orderIndex: "asc" },
          include: {
            lessons: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });

    if (!course) {
      course = await prisma.course.findFirst({
        where: {
          OR: [{ slug: { startsWith: id } }, { slug: { contains: id } }],
        },
        include: {
          placementQuestions: true,
          chapters: {
            orderBy: { orderIndex: "asc" },
            include: {
              lessons: {
                orderBy: { orderIndex: "asc" },
              },
            },
          },
        },
      });
    }

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    let enrollment: any = null;
    if (user) {
      try {
        enrollment = await prisma.enrollment.upsert({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: course.id,
            },
          },
          update: { lastAccessedAt: new Date() },
          create: {
            userId: user.id,
            courseId: course.id,
          },
        });
      } catch {}
    }

    let correctCount = 0;
    const totalQuestions = course.placementQuestions.length;
    const masteredTopicQuestions = new Map<string, string[]>();
    const topicScores: Record<string, { total: number; correct: number; questions: string[] }> = {};

    course.placementQuestions.forEach((q) => {
      const selected = answers?.[q.id];
      const isExplicitSkip = selected === -1 || selected === undefined || selected === null;
      const isCorrect = !isExplicitSkip && Number(selected) === q.correctOptionIndex;

      if (!topicScores[q.topicName]) {
        topicScores[q.topicName] = { total: 0, correct: 0, questions: [] };
      }
      topicScores[q.topicName].total++;
      topicScores[q.topicName].questions.push(q.questionText);

      if (isCorrect) {
        correctCount++;
        topicScores[q.topicName].correct++;
      }
    });

    Object.entries(topicScores).forEach(([topic, score]) => {
      if (score.total > 0 && score.correct / score.total >= 0.75) {
        masteredTopicQuestions.set(topic, score.questions);
      }
    });

    const scorePercentage =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const courseTitleTokens = new Set(tokenizeNormalized(course.title));
    const skippedLessonIds: string[] = [];

    for (const chapter of course.chapters) {
      for (const lesson of chapter.lessons) {
        let matchesMasteredTopic = false;
        for (const [topicName, qTexts] of masteredTopicQuestions.entries()) {
          if (
            scoreSemanticLessonMatch({
              topicName,
              questionTexts: qTexts,
              courseTitleTokens,
              chapterTitle: chapter.title,
              lesson,
            })
          ) {
            matchesMasteredTopic = true;
            break;
          }
        }

        if (matchesMasteredTopic) {
          skippedLessonIds.push(lesson.id);
        }

        if (enrollment) {
          try {
            if (matchesMasteredTopic) {
              await prisma.lessonProgress.upsert({
                where: {
                  enrollmentId_lessonId: {
                    enrollmentId: enrollment.id,
                    lessonId: lesson.id,
                  },
                },
                update: { isSkipped: true },
                create: {
                  enrollmentId: enrollment.id,
                  lessonId: lesson.id,
                  isSkipped: true,
                  isCompleted: false,
                },
              });
            } else {
              await prisma.lessonProgress.updateMany({
                where: {
                  enrollmentId: enrollment.id,
                  lessonId: lesson.id,
                  isSkipped: true,
                  isCompleted: false,
                },
                data: { isSkipped: false },
              });
            }
          } catch {}
        }
      }
    }

    if (enrollment) {
      try {
        await prisma.placementAttempt.create({
          data: {
            enrollmentId: enrollment.id,
            courseId: course.id,
            scorePercentage,
            skippedLessonsCount: skippedLessonIds.length,
          },
        });
      } catch {}
    }

    if (user) {
      await createNotification({
        userId: user.id,
        title: `Placement test complete · ${course.title}`,
        message: `Scored ${correctCount}/${totalQuestions} (${scorePercentage}%). ${skippedLessonIds.length} lesson${skippedLessonIds.length === 1 ? "" : "s"} skipped in your personalized study plan.`,
        type: "COURSE",
        linkUrl: `/courses/${course.slug}`,
      });
    }

    const allLessons = course.chapters.flatMap((ch) =>
      ch.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        durationSeconds: l.durationSeconds || 600,
        isSkipped: skippedLessonIds.includes(l.id),
      }))
    );

    const totalDurationSeconds = allLessons.reduce((acc, l) => acc + l.durationSeconds, 0);
    const skippedDurationSeconds = allLessons
      .filter((l) => l.isSkipped)
      .reduce((acc, l) => acc + l.durationSeconds, 0);

    return NextResponse.json({
      success: true,
      scorePercentage,
      correctCount,
      totalQuestions,
      dailyStudyMinutes: clampDailyStudyMinutes(user?.profile?.dailyStudyMinutes, 60),
      masteredTopics: Array.from(masteredTopicQuestions.keys()),
      skippedCount: skippedLessonIds.length,
      skippedLessonCount: skippedLessonIds.length,
      skippedLessonIds,
      courseSlug: course.slug,
      courseTitle: course.title,
      totalLessons: allLessons.length,
      totalDurationSeconds,
      skippedDurationSeconds,
      lessons: allLessons,
      firstActiveLessonId: allLessons.find((l) => !l.isSkipped)?.id || allLessons[0]?.id,
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
