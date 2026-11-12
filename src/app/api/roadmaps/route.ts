import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 80);
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    const roadmaps = await prisma.roadmap.findMany({
      where: { isPublic: true },
      orderBy: { enrollmentCount: "desc" },
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
              include: {
                course: {
                  select: { id: true, title: true, thumbnailUrl: true, totalDurationSeconds: true },
                },
              },
            },
          },
        },
      },
    });

    const enrolledCourseIds = user
      ? new Set(
          (
            await prisma.roadmapEnrollment.findMany({
              where: { userId: user.id },
              select: { roadmapId: true },
            })
          ).map((e) => e.roadmapId)
        )
      : new Set<string>();

    const formatted = roadmaps.map((r) => {
      let totalCourses = 0;
      let totalDuration = 0;
      r.stages.forEach((st) => {
        totalCourses += st.courses.length;
        st.courses.forEach((sc) => {
          totalDuration += sc.course.totalDurationSeconds;
        });
      });

      return {
        id: r.id,
        title: r.title,
        slug: r.slug,
        description: r.description,
        badge: r.badge,
        enrollmentCount: r.enrollmentCount,
        isEnrolled: enrolledCourseIds.has(r.id),
        creatorName: r.creator?.profile?.displayName || "Courseyl Curator",
        stageCount: r.stages.length,
        totalCourses,
        totalDurationSeconds: totalDuration,
        stages: r.stages.map((st) => ({
          id: st.id,
          title: st.title,
          stageIndex: st.stageIndex,
          courses: st.courses.map((sc) => ({
            id: sc.course.id,
            title: sc.course.title,
            thumbnailUrl: sc.course.thumbnailUrl,
            totalDurationSeconds: sc.course.totalDurationSeconds,
          })),
        })),
        createdAt: r.createdAt,
      };
    });

    let userRoadmaps: any[] = [];
    if (user) {
      const userEnrollments = await prisma.roadmapEnrollment.findMany({
        where: { userId: user.id },
        include: {
          roadmap: {
            include: {
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
                          thumbnailUrl: true,
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

      const enrolledRoadmapIds = new Set(userEnrollments.map((ue) => ue.roadmap.id));

      userRoadmaps = userEnrollments.map((ue) => {
        let totalCourses = 0;
        let firstThumbnail: string | null = null;
        ue.roadmap.stages.forEach((st) => {
          totalCourses += st.courses.length;
          if (!firstThumbnail && st.courses.length > 0 && st.courses[0].course?.thumbnailUrl) {
            firstThumbnail = st.courses[0].course.thumbnailUrl;
          }
        });

        return {
          id: ue.roadmap.id,
          title: ue.roadmap.title,
          slug: ue.roadmap.slug,
          description: ue.roadmap.description,
          badge: ue.roadmap.badge,
          progressPercentage: ue.progressPercentage || 0,
          stageCount: ue.roadmap.stages.length,
          stages: ue.roadmap.stages.map((st) => ({
            id: st.id,
            title: st.title,
            stageIndex: st.stageIndex,
          })),
          totalCourses: totalCourses || 1,
          enrollmentCount: ue.roadmap.enrollmentCount ? (ue.roadmap.enrollmentCount - 1) : 0,
          thumbnailUrl: firstThumbnail || "https://i.ytimg.com/vi/LSk5KaEGVK4/maxresdefault.jpg",
          isPrivate: !ue.roadmap.isPublic,
        };
      });

      const createdRoadmaps = await prisma.roadmap.findMany({
        where: {
          creatorId: user.id,
          id: { notIn: Array.from(enrolledRoadmapIds) },
        },
        include: {
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
                      thumbnailUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      createdRoadmaps.forEach((r) => {
        let totalCourses = 0;
        let firstThumbnail: string | null = null;
        r.stages.forEach((st) => {
          totalCourses += st.courses.length;
          if (!firstThumbnail && st.courses.length > 0 && st.courses[0].course?.thumbnailUrl) {
            firstThumbnail = st.courses[0].course.thumbnailUrl;
          }
        });

        userRoadmaps.push({
          id: r.id,
          title: r.title,
          slug: r.slug,
          description: r.description,
          badge: r.badge,
          progressPercentage: 0,
          stageCount: r.stages.length,
          stages: r.stages.map((st) => ({
            id: st.id,
            title: st.title,
            stageIndex: st.stageIndex,
          })),
          totalCourses: totalCourses || 1,
          enrollmentCount: 0,
          thumbnailUrl: firstThumbnail || "https://i.ytimg.com/vi/J9BI0jGOds8/maxresdefault.jpg",
          isPrivate: !r.isPublic,
        });
      });
    }

    return NextResponse.json(
      { roadmaps: formatted, userRoadmaps },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, badge, stages } = await req.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Roadmap title is required." }, { status: 400 });
    }

    const effectiveStages = Array.isArray(stages) && stages.length > 0
      ? stages
      : [
          {
            title: "Stage 1",
            description: "",
            courseIds: [],
          },
        ];

    const baseSlug = slugify(title) || `roadmap-${Date.now()}`;
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

    const roadmap = await prisma.roadmap.create({
      data: {
        creatorId: user.id,
        title: title.trim(),
        slug,
        description: description?.trim() || "Curated learning roadmap.",
        badge: badge || "🎯",
        isPublic: true,
        enrollmentCount: 1,
        stages: {
          create: effectiveStages.map((st: any, sIdx: number) => ({
            stageIndex: sIdx,
            title: st.title || `Stage ${sIdx + 1}`,
            description: st.description || "",
            courses: {
              create: (st.courseIds || []).map((cid: string, cIdx: number) => ({
                orderIndex: cIdx,
                courseId: cid,
              })),
            },
          })),
        },
      },
    });

    // Auto-enroll creator
    await prisma.roadmapEnrollment.create({
      data: {
        userId: user.id,
        roadmapId: roadmap.id,
        progressPercentage: 0,
      },
    });

    return NextResponse.json({ success: true, roadmap });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

