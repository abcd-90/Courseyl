import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const roadmap = await prisma.roadmap.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        creator: {
          select: {
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
        stages: {
          orderBy: { stageIndex: "asc" },
          include: {
            courses: {
              orderBy: { orderIndex: "asc" },
              include: {
                course: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    description: true,
                    thumbnailUrl: true,
                    difficulty: true,
                    totalDurationSeconds: true,
                    source: {
                      select: {
                        channelTitle: true,
                      },
                    },
                    chapters: {
                      select: {
                        id: true,
                        title: true,
                        _count: {
                          select: {
                            lessons: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    let isEnrolled = false;
    let enrollment = null;
    let courseProgressMap: Record<string, number> = {};

    if (user) {
      enrollment = await prisma.roadmapEnrollment.findUnique({
        where: {
          userId_roadmapId: {
            userId: user.id,
            roadmapId: roadmap.id,
          },
        },
      });

      isEnrolled = !!enrollment;

      // Check user progress for all courses in this roadmap
      const allCourseIds: string[] = [];
      roadmap.stages.forEach((st) => {
        st.courses.forEach((sc) => allCourseIds.push(sc.course.id));
      });

      const userCourseEnrollments = await prisma.enrollment.findMany({
        where: {
          userId: user.id,
          courseId: { in: allCourseIds },
        },
      });

      userCourseEnrollments.forEach((e) => {
        courseProgressMap[e.courseId] = e.progressPercentage;
      });
    }

    let totalCoursesCount = 0;
    let sumProgress = 0;
    let totalRoadmapDurationSeconds = 0;
    let totalRoadmapLessonsCount = 0;

    const formattedStages = roadmap.stages.map((st) => {
      const stageCourses = st.courses.map((sc) => {
        totalCoursesCount++;
        const prog = courseProgressMap[sc.course.id] || 0;
        sumProgress += prog;

        const courseChapters = sc.course.chapters || [];
        const lessonCount = courseChapters.reduce(
          (sum: number, ch: any) => sum + (ch._count?.lessons || 0),
          0
        );

        totalRoadmapDurationSeconds += sc.course.totalDurationSeconds || 0;
        totalRoadmapLessonsCount += lessonCount;

        return {
          ...sc.course,
          lessonCount,
          author: sc.course.source?.channelTitle || "Educational Creator",
          userProgressPercentage: prog,
          isCompleted: prog >= 100,
        };
      });

      return {
        id: st.id,
        stageIndex: st.stageIndex,
        title: st.title,
        description: st.description,
        courses: stageCourses,
      };
    });

    const overallProgress =
      totalCoursesCount > 0 ? Math.round(sumProgress / totalCoursesCount) : 0;

    return NextResponse.json({
      roadmap: {
        id: roadmap.id,
        title: roadmap.title,
        slug: roadmap.slug,
        description: roadmap.description,
        badge: roadmap.badge,
        enrollmentCount: roadmap.enrollmentCount,
        creatorName: roadmap.creator?.profile?.displayName || "CourseIt Curator",
        stages: formattedStages,
        totalDurationSeconds: totalRoadmapDurationSeconds,
        totalLessonsCount: totalRoadmapLessonsCount,
        totalCoursesCount,
      },
      userState: {
        isEnrolled,
        overallProgress,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, description, stageId, stageTitle } = body;

    const roadmap = await prisma.roadmap.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    if (stageId && stageTitle) {
      // Update stage title
      await prisma.roadmapStage.update({
        where: { id: stageId },
        data: { title: stageTitle.trim() },
      });
      return NextResponse.json({ success: true, message: "Stage updated successfully" });
    }

    if (title && title.trim()) {
      const updated = await prisma.roadmap.update({
        where: { id: roadmap.id },
        data: {
          title: title.trim(),
          description: description !== undefined ? description.trim() : roadmap.description,
        },
      });
      return NextResponse.json({ success: true, roadmap: updated });
    }

    return NextResponse.json({ success: true });
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
    const roadmap = await prisma.roadmap.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { stages: true },
    });

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    // Delete enrollments, courses, stages, then roadmap
    await prisma.roadmapEnrollment.deleteMany({ where: { roadmapId: roadmap.id } });
    for (const stage of roadmap.stages) {
      await prisma.roadmapCourse.deleteMany({ where: { roadmapStageId: stage.id } });
    }
    await prisma.roadmapStage.deleteMany({ where: { roadmapId: roadmap.id } });
    await prisma.roadmap.delete({ where: { id: roadmap.id } });

    return NextResponse.json({ success: true, message: "Roadmap deleted successfully" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

