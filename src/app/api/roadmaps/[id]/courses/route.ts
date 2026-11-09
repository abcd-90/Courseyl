import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseYouTubeUrl, fetchYouTubeMetadata } from "@/lib/youtube";
import { generateCourse } from "@/lib/ai/courseGenerator";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const body = await req.json();
    const { stageId, url, courseId } = body;

    const roadmap = await prisma.roadmap.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { stages: { orderBy: { stageIndex: "asc" } } },
    });

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    const targetStage = stageId
      ? roadmap.stages.find((s) => s.id === stageId)
      : roadmap.stages[0];

    if (!targetStage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    let targetCourseId = courseId;

    if (!targetCourseId && url) {
      const parsed = parseYouTubeUrl(url);
      if (parsed.valid && parsed.videoId) {
        // 1. Check if course already exists in CourseSource
        const existingSource = await prisma.courseSource.findFirst({
          where: { youtubeId: parsed.videoId },
          include: { course: true },
        });

        if (existingSource && existingSource.course) {
          targetCourseId = existingSource.course.id;
        } else {
          // 2. Fetch real metadata from YouTube
          const meta = await fetchYouTubeMetadata(parsed.videoId);
          const effectiveUserId = user ? user.id : roadmap.creatorId;

          try {
            const gen = await generateCourse({
              url: url.trim(),
              userId: effectiveUserId,
              difficulty: "INTERMEDIATE",
            });
            targetCourseId = gen.courseId;
          } catch (genErr) {
            console.warn("AI generation error, creating course from real YouTube metadata:", genErr);

            const baseSlug = meta.title
              .toLowerCase()
              .replace(/[^\w\s-]/g, "")
              .replace(/\s+/g, "-")
              .slice(0, 60);
            const uniqueSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

            const newCourse = await prisma.course.create({
              data: {
                creatorId: effectiveUserId,
                title: meta.title,
                slug: uniqueSlug,
                description: meta.description || `Comprehensive course for ${meta.title} by ${meta.channelTitle}.`,
                thumbnailUrl: meta.thumbnailUrl,
                totalDurationSeconds: meta.durationSeconds || 3600,
                difficulty: "INTERMEDIATE",
                status: "READY",
                isPublic: true,
                enrollmentCount: 1,
              },
            });

            await prisma.courseSource.create({
              data: {
                courseId: newCourse.id,
                sourceType: "YOUTUBE_VIDEO",
                sourceUrl: url.trim(),
                youtubeId: parsed.videoId,
                channelTitle: meta.channelTitle,
              },
            });

            // Create chapters & lessons from parsed YouTube chapters or fallback
            const chaptersList = meta.chapters && meta.chapters.length > 0 ? meta.chapters : [];

            if (chaptersList.length > 0) {
              const targetDaysCount = Math.min(8, Math.max(1, Math.ceil(meta.durationSeconds / (2 * 3600))));
              const targetDayDuration = meta.durationSeconds / targetDaysCount;

              let currentDayLessons: any[] = [];
              let currentDaySeconds = 0;
              let dayIndex = 1;

              for (let i = 0; i < chaptersList.length; i++) {
                const ch = chaptersList[i];
                currentDayLessons.push(ch);
                currentDaySeconds += ch.durationSeconds;

                const isLast = i === chaptersList.length - 1;
                const isOverTarget = currentDaySeconds >= targetDayDuration * 0.85;
                const hasMoreDaysNeeded = dayIndex < targetDaysCount;

                if (isLast || (isOverTarget && hasMoreDaysNeeded)) {
                  const firstTitle = currentDayLessons[0]?.title || `Module ${dayIndex}`;
                  const topic = firstTitle.replace(/^[–—\-:\s\d.]+/, "").split(/[&|:-]/)[0].trim();
                  let dayTitle = `Day ${dayIndex} (${topic || "Foundations"})`;
                  if (dayIndex === 1) dayTitle = `Day 1 (Core Fundamentals & Setup)`;

                  const createdChap = await prisma.chapter.create({
                    data: {
                      courseId: newCourse.id,
                      orderIndex: dayIndex - 1,
                      title: dayTitle,
                      description: `Day ${dayIndex} learning plan covering ${currentDayLessons.length} lessons.`,
                    },
                  });

                  for (let lIdx = 0; lIdx < currentDayLessons.length; lIdx++) {
                    const l = currentDayLessons[lIdx];
                    await prisma.lesson.create({
                      data: {
                        chapterId: createdChap.id,
                        orderIndex: lIdx,
                        title: l.title,
                        description: `In-depth section on ${l.title} from ${meta.channelTitle}.`,
                        youtubeVideoId: parsed.videoId,
                        startSeconds: l.startSeconds,
                        endSeconds: l.endSeconds,
                        durationSeconds: l.durationSeconds,
                        status: "READY",
                      },
                    });
                  }

                  dayIndex++;
                  currentDayLessons = [];
                  currentDaySeconds = 0;
                }
              }
            } else {
              const ch1 = await prisma.chapter.create({
                data: {
                  courseId: newCourse.id,
                  orderIndex: 0,
                  title: "Day 1 (Core Fundamentals & Setup)",
                  description: "Getting started with core principles and practical exercises.",
                },
              });

              const lessonDuration = Math.floor((meta.durationSeconds || 3600) / 4);
              for (let i = 0; i < 4; i++) {
                await prisma.lesson.create({
                  data: {
                    chapterId: ch1.id,
                    orderIndex: i,
                    title: `${meta.title.split("|")[0].trim()} - Part ${i + 1}`,
                    description: `Detailed deep-dive section ${i + 1} from ${meta.channelTitle}.`,
                    youtubeVideoId: parsed.videoId,
                    startSeconds: i * lessonDuration,
                    endSeconds: (i + 1) * lessonDuration,
                    durationSeconds: lessonDuration,
                    status: "READY",
                  },
                });
              }
            }

            targetCourseId = newCourse.id;
          }
        }
      } else {
        return NextResponse.json(
          { error: "Invalid YouTube link. Please paste a valid YouTube video URL." },
          { status: 400 }
        );
      }
    }

    if (!targetCourseId) {
      return NextResponse.json(
        { error: "Failed to resolve or generate course from this link." },
        { status: 400 }
      );
    }

    // Check if course already in stage
    const existingRc = await prisma.roadmapCourse.findFirst({
      where: {
        roadmapStageId: targetStage.id,
        courseId: targetCourseId,
      },
    });

    if (!existingRc) {
      const currentCount = await prisma.roadmapCourse.count({
        where: { roadmapStageId: targetStage.id },
      });

      await prisma.roadmapCourse.create({
        data: {
          roadmapStageId: targetStage.id,
          courseId: targetCourseId,
          orderIndex: currentCount,
        },
      });
    }

    // Also enroll current user in course if logged in
    if (user) {
      const existingEnroll = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: targetCourseId } },
      });
      if (!existingEnroll) {
        await prisma.enrollment.create({
          data: {
            userId: user.id,
            courseId: targetCourseId,
            progressPercentage: 0,
          },
        });
      }
    }

    return NextResponse.json({ success: true, courseId: targetCourseId });
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
    const { id } = await params;
    const body = await req.json();
    const { stageId, courseId } = body;

    const roadmap = await prisma.roadmap.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { stages: true },
    });

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    await prisma.roadmapCourse.deleteMany({
      where: {
        roadmapStageId: stageId,
        courseId: courseId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
