import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  formatGenerationJobPayload,
  PIPELINE_STEPS,
} from "@/lib/ai/courseGenerator";
import { BuildProgressView } from "@/components/BuildProgressView";
import { AppSidebar } from "@/components/AppSidebar";

export const dynamic = "force-dynamic";

export default async function BuildSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { slug } = await params;
  const { jobId: queryJobId } = await searchParams;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/build/${slug}`)}`);
  }

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      source: {
        select: { youtubeId: true },
      },
      generationJobs: {
        orderBy: { startedAt: "desc" },
        take: 5,
      },
    },
  });

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-paper text-ink w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-4">
          <h1 className="text-2xl font-display font-bold text-ink">Course build not found</h1>
          <p className="text-sm text-ink-soft max-w-md">
            This generation workspace does not exist or may have been removed.
          </p>
          <Link
            href="/generate"
            className="px-5 py-2.5 rounded-full bg-[#4b5e1e] dark:bg-[#b8c460] text-[#f6f8ec] dark:text-[#0f1611] text-xs font-semibold"
          >
            Generate a new course →
          </Link>
        </main>
      </div>
    );
  }

  const matchedJob =
    (queryJobId
      ? course.generationJobs.find((j) => j.id === queryJobId)
      : undefined) ||
    course.generationJobs.find((j) => j.userId === user.id) ||
    course.generationJobs[0];

  if (matchedJob && matchedJob.userId !== user.id && user.role !== "ADMIN") {
    redirect(`/courses/${course.slug}`);
  }

  const initialPayload = matchedJob
    ? formatGenerationJobPayload({
        ...matchedJob,
        course: {
          id: course.id,
          slug: course.slug,
          title: course.title,
          status: course.status,
          thumbnailUrl: course.thumbnailUrl,
          totalDurationSeconds: course.totalDurationSeconds,
          difficulty: course.difficulty,
        },
      })
    : {
        id: `completed_${course.id}`,
        courseId: course.id,
        slug: course.slug,
        courseTitle: course.title,
        courseStatus: course.status,
        thumbnailUrl: course.thumbnailUrl,
        totalDurationSeconds: course.totalDurationSeconds,
        difficulty: course.difficulty,
        status: course.status === "READY" ? "COMPLETED" : course.status,
        progressPercentage: course.status === "READY" ? 100 : 10,
        currentStep:
          course.status === "READY"
            ? PIPELINE_STEPS[3].label
            : PIPELINE_STEPS[0].label,
        checkpointStep: course.status === "READY" ? 4 : 0,
        quotaCharged: false,
        canRetry: false,
        errorLog: null,
        startedAt: course.createdAt.toISOString(),
        completedAt: course.status === "READY" ? course.updatedAt.toISOString() : null,
        steps: PIPELINE_STEPS.map((s) => ({
          step: s.step,
          key: s.key,
          label: s.label,
          state: course.status === "READY" ? ("completed" as const) : ("pending" as const),
        })),
      };

  const serializedPayload = {
    ...initialPayload,
    startedAt:
      initialPayload.startedAt instanceof Date
        ? initialPayload.startedAt.toISOString()
        : String(initialPayload.startedAt),
    completedAt:
      initialPayload.completedAt instanceof Date
        ? initialPayload.completedAt.toISOString()
        : initialPayload.completedAt
          ? String(initialPayload.completedAt)
          : null,
  };

  return (
    <BuildProgressView
      initialJob={serializedPayload}
      courseSlug={course.slug}
      youtubeVideoId={course.source?.youtubeId}
    />
  );
}

