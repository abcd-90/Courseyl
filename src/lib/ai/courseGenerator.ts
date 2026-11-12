import { prisma } from "../db";
import {
  parseYouTubeUrl,
  fetchYouTubeMetadata,
  fetchYouTubeTranscript,
  TranscriptSegment,
  formatDuration,
  formatClockTimestamp,
  VideoChapter,
  VideoMetadata,
} from "../youtube";
import {
  resolveAIProvider,
  isExternalAIProvider,
  getSecondaryAIProvider,
  type AIProvider,
} from "./aiProvider";
import {
  computeRecommendedQuizCount,
  generateLessonQuizQuestions,
  synthesizeLessonQuizQuestions,
} from "./quizGenerator";
import { randomUUID } from "crypto";
import { getFullSettings } from "../settings";
import { createNotification } from "../notifications";

const makeId = () => `c${randomUUID().replace(/-/g, "").slice(0, 24)}`;

export const PIPELINE_STEPS = [
  { step: 1, key: "transcript", label: "Extracting video transcript & metadata", targetProgress: 25 },
  { step: 2, key: "curriculum", label: "Planning course curriculum & chapters", targetProgress: 55 },
  { step: 3, key: "quizzes", label: "Generating lesson quizzes & placement test", targetProgress: 80 },
  { step: 4, key: "finalize", label: "Finalizing course structure", targetProgress: 100 },
] as const;

async function createManyInChunks<T>(
  items: T[],
  insertChunk: (chunk: T[]) => Promise<unknown>,
  chunkSize = 400
) {
  for (let i = 0; i < items.length; i += chunkSize) {
    await insertChunk(items.slice(i, i + chunkSize));
  }
}

export interface GenerateCourseParams {
  url: string;
  userId: string;
  manualTranscript?: string;
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  isPublic?: boolean;
}

export interface GenerationResult {
  success: boolean;
  jobId?: string | null;
  slug?: string;
  courseId: string;
  course?: { id: string; slug: string; title: string };
  isExisting: boolean;
  status?: string;
  message: string;
}

interface CheckpointState {
  url: string;
  videoId: string;
  sourceType: "VIDEO" | "PLAYLIST";
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  meta?: VideoMetadata;
  transcripts?: TranscriptSegment[] | null;
  curriculumData?: RawCurriculum;
}

function trimTranscriptForCheckpoint(
  segments: TranscriptSegment[] | null,
  maxChars = 650_000
): TranscriptSegment[] | null {
  if (!segments || segments.length === 0) return segments;
  const approxJsonLen = segments.reduce((sum, s) => sum + s.text.length + 32, 0);
  if (approxJsonLen <= maxChars) return segments;

  // Sample uniformly across the full video timeline so late timestamps keep transcript coverage
  const keepRatio = Math.max(0.15, maxChars / approxJsonLen);
  const stride = Math.max(2, Math.ceil(1 / keepRatio));
  return segments.filter((_, idx) => idx % stride === 0);
}

async function fetchQuickYouTubeOEmbed(videoId: string): Promise<{
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
}> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(
        videoId
      )}&format=json`,
      { signal: AbortSignal.timeout(2500) }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.title) {
        return {
          title: cleanPlacementText(String(data.title)) || `YouTube Course (${videoId})`,
          channelTitle: cleanPlacementText(String(data.author_name || "")) || "Educational Creator",
          thumbnailUrl:
            typeof data.thumbnail_url === "string" && data.thumbnail_url
              ? data.thumbnail_url
              : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        };
      }
    }
  } catch {
    // Instant fallback; Step 1 resolves full metadata cleanly
  }

  return {
    title: `Course Build (${videoId})`,
    channelTitle: "Educational Creator",
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}

export function formatGenerationJobPayload(job: {
  id: string;
  courseId: string;
  status: string;
  progressPercentage: number;
  currentStep: string;
  errorLog: string | null;
  checkpointStep: number;
  difficulty: string;
  quotaCharged: boolean;
  startedAt: Date;
  completedAt: Date | null;
  course: {
    id: string;
    slug: string;
    title: string;
    status: string;
    thumbnailUrl: string | null;
    totalDurationSeconds: number;
    difficulty: string;
  };
}) {
  const isCompleted = job.status === "COMPLETED";
  const isFailed = job.status === "FAILED";
  const activeStepNumber = isCompleted
    ? 4
    : Math.min(4, Math.max(1, job.checkpointStep + 1));

  const steps = PIPELINE_STEPS.map((s) => {
    let state: "completed" | "active" | "pending" | "failed" = "pending";
    if (isCompleted || s.step <= job.checkpointStep) {
      state = "completed";
    } else if (s.step === activeStepNumber) {
      state = isFailed ? "failed" : "active";
    }
    return {
      step: s.step,
      key: s.key,
      label: s.label,
      state,
    };
  });

  return {
    id: job.id,
    courseId: job.courseId,
    slug: job.course.slug,
    courseTitle: job.course.title,
    courseStatus: job.course.status,
    thumbnailUrl: job.course.thumbnailUrl,
    totalDurationSeconds: job.course.totalDurationSeconds,
    difficulty: job.difficulty || job.course.difficulty,
    status: job.status,
    progressPercentage: job.progressPercentage,
    currentStep: job.currentStep,
    checkpointStep: job.checkpointStep,
    quotaCharged: job.quotaCharged,
    canRetry: isFailed,
    errorLog: job.errorLog,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    steps,
  };
}

function buildLessonQuizContext(
  l: RawLesson,
  courseTitle: string,
  chapterTitle?: string,
  lessonIndex = 0
) {
  return {
    title: l.title,
    description: l.description,
    summary: l.summary,
    keyTakeaways: l.keyTakeaways || [],
    importantDefinitions: l.importantDefinitions || [],
    chapterTitle,
    courseTitle,
    startSeconds: l.startSeconds,
    endSeconds: l.endSeconds,
    durationSeconds: Math.max(60, l.endSeconds - l.startSeconds),
    lessonIndex,
    transcriptExcerpt: l.transcriptExcerpt,
  };
}

function resolveLessonQuizzes(
  l: RawLesson,
  courseTitle: string,
  chapterTitle?: string,
  lessonIndex = 0
): RawQuizQuestion[] {
  const ctx = buildLessonQuizContext(l, courseTitle, chapterTitle, lessonIndex);
  const expectedCount = computeRecommendedQuizCount(ctx);
  if (Array.isArray(l.quizQuestions) && l.quizQuestions.length >= expectedCount) {
    return l.quizQuestions;
  }
  return synthesizeLessonQuizQuestions(ctx, expectedCount);
}

async function resolveLessonQuizzesAsync(
  l: RawLesson,
  courseTitle: string,
  chapterTitle?: string,
  lessonIndex = 0,
  useExternalLLM = false
): Promise<RawQuizQuestion[]> {
  if (!useExternalLLM) {
    return resolveLessonQuizzes(l, courseTitle, chapterTitle, lessonIndex);
  }
  const ctx = buildLessonQuizContext(l, courseTitle, chapterTitle, lessonIndex);
  const expectedCount = computeRecommendedQuizCount(ctx);
  return generateLessonQuizQuestions(ctx, expectedCount);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 80);
}

async function verifyUserQuota(userId: string, durationSecondsToCheck?: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user) {
    throw new Error("User account not found.");
  }

  const sub = user.subscription;
  const tier = sub?.tier || "FREE";
  const role = user.role;

  const siteSettings = await getFullSettings().catch(() => null);
  const plans = siteSettings?.plans;

  const isUnlimitedMode =
    plans?.unlimitedFreeMode === true ||
    (plans?.unlimitedFreeMode === undefined && plans?.freeHoursLimit && plans.freeHoursLimit >= 999) ||
    role === "ADMIN";

  const resolvedFreeHours = plans?.freeHoursLimit && plans.freeHoursLimit < 999 ? plans.freeHoursLimit : 5;
  const resolvedFreeGens = plans?.freeGenerationsLimit && plans.freeGenerationsLimit < 999 ? plans.freeGenerationsLimit : 5;

  const tierLimits = {
    FREE: {
      maxCourses: resolvedFreeGens,
      maxDurationSec: resolvedFreeHours * 3600,
    },
    PRO: {
      maxCourses: plans?.proGenerationsLimit || 25,
      maxDurationSec: (plans?.proHoursLimit || 20) * 3600,
    },
    MAX: {
      maxCourses: plans?.maxGenerationsLimit || 100,
      maxDurationSec: (plans?.maxHoursLimit || 40) * 3600,
    },
  };

  const currentLimit = tierLimits[tier as keyof typeof tierLimits] || tierLimits.FREE;

  if (!isUnlimitedMode && sub && sub.monthlyGenerationsUsed >= currentLimit.maxCourses) {
    throw new Error(
      `Monthly generation quota exceeded for your ${tier} plan (${sub.monthlyGenerationsUsed}/${currentLimit.maxCourses} courses used). Please upgrade to generate more courses.`
    );
  }

  if (
    !isUnlimitedMode &&
    typeof durationSecondsToCheck === "number" &&
    durationSecondsToCheck > 0 &&
    (sub?.monthlyHoursUsedSeconds || 0) + durationSecondsToCheck > currentLimit.maxDurationSec
  ) {
    throw new Error(
      `Video duration (${formatDuration(durationSecondsToCheck)}) exceeds your remaining ${tier} plan quota of ${Math.round(
        currentLimit.maxDurationSec / 3600
      )} hours. Please upgrade to process longer videos.`
    );
  }

  return { user, sub };
}

/**
 * Fast async initializer for POST /api/courses/generate.
 * Validates URL, checks duplicates/quota, creates placeholder Course + GenerationJob,
 * and returns { jobId, slug, courseId } immediately without risking serverless timeout.
 */
export async function initializeCourseGenerationJob(
  params: GenerateCourseParams
): Promise<GenerationResult> {
  const { url, userId, manualTranscript, difficulty = "BEGINNER", isPublic } = params;

  const parsedUrl = parseYouTubeUrl(url);
  if (!parsedUrl.valid || !parsedUrl.videoId) {
    throw new Error("Invalid YouTube video or playlist URL. Please provide a valid YouTube link.");
  }

  const existingSource = await prisma.courseSource.findFirst({
    where: { youtubeId: parsedUrl.videoId },
    include: {
      course: {
        include: {
          generationJobs: {
            orderBy: { startedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (existingSource && existingSource.course) {
    const existingCourse = existingSource.course;
    if (existingCourse.status === "FAILED") {
      await prisma.course.delete({ where: { id: existingCourse.id } }).catch(() => {});
    } else {
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: existingCourse.id,
          },
        },
      });

      if (!existingEnrollment) {
        await prisma.enrollment.create({
          data: {
            userId,
            courseId: existingCourse.id,
          },
        });
        await prisma.course.update({
          where: { id: existingCourse.id },
          data: { enrollmentCount: { increment: 1 } },
        });
      }

      const latestJob = existingCourse.generationJobs?.[0] || null;
      if (existingCourse.status === "PROCESSING") {
        let activeJob = latestJob;
        if (!activeJob) {
          activeJob = await prisma.generationJob.create({
            data: {
              userId,
              courseId: existingCourse.id,
              status: "PENDING",
              progressPercentage: 10,
              currentStep: PIPELINE_STEPS[0].label,
              checkpointStep: 0,
              difficulty,
              manualTranscript: manualTranscript?.trim() || null,
              checkpointData: JSON.stringify({
                url,
                videoId: parsedUrl.videoId,
                sourceType: parsedUrl.type,
                difficulty,
              } satisfies CheckpointState),
            },
          });
        }
        return {
          success: true,
          jobId: activeJob.id,
          slug: existingCourse.slug,
          courseId: existingCourse.id,
          course: {
            id: existingCourse.id,
            slug: existingCourse.slug,
            title: existingCourse.title,
          },
          isExisting: false,
          status: activeJob.status,
          message: "Course generation is already in progress.",
        };
      }

      return {
        success: true,
        jobId: latestJob?.id || null,
        slug: existingCourse.slug,
        courseId: existingCourse.id,
        course: {
          id: existingCourse.id,
          slug: existingCourse.slug,
          title: existingCourse.title,
        },
        isExisting: true,
        status: "COMPLETED",
        message: "Course already exists on Courseyl! Enrolled instantly without consuming generation quota.",
      };
    }
  }

  const { user, sub } = await verifyUserQuota(userId);
  const siteSettings = await getFullSettings().catch(() => null);
  const tier = (sub?.tier || "FREE").toUpperCase();
  const canCreatePrivate =
    user.role === "ADMIN" ||
    tier === "PRO" ||
    tier === "MAX" ||
    Boolean(siteSettings?.plans?.unlimitedFreeMode);
  const defaultIsPublic = tier === "PRO" || tier === "MAX" ? false : true;
  const resolvedIsPublic =
    typeof isPublic === "boolean"
      ? isPublic || !canCreatePrivate
      : defaultIsPublic;

  const quickOEmbed = await fetchQuickYouTubeOEmbed(parsedUrl.videoId);
  const baseSlug = slugify(quickOEmbed.title) || `course-${parsedUrl.videoId.toLowerCase()}`;
  const uniqueSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

  const course = await prisma.course.create({
    data: {
      creatorId: userId,
      title: quickOEmbed.title,
      slug: uniqueSlug,
      description: `Interactive structured course from "${quickOEmbed.title}".`,
      targetAudience: "Self-paced learners, software developers, and students.",
      difficulty,
      thumbnailUrl: quickOEmbed.thumbnailUrl,
      totalDurationSeconds: 0,
      estimatedStudyMinutes: 30,
      status: "PROCESSING",
      isPublic: resolvedIsPublic,
      enrollmentCount: 1,
    },
  });

  await prisma.courseSource.create({
    data: {
      courseId: course.id,
      sourceType: parsedUrl.type === "PLAYLIST" ? "YOUTUBE_PLAYLIST" : "YOUTUBE_VIDEO",
      sourceUrl: url,
      youtubeId: parsedUrl.videoId,
      channelTitle: quickOEmbed.channelTitle,
    },
  });

  const initialCheckpoint: CheckpointState = {
    url,
    videoId: parsedUrl.videoId,
    sourceType: parsedUrl.type,
    difficulty,
  };

  const job = await prisma.generationJob.create({
    data: {
      userId,
      courseId: course.id,
      status: "PENDING",
      progressPercentage: 10,
      currentStep: PIPELINE_STEPS[0].label,
      checkpointStep: 0,
      difficulty,
      manualTranscript: manualTranscript?.trim() || null,
      checkpointData: JSON.stringify(initialCheckpoint),
    },
  });

  await prisma.enrollment.create({
    data: {
      userId,
      courseId: course.id,
    },
  });

  return {
    success: true,
    jobId: job.id,
    slug: course.slug,
    courseId: course.id,
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
    },
    isExisting: false,
    status: job.status,
    message: "Course generation job queued.",
  };
}

/**
 * Executes ONE checkpointed stage of a GenerationJob using an optimistic DB lease.
 * Safe against concurrent pollers, serverless timeouts, and checkpoint retries.
 */
export async function runGenerationJobStep(jobId: string): Promise<{
  advanced: boolean;
  busy?: boolean;
  job: ReturnType<typeof formatGenerationJobPayload> | null;
}> {
  const existing = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: {
      course: {
        include: {
          source: true,
        },
      },
    },
  });

  if (!existing) {
    return { advanced: false, job: null };
  }

  if (existing.status === "COMPLETED" || existing.status === "FAILED") {
    return {
      advanced: false,
      job: formatGenerationJobPayload(existing),
    };
  }

  const now = new Date();
  const leaseUntil = new Date(now.getTime() + 55_000);
  const acquired = await prisma.generationJob.updateMany({
    where: {
      id: jobId,
      status: { in: ["PENDING", "PROCESSING"] },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
    data: {
      status: "PROCESSING",
      lockedUntil: leaseUntil,
    },
  });

  if (acquired.count === 0) {
    const lockedLatest = await prisma.generationJob.findUnique({
      where: { id: jobId },
      include: { course: true },
    });
    return {
      advanced: false,
      busy: true,
      job: lockedLatest ? formatGenerationJobPayload(lockedLatest) : null,
    };
  }

  const course = existing.course;
  const source = course.source;
  let state: CheckpointState = {
    url: source?.sourceUrl || "",
    videoId: source?.youtubeId || "",
    sourceType: source?.sourceType === "YOUTUBE_PLAYLIST" ? "PLAYLIST" : "VIDEO",
    difficulty:
      (existing.difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED") || "BEGINNER",
  };

  if (existing.checkpointData) {
    try {
      const parsed = JSON.parse(existing.checkpointData) as Partial<CheckpointState>;
      state = { ...state, ...parsed };
    } catch {
      // Recover cleanly from source metadata below if needed
    }
  }

  const videoId = state.videoId || source?.youtubeId || parseYouTubeUrl(state.url).videoId || "";
  if (!videoId) {
    const failedJob = await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        lockedUntil: null,
        errorLog: "Missing YouTube video identifier for generation job.",
      },
      include: { course: true },
    });
    await prisma.course.update({ where: { id: course.id }, data: { status: "FAILED" } });
    return { advanced: false, job: formatGenerationJobPayload(failedJob) };
  }

  try {
    // -------------------------------------------------------------
    // STEP 1: Extracting video transcript & metadata
    // -------------------------------------------------------------
    if (existing.checkpointStep < 1 || !state.meta) {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          currentStep: PIPELINE_STEPS[0].label,
          progressPercentage: Math.max(existing.progressPercentage, 15),
        },
      });

      const meta = await fetchYouTubeMetadata(videoId);
      await verifyUserQuota(existing.userId, meta.durationSeconds);

      await prisma.course.update({
        where: { id: course.id },
        data: {
          title: meta.title,
          description: meta.description || `Comprehensive interactive course covering ${meta.title}.`,
          thumbnailUrl: meta.thumbnailUrl,
          totalDurationSeconds: meta.durationSeconds,
          estimatedStudyMinutes: Math.ceil((meta.durationSeconds * 1.5) / 60),
        },
      });

      if (source) {
        await prisma.courseSource.update({
          where: { id: source.id },
          data: { channelTitle: meta.channelTitle },
        });
      }

      const provider = await resolveAIProvider();
      const hasExternalAI = isExternalAIProvider(provider);
      let transcripts: TranscriptSegment[] | null = null;

      if (existing.manualTranscript && existing.manualTranscript.trim()) {
        transcripts = [
          {
            text: existing.manualTranscript.trim(),
            start: 0,
            duration: meta.durationSeconds,
          },
        ];
      } else if (
        hasExternalAI ||
        !meta.chapters ||
        meta.chapters.length < 4 ||
        meta.durationSeconds < 14400
      ) {
        transcripts = await fetchYouTubeTranscript(videoId).catch(() => null);
      }

      const nextState: CheckpointState = {
        ...state,
        videoId,
        meta,
        transcripts: trimTranscriptForCheckpoint(transcripts),
      };

      const updated = await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "PROCESSING",
          checkpointStep: 1,
          progressPercentage: 25,
          currentStep: PIPELINE_STEPS[1].label,
          checkpointData: JSON.stringify(nextState),
          lockedUntil: null,
          errorLog: null,
        },
        include: { course: true },
      });

      return { advanced: true, job: formatGenerationJobPayload(updated) };
    }

    // -------------------------------------------------------------
    // STEP 2: Planning course curriculum & chapters
    // -------------------------------------------------------------
    if (existing.checkpointStep === 1 || !state.curriculumData) {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          currentStep: PIPELINE_STEPS[1].label,
          progressPercentage: Math.max(existing.progressPercentage, 35),
        },
      });

      const meta = state.meta;
      const transcripts = state.transcripts ?? null;
      const provider = await resolveAIProvider();

      let curriculumData = await generateCurriculumStructure(
        meta,
        transcripts,
        provider,
        state.difficulty
      );

      if (!curriculumData.chapters || curriculumData.chapters.length === 0) {
        curriculumData = generateFallbackCurriculum(meta, state.difficulty, transcripts);
      }

      const nextState: CheckpointState = {
        ...state,
        // Transcript excerpts are now embedded onto lessons, so purge duplicate transcript array from checkpoint JSON
        transcripts: null,
        curriculumData,
      };

      const updated = await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "PROCESSING",
          checkpointStep: 2,
          progressPercentage: 55,
          currentStep: PIPELINE_STEPS[2].label,
          checkpointData: JSON.stringify(nextState),
          lockedUntil: null,
          errorLog: null,
        },
        include: { course: true },
      });

      return { advanced: true, job: formatGenerationJobPayload(updated) };
    }

    // -------------------------------------------------------------
    // STEP 3: Generating lesson quizzes & placement test
    // -------------------------------------------------------------
    if (existing.checkpointStep === 2) {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          currentStep: PIPELINE_STEPS[2].label,
          progressPercentage: Math.max(existing.progressPercentage, 65),
        },
      });

      const meta = state.meta;
      const curriculumData = state.curriculumData;
      const provider = await resolveAIProvider();
      const isExternalProvider = isExternalAIProvider(provider);
      const llmQuizDeadlineMs = Date.now() + 20_000;

      const flatLessons: { cIdx: number; lIdx: number; chapterTitle: string; lesson: RawLesson }[] = [];
      for (let cIdx = 0; cIdx < curriculumData.chapters.length; cIdx++) {
        const chap = curriculumData.chapters[cIdx];
        for (let lIdx = 0; lIdx < chap.lessons.length; lIdx++) {
          flatLessons.push({
            cIdx,
            lIdx,
            chapterTitle: chap.title,
            lesson: chap.lessons[lIdx],
          });
        }
      }

      const QUIZ_LLM_CONCURRENCY = 4;
      for (let i = 0; i < flatLessons.length; i += QUIZ_LLM_CONCURRENCY) {
        const batch = flatLessons.slice(i, i + QUIZ_LLM_CONCURRENCY);
        const batchQuizzes = await Promise.all(
          batch.map((item) =>
            resolveLessonQuizzesAsync(
              item.lesson,
              meta.title,
              item.chapterTitle,
              item.lIdx,
              isExternalProvider && Date.now() < llmQuizDeadlineMs
            )
          )
        );
        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];
          curriculumData.chapters[item.cIdx].lessons[item.lIdx] = {
            ...item.lesson,
            quizQuestions: batchQuizzes[j],
            // Trim raw transcriptExcerpt once quiz is generated to keep checkpoint compact
            transcriptExcerpt: undefined,
          };
        }
      }

      let placementQuestions = curriculumData.placementQuestions || [];
      if (isExternalProvider) {
        const llmPlacement = await generatePlacementWithLLM(
          curriculumData,
          meta.title,
          state.difficulty,
          provider
        ).catch(() => null);
        if (llmPlacement && llmPlacement.length >= 3) {
          placementQuestions = llmPlacement;
        }
      }
      if (placementQuestions.length < 3) {
        placementQuestions = generateFallbackPlacement(curriculumData);
      }
      curriculumData.placementQuestions = placementQuestions;

      const nextState: CheckpointState = {
        ...state,
        curriculumData,
      };

      const updated = await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "PROCESSING",
          checkpointStep: 3,
          progressPercentage: 80,
          currentStep: PIPELINE_STEPS[3].label,
          checkpointData: JSON.stringify(nextState),
          lockedUntil: null,
          errorLog: null,
        },
        include: { course: true },
      });

      return { advanced: true, job: formatGenerationJobPayload(updated) };
    }

    // -------------------------------------------------------------
    // STEP 4: Finalizing course structure (idempotent bulk persist)
    // -------------------------------------------------------------
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        currentStep: PIPELINE_STEPS[3].label,
        progressPercentage: Math.max(existing.progressPercentage, 88),
      },
    });

    const meta = state.meta;
    const curriculumData = state.curriculumData;
    const nowTime = new Date();

    const chapterRows: {
      id: string;
      courseId: string;
      orderIndex: number;
      title: string;
      description: string;
    }[] = [];
    const lessonRows: {
      id: string;
      chapterId: string;
      orderIndex: number;
      title: string;
      description: string;
      youtubeVideoId: string;
      startSeconds: number;
      endSeconds: number;
      durationSeconds: number;
      summary: string;
      keyTakeaways: string;
      importantDefinitions: string;
      status: string;
      updatedAt: Date;
    }[] = [];
    const quizQuestionRows: {
      id: string;
      lessonId: string;
      orderIndex: number;
      questionText: string;
      correctOptionIndex: number;
      explanation: string;
      replayTimestampSeconds: number;
    }[] = [];
    const quizOptionRows: {
      id: string;
      questionId: string;
      optionIndex: number;
      optionText: string;
    }[] = [];

    for (let cIdx = 0; cIdx < curriculumData.chapters.length; cIdx++) {
      const c = curriculumData.chapters[cIdx];
      const chapterId = makeId();
      chapterRows.push({
        id: chapterId,
        courseId: course.id,
        orderIndex: cIdx,
        title: c.title,
        description: c.description || (cIdx === 0 ? "Foundational concepts and overview." : ""),
      });

      for (let lIdx = 0; lIdx < c.lessons.length; lIdx++) {
        const l = c.lessons[lIdx];
        const lessonId = makeId();
        const startSec = l.startSeconds ?? 0;
        const endSec = l.endSeconds ?? Math.min(600, meta.durationSeconds);

        lessonRows.push({
          id: lessonId,
          chapterId,
          orderIndex: lIdx,
          title: l.title,
          description: l.description || l.summary || `Comprehensive lesson on ${l.title}.`,
          youtubeVideoId: videoId,
          startSeconds: startSec,
          endSeconds: endSec,
          durationSeconds: Math.max(30, endSec - startSec),
          summary: l.summary || l.description || `Comprehensive lesson on ${l.title}.`,
          keyTakeaways: JSON.stringify(l.keyTakeaways || []),
          importantDefinitions: JSON.stringify(l.importantDefinitions || []),
          status: "READY",
          updatedAt: nowTime,
        });

        const quizzes =
          Array.isArray(l.quizQuestions) && l.quizQuestions.length > 0
            ? l.quizQuestions
            : resolveLessonQuizzes(l, meta.title, c.title, lIdx);
        for (let qIdx = 0; qIdx < quizzes.length; qIdx++) {
          const q = quizzes[qIdx];
          const questionId = makeId();
          quizQuestionRows.push({
            id: questionId,
            lessonId,
            orderIndex: qIdx,
            questionText: q.questionText,
            correctOptionIndex: q.correctOptionIndex,
            explanation: q.explanation,
            replayTimestampSeconds: q.replayTimestampSeconds || startSec,
          });
          const opts = q.options || [];
          for (let optIdx = 0; optIdx < opts.length; optIdx++) {
            quizOptionRows.push({
              id: makeId(),
              questionId,
              optionIndex: optIdx,
              optionText: opts[optIdx],
            });
          }
        }
      }
    }

    const placementQuestions =
      curriculumData.placementQuestions && curriculumData.placementQuestions.length >= 3
        ? curriculumData.placementQuestions
        : generateFallbackPlacement(curriculumData);

    const placementQuestionRows: {
      id: string;
      courseId: string;
      orderIndex: number;
      topicName: string;
      questionText: string;
      correctOptionIndex: number;
      explanation: string;
    }[] = [];
    const placementOptionRows: {
      id: string;
      questionId: string;
      optionIndex: number;
      optionText: string;
    }[] = [];

    for (let pIdx = 0; pIdx < placementQuestions.length; pIdx++) {
      const pq = placementQuestions[pIdx];
      const pqId = makeId();
      placementQuestionRows.push({
        id: pqId,
        courseId: course.id,
        orderIndex: pIdx,
        topicName: cleanPlacementText(pq.topicName),
        questionText: cleanPlacementText(pq.questionText),
        correctOptionIndex: pq.correctOptionIndex,
        explanation: cleanPlacementText(pq.explanation),
      });
      for (let optIdx = 0; optIdx < pq.options.length; optIdx++) {
        placementOptionRows.push({
          id: makeId(),
          questionId: pqId,
          optionIndex: optIdx,
          optionText: cleanPlacementText(pq.options[optIdx]),
        });
      }
    }

    // Idempotent replace in case Step 4 had partially written before a crash/retry
    await prisma.chapter.deleteMany({ where: { courseId: course.id } });
    await prisma.placementQuestion.deleteMany({ where: { courseId: course.id } });

    await createManyInChunks(chapterRows, (data) => prisma.chapter.createMany({ data }));
    await createManyInChunks(lessonRows, (data) => prisma.lesson.createMany({ data }));
    await createManyInChunks(quizQuestionRows, (data) => prisma.quizQuestion.createMany({ data }));
    await createManyInChunks(quizOptionRows, (data) => prisma.quizOption.createMany({ data }));
    await createManyInChunks(placementQuestionRows, (data) =>
      prisma.placementQuestion.createMany({ data })
    );
    await createManyInChunks(placementOptionRows, (data) =>
      prisma.placementOption.createMany({ data })
    );

    await prisma.course.update({
      where: { id: course.id },
      data: { status: "READY" },
    });

    if (!existing.quotaCharged) {
      await prisma.subscription.updateMany({
        where: { userId: existing.userId },
        data: {
          monthlyGenerationsUsed: { increment: 1 },
          monthlyHoursUsedSeconds: { increment: meta.durationSeconds },
        },
      });
    }

    const completedJob = await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        checkpointStep: 4,
        progressPercentage: 100,
        currentStep: PIPELINE_STEPS[3].label,
        completedAt: new Date(),
        quotaCharged: true,
        lockedUntil: null,
        errorLog: null,
        checkpointData: null,
      },
      include: { course: true },
    });

    await createNotification({
      userId: existing.userId,
      title: `Your course is ready · ${completedJob.course.title}`,
      message: `${lessonRows.length} interactive lessons generated across ${chapterRows.length} day plan${chapterRows.length === 1 ? "" : "s"}. Jump back in anytime.`,
      type: "COURSE",
      linkUrl: `/courses/${completedJob.course.slug}`,
    });

    return {
      advanced: true,
      job: formatGenerationJobPayload(completedJob),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Course generation step failed:", { jobId, step: existing.checkpointStep + 1, errorMsg });

    const failedJob = await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorLog: errorMsg,
        lockedUntil: null,
      },
      include: { course: true },
    });

    await prisma.course.update({
      where: { id: course.id },
      data: { status: "FAILED" },
    });

    return {
      advanced: false,
      job: formatGenerationJobPayload(failedJob),
    };
  }
}

/**
 * Advances a GenerationJob sequentially up to `maxSteps` or `timeBudgetMs`.
 * Ideal for Next.js `after()` background execution and full-run admin/roadmap calls.
 */
export async function advanceCourseGenerationJob(
  jobId: string,
  options?: { maxSteps?: number; timeBudgetMs?: number }
): Promise<ReturnType<typeof formatGenerationJobPayload> | null> {
  const maxSteps = options?.maxSteps ?? 4;
  const deadline = Date.now() + (options?.timeBudgetMs ?? 40_000);

  let latestJob: ReturnType<typeof formatGenerationJobPayload> | null = null;

  for (let i = 0; i < maxSteps; i++) {
    if (Date.now() >= deadline) break;

    const result = await runGenerationJobStep(jobId);
    latestJob = result.job;

    if (!result.job) break;
    if (result.job.status === "COMPLETED" || result.job.status === "FAILED") {
      break;
    }
    if (!result.advanced) {
      break;
    }
  }

  return latestJob;
}

/**
 * Resumes a FAILED GenerationJob strictly from its last persisted checkpointStep without consuming quota.
 */
export async function retryCourseGenerationJob(jobId: string): Promise<{
  resumedFromStep: number;
  job: ReturnType<typeof formatGenerationJobPayload>;
}> {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: { course: true },
  });

  if (!job) {
    throw new Error("Generation job not found.");
  }

  if (job.status === "COMPLETED") {
    return {
      resumedFromStep: 4,
      job: formatGenerationJobPayload(job),
    };
  }

  const nextStepIdx = Math.min(3, Math.max(0, job.checkpointStep));
  const nextStepMeta = PIPELINE_STEPS[nextStepIdx];

  await prisma.course.update({
    where: { id: job.courseId },
    data: { status: "PROCESSING" },
  });

  const resetJob = await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: "PENDING",
      errorLog: null,
      lockedUntil: null,
      currentStep: nextStepMeta.label,
      progressPercentage: Math.max(10, job.progressPercentage),
    },
    include: { course: true },
  });

  return {
    resumedFromStep: nextStepMeta.step,
    job: formatGenerationJobPayload(resetJob),
  };
}

/**
 * Synchronous end-to-end wrapper preserved for admin and roadmap callers.
 */
export async function generateCourse(params: GenerateCourseParams): Promise<GenerationResult> {
  const initResult = await initializeCourseGenerationJob(params);
  if (initResult.isExisting || initResult.status === "COMPLETED" || !initResult.jobId) {
    return initResult;
  }

  const finalJob = await advanceCourseGenerationJob(initResult.jobId, {
    maxSteps: 4,
    timeBudgetMs: 54_000,
  });

  if (!finalJob) {
    throw new Error("Generation failed: job state could not be read.");
  }

  if (finalJob.status === "FAILED") {
    throw new Error(`Generation failed: ${finalJob.errorLog || "Unknown error"}`);
  }

  if (finalJob.status !== "COMPLETED") {
    // Finish any leftover steps cleanly when invoked synchronously outside HTTP polling
    const followUp = await advanceCourseGenerationJob(initResult.jobId, {
      maxSteps: 4,
      timeBudgetMs: 54_000,
    });
    if (followUp?.status === "FAILED") {
      throw new Error(`Generation failed: ${followUp.errorLog || "Unknown error"}`);
    }
    if (followUp?.status !== "COMPLETED") {
      throw new Error("Generation timed out before finalizing course structure.");
    }
  }

  const updatedCourse = await prisma.course.findUnique({
    where: { id: initResult.courseId },
    select: { id: true, slug: true, title: true },
  });

  return {
    success: true,
    jobId: initResult.jobId,
    slug: updatedCourse?.slug || initResult.slug,
    courseId: initResult.courseId,
    course: updatedCourse || initResult.course,
    isExisting: false,
    status: "COMPLETED",
    message: "Course successfully generated and ready for learning!",
  };
}

// ----------------------------------------------------
// AI Synthesis and Fallback Helpers
// ----------------------------------------------------

export interface RawQuizQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  replayTimestampSeconds: number;
}

export interface RawLesson {
  title: string;
  description: string;
  startSeconds: number;
  endSeconds: number;
  summary: string;
  keyTakeaways: string[];
  importantDefinitions: string[];
  quizQuestions: RawQuizQuestion[];
  transcriptExcerpt?: string;
}

export interface RawChapter {
  title: string;
  description: string;
  lessons: RawLesson[];
}

export interface RawPlacementQuestion {
  topicName: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface RawCurriculum {
  chapters: RawChapter[];
  placementQuestions?: RawPlacementQuestion[];
}

interface ConceptEntry {
  keywords: string[];
  term: string;
  definition: string;
  takeaway: string;
  question?: {
    prompt: string;
    correct: string;
    distractors: [string, string, string];
    explanation: string;
  };
}

const KNOWLEDGE_GLOSSARY: ConceptEntry[] = [
  {
    keywords: ["langgraph", "stategraph", "cyclic graph", "agent graph"],
    term: "LangGraph StateGraph",
    definition: "Graph-based orchestration framework that models agent execution as stateful nodes and conditional/cyclic edges.",
    takeaway: "Design agent workflows explicitly using typed state schemas, nodes, and conditional routing edges.",
    question: {
      prompt: "Why is LangGraph preferred over simple linear chains for complex agent workflows?",
      correct: "It supports cyclic graphs, shared mutable state, conditional branching, and durable checkpointing.",
      distractors: [
        "It compiles Python models directly into browser WebAssembly binaries without APIs",
        "It restricts agents to a single deterministic prompt without memory or retries",
        "It eliminates the need for structured inputs or state validation",
      ],
      explanation: "LangGraph enables cyclic reasoning loops, shared state updates, branching logic, and durable execution.",
    },
  },
  {
    keywords: ["langchain"],
    term: "LangChain Orchestration",
    definition: "Composable framework for connecting LLMs with prompts, structured parsers, retrievers, and callable external tools.",
    takeaway: "Compose prompts, models, parsers, and tool interfaces cleanly via modular LangChain abstractions.",
  },
  {
    keywords: ["multi-agent", "multi agent", "supervisor", "agentic"],
    term: "Multi-Agent System",
    definition: "Architecture where specialized autonomous agents collaborate, delegate subtasks, and share state to solve complex goals.",
    takeaway: "Decompose complex goals across specialized agents with well-defined handoff contracts and guardrails.",
    question: {
      prompt: "What core architectural advantage does a Multi-Agent System offer over a single monolithic prompt?",
      correct: "Focused toolsets, separation of responsibilities, and specialized verification across coordinated agents.",
      distractors: [
        "Guaranteeing zero token consumption regardless of conversation length",
        "Bypassing all network requests and executing without model weights",
        "Storing every user secret directly inside public system prompts",
      ],
      explanation: "Splitting responsibilities across focused agents improves reliability, tool accuracy, and maintainability.",
    },
  },
  {
    keywords: ["pydantic", "validation", "structured", "schema"],
    term: "Pydantic Schema Validation",
    definition: "Runtime type validation and data parsing layer enforcing strict JSON structures on LLM inputs and tool outputs.",
    takeaway: "Enforce runtime schemas and typed contracts with Pydantic to catch malformed payloads early.",
    question: {
      prompt: "What role does Pydantic play in reliable AI agent engineering?",
      correct: "It enforces strict runtime schema validation and type-safe parsing on inputs, state, and structured LLM outputs.",
      distractors: [
        "It trains custom transformer weights from scratch inside SQL tables",
        "It disables exception handling to prevent validation errors from surfacing",
        "It compresses video frames into PNG sprites for embedding models",
      ],
      explanation: "Pydantic ensures downstream agent steps receive valid, strongly typed structures instead of brittle free-form text.",
    },
  },
  {
    keywords: ["async", "asynchronous", "await", "asyncio", "concurrent", "parallel"],
    term: "Asynchronous / Parallel Execution",
    definition: "Non-blocking execution pattern enabling concurrent I/O calls, parallel branches, and lower end-to-end latency.",
    takeaway: "Use async I/O and parallel graph branches to run independent model and tool calls concurrently.",
  },
  {
    keywords: ["sequential", "conditional", "iterative", "loop", "routing"],
    term: "Workflow Control Flow",
    definition: "Execution topology combining linear stages, conditional branches, and iterative feedback loops until termination criteria pass.",
    takeaway: "Combine sequential pipelines, conditional routers, and bounded retry loops for predictable convergence.",
  },
  {
    keywords: ["persistence", "memory", "thread", "threading", "checkpoint"],
    term: "State Persistence & Checkpointing",
    definition: "Saving conversation threads and graph execution state to durable storage so sessions can pause, replay, and resume.",
    takeaway: "Persist thread-scoped checkpoints cleanly to support multi-turn continuity and failure recovery.",
    question: {
      prompt: "Why do production agentic chatbots require thread-scoped persistence and checkpointing?",
      correct: "To preserve conversation history across requests, isolate sessions by thread ID, and resume interrupted graphs safely.",
      distractors: [
        "To reset every session variable to null after each token generated",
        "To expose all users' private chat threads in a shared global variable",
        "To replace HTTP APIs with static HTML files",
      ],
      explanation: "Checkpointing keyed by thread ID keeps multi-user memory isolated and allows stateful resumption.",
    },
  },
  {
    keywords: ["stream", "streaming"],
    term: "Token & Event Streaming",
    definition: "Incrementally emitting partial model tokens and node state events in real time to improve perceived responsiveness.",
    takeaway: "Stream graph state transitions and token deltas incrementally rather than blocking on complete execution.",
  },
  {
    keywords: ["tool", "tools", "mcp", "function calling"],
    term: "Tool Integration & Function Calling",
    definition: "Binding typed external APIs, search providers, and databases as schema-validated actions an agent can invoke dynamically.",
    takeaway: "Define clear tool docstrings, strict parameter schemas, and safe error handling around external tool calls.",
  },
  {
    keywords: ["rag", "retrieval", "chromadb", "vector", "embedding"],
    term: "Retrieval-Augmented Generation (RAG)",
    definition: "Grounding LLM responses in domain documents indexed via vector embeddings and semantic similarity search.",
    takeaway: "Chunk, embed, and retrieve relevant context from vector stores before synthesis to minimize hallucinations.",
    question: {
      prompt: "How does Retrieval-Augmented Generation (RAG) improve domain accuracy in an agentic chatbot?",
      correct: "It queries embedded knowledge chunks semantically and injects grounded context into the model prompt.",
      distractors: [
        "It re-trains the foundation model weights on every single user query",
        "It deletes source documents immediately after parsing headings",
        "It forces the model to ignore retrieved evidence and answer from memory alone",
      ],
      explanation: "RAG combines vector similarity retrieval with generation so responses stay grounded in current, authoritative data.",
    },
  },
  {
    keywords: ["hitl", "human-in-the-loop", "human in the loop", "approval", "interrupt"],
    term: "Human-in-the-Loop (HITL)",
    definition: "Pausing stateful workflows via interrupts so a human reviewer can approve, inspect, or edit actions before side effects run.",
    takeaway: "Gate high-risk tool actions behind HITL interrupts and persisted checkpoints before committing changes.",
  },
  {
    keywords: ["langsmith", "monitor", "monitoring", "observability", "tracing"],
    term: "LLM Observability & Tracing",
    definition: "End-to-end inspection of prompts, token latency, tool payloads, and evaluation traces via telemetry like LangSmith.",
    takeaway: "Instrument trace spans around every node and LLM call to diagnose regressions, cost, and latency bottlenecks.",
  },
  {
    keywords: ["docker", "ci/cd", "github actions", "aws", "render", "deploy", "deployment"],
    term: "Containerized CI/CD Deployment",
    definition: "Packaging reproducible Docker images, running automated GitHub Actions checks, and shipping reliably to cloud targets like AWS or Render.",
    takeaway: "Containerize dependencies deterministically and automate build, health checks, and secret injection in CI/CD.",
    question: {
      prompt: "What is the primary benefit of packaging an agent service with Docker and CI/CD pipelines before cloud deployment?",
      correct: "Consistent runtime dependencies across environments and automated, repeatable verification before release.",
      distractors: [
        "Storing plain-text production API keys inside version-controlled source files",
        "Eliminating the need for environment health checks or rollback procedures",
        "Requiring manual SSH edits on every server for each minor code tweak",
      ],
      explanation: "Docker ensures environment parity while CI/CD automates repeatable build, test, and deployment stages.",
    },
  },
  {
    keywords: ["fastapi", "postgresql", "postgres", "sqlalchemy", "groq"],
    term: "Backend API & Relational Storage",
    definition: "Exposing typed REST endpoints (e.g., FastAPI) backed by transactional PostgreSQL/SQLAlchemy models and low-latency inference APIs.",
    takeaway: "Decouple stateless HTTP request handlers from connection-pooled database persistence and strict schema validation.",
  },
  {
    keywords: ["node.js", "nodejs", "express", "middleware", "npm", "commonjs", "eventemitter"],
    term: "Node.js & Express Middleware",
    definition: "Event-driven JavaScript server runtime pairing non-blocking I/O with Express route handlers and composable request/error middleware.",
    takeaway: "Keep Node.js event loops non-blocking, isolate route middleware cleanly, and validate inputs before database mutations.",
  },
  {
    keywords: ["mongodb", "mongoose", "crud", "jwt", "cookies", "bcrypt"],
    term: "Auth & Async Document CRUD",
    definition: "Securing REST endpoints with hashed credentials, short-lived JWT access tokens + httpOnly refresh cookies, and Mongoose schema models.",
    takeaway: "Verify JWT signatures and role claims in middleware while keeping async Mongoose CRUD operations wrapped in explicit error handling.",
  },
  {
    keywords: ["llm", "llms", "chatgpt", "token", "evolution", "agentic"],
    term: "LLM-to-Agentic Evolution",
    definition: "Progression from single-turn stateless completions to autonomous goal-driven loops equipped with memory, planning, and tools.",
    takeaway: "Distinguish passive text generation pipelines from goal-directed agent loops capable of inspecting feedback.",
  },
  {
    keywords: ["hacking", "security", "penetration", "network", "recon", "exploit", "vulnerability"],
    term: "Offensive & Defensive Security Hygiene",
    definition: "Systematic reconnaissance, vulnerability validation, least-privilege hardening, and remediating attack surfaces safely.",
    takeaway: "Document threat models systematically and validate remediations within authorized scope.",
  },
  {
    keywords: ["system design", "caching", "cache", "redis", "cdn", "load", "scalability", "microservices"],
    term: "Scalable Distributed Architecture",
    definition: "Balancing throughput, fault tolerance, caching layers, partitioning strategies, and horizontal service scaling.",
    takeaway: "Evaluate latency vs consistency tradeoffs carefully when introducing caches, queues, and replicated storage.",
  },
];

type CourseDomain =
  | "agentic"
  | "genai"
  | "system_design"
  | "backend"
  | "cybersecurity"
  | "data"
  | "frontend"
  | "python"
  | "general";

const DOMAIN_TOPIC_POOLS: Record<CourseDomain, { themes: string[]; lessons: string[] }> = {
  agentic: {
    themes: [
      "Agentic AI Foundations & Execution Loops",
      "Schema Validation, Async & Tooling",
      "LangChain Single & Multi-Agent Patterns",
      "LangGraph State, Nodes & Routing",
      "Workflows: Sequential, Parallel & Conditional",
      "Memory, Threading & Durable Persistence",
      "Streaming, Tool Calling & RAG Grounding",
      "Human-in-the-Loop & Observability",
      "FastAPI, Databases & Container Packaging",
      "Cloud CI/CD & Production Capstone Systems",
    ],
    lessons: [
      "Course Roadmap, Agentic Architecture & Environment Setup",
      "Evolution from Static LLMs to Autonomous Agent Loops",
      "Core Agent Components: Reasoning, Planning, Memory & Tools",
      "Asynchronous Programming & Non-Blocking I/O for Agents",
      "Pydantic Data Validation & Structured LLM Outputs",
      "Prompt Contracts, Tool Schemas & Output Parsers",
      "Single-Agent Orchestration & ReAct Reasoning Loops",
      "Multi-Agent Collaboration, Supervisor & Handoff Patterns",
      "Graph-Based Orchestration: StateSchemas, Nodes & Edges",
      "Sequential & Conditional Graph Routing Workflows",
      "Parallel Fan-Out / Fan-In Execution & Aggregation",
      "Iterative Self-Correction, Critics & Termination Guards",
      "Short-Term Thread Memory vs Long-Term Knowledge State",
      "Durable Checkpointing with Relational Databases",
      "Real-Time Token & Event Streaming to Client Apps",
      "Integrating External Search, Code & API Tools Safely",
      "Vector Embeddings, Chunking & RAG Pipeline Integration",
      "Human-in-the-Loop (HITL) Interrupts & Approval Gates",
      "Tracing, Evaluation & Latency Monitoring with Telemetry",
      "FastAPI Backend Exposure & Session Thread APIs",
      "Docker Containerization & Reproducible Build Environments",
      "CI/CD Automation, Secrets Hygiene & Cloud Deployment",
      "Capstone Architecture: End-to-End Conversational Agent",
      "Capstone Verification, Load Testing & Production Checklist",
    ],
  },
  genai: {
    themes: [
      "LLM Foundations & Transformer Mechanics",
      "Prompt Engineering & Structured Extraction",
      "Embeddings, Vector Stores & RAG Pipelines",
      "Function Calling & Agent Workflows",
      "Evaluation, Safety & Guardrails",
      "Production Inference & Deployment",
    ],
    lessons: [
      "Generative AI Landscape, Use Cases & Setup",
      "Tokenization, Context Windows & Sampling Parameters",
      "Zero-Shot, Few-Shot & Chain-of-Thought Prompting",
      "Structured JSON Generation & Schema Validation",
      "Text Embeddings & Semantic Similarity Search",
      "Document Ingestion, Chunking & Indexing Pipelines",
      "Hybrid Retrieval, Reranking & Context Injection",
      "Tool Integration & External API Function Calling",
      "Conversational Memory Management & Summarization",
      "Hallucination Mitigation, Evaluation Metrics & Guardrails",
      "Streaming API Design & Rate-Limit Resilience",
      "Deploying Scalable GenAI Applications to Production",
    ],
  },
  system_design: {
    themes: [
      "Scalability Fundamentals & Capacity Planning",
      "Networking, DNS, Load Balancing & CDNs",
      "Databases, Sharding & Replication",
      "Caching, Queues & Event-Driven Systems",
      "Microservices, Resilience & Observability",
      "Real-World Architecture Case Studies",
    ],
    lessons: [
      "Requirements Gathering, SLAs & Back-of-Envelope Estimation",
      "HTTP/REST, gRPC, WebSockets & API Gateway Design",
      "DNS Resolution, Anycast, Reverse Proxies & CDNs",
      "Load Balancing Algorithms & Health Check Mechanics",
      "Relational vs NoSQL Tradeoffs & Indexing Internals",
      "Replication Topologies, Partitioning & Consistent Hashing",
      "Distributed Caching Patterns (Cache-Aside, Write-Through, Redis)",
      "Message Brokers, Async Workers & Backpressure Handling",
      "Rate Limiting, Idempotency Keys & Circuit Breakers",
      "Distributed Transactions, Consistency Models & CAP Theorem",
      "Monitoring, Distributed Tracing & Log Aggregation",
      "Case Study: High-Throughput Feed, Chat & URL Shortener",
    ],
  },
  backend: {
    themes: [
      "Server Architecture & Core API Design",
      "Database Modeling & ORM Query Optimization",
      "Authentication, Security & Validation",
      "Caching, Background Jobs & Docker",
      "Testing, CI/CD & Production Deployment",
    ],
    lessons: [
      "Project Architecture, Routing & Request Lifecycle",
      "RESTful API Design, DTOs & Input Validation",
      "Relational Data Modeling, Migrations & Connection Pooling",
      "Query Optimization, Transactions & Error Handling",
      "Authentication: JWTs, Sessions, Hashing & RBAC",
      "Redis Caching, Rate Limiting & Queue Processing",
      "Dockerfiles, Compose & Multi-Stage Production Images",
      "Integration Testing, Structured Logging & Deployment",
    ],
  },
  cybersecurity: {
    themes: [
      "Security Foundations & Lab Setup",
      "Networking & Active Reconnaissance",
      "Vulnerability Scanning & Enumeration",
      "Web Application Security & OWASP Top 10",
      "Exploitation Mechanics & Privilege Analysis",
      "Hardening, Incident Response & Reporting",
    ],
    lessons: [
      "Security Ethics, Rules of Engagement & Isolated Lab Setup",
      "TCP/IP Networking, Packet Inspection & Firewall Fundamentals",
      "Passive OSINT & Subdomain Reconnaissance Techniques",
      "Active Port Scanning, Service Fingerprinting & Enumeration",
      "Web Traffic Interception, Proxies & Session Mechanics",
      "Injection Flaws, Broken Access Control & Input Hardening",
      "Authentication Weaknesses, Cryptography & TLS Hygiene",
      "Post-Exploitation Analysis, Remediation & Professional Reporting",
    ],
  },
  data: {
    themes: [
      "Data Foundations & Cleaning Workflows",
      "Transformations, Formulas & Aggregations",
      "Exploratory Modeling & Statistical Insight",
      "Dashboards, Reporting & Automation",
    ],
    lessons: [
      "Data Environment Setup & Schema Inspection",
      "Data Cleaning, Deduplication & Type Normalization",
      "Filtering, Grouping, Lookup Joins & Pivot Aggregations",
      "Time-Series Trends, Cohort Metrics & Summary Tables",
      "KPI Storytelling, Visual Hierarchy & Interactive Reports",
      "Automating Recurring Analysis & Export Pipelines",
    ],
  },
  frontend: {
    themes: [
      "Modern UI Foundations & Type Safety",
      "Component Architecture & State Management",
      "Routing, Data Fetching & Caching",
      "Accessibility, Performance & Deployment",
    ],
    lessons: [
      "Modern Project Structure, Tooling & Responsive Layout",
      "Component Composition, Props Contracts & Semantic Markup",
      "Client State, Forms Validation & Optimistic Updates",
      "Async Data Fetching, Error Boundaries & Loading Skeletons",
      "Performance Profiling, Bundle Optimization & Deployment",
    ],
  },
  python: {
    themes: [
      "Core Fundamentals & Setup",
      "Data Types, Operators & Control Flow",
      "Data Structures & Modular Functions",
      "OOP, Files & Exception Handling",
      "Modern Tooling & Capstone Implementation",
    ],
    lessons: [
      "Python Setup, Interpreter Execution & Core Syntax",
      "Variables, Primitive Types & String Manipulation",
      "Conditionals, Iteration Loops & Flow Control",
      "Lists, Tuples, Sets & Dictionary Hash Maps",
      "Functions, Scope, Arguments & Comprehensions",
      "File I/O, Context Managers & Exception Handling",
      "Object-Oriented Programming: Classes & Inheritance",
      "Modules, Virtual Environments, APIs & Final Project",
    ],
  },
  general: {
    themes: [
      "Foundational Concepts & Setup",
      "Core Building Blocks & Patterns",
      "Applied Workflows & Tooling",
      "Intermediate Architecture & Integration",
      "Optimization, Debugging & Testing",
      "Capstone Implementation & Best Practices",
    ],
    lessons: [
      "Course Introduction, Roadmap & Workspace Setup",
      "Core Principles, Terminology & Execution Model",
      "Foundational Patterns & Step-by-Step Walkthrough",
      "Working with Structured Inputs, State & Data Flow",
      "Modular Design, Abstraction & Reusable Components",
      "Handling Edge Cases, Validation & Diagnostics",
      "Integrating External Services, Storage & Workflows",
      "Testing, Performance Verification & Production Readiness",
    ],
  },
};

function detectCourseDomain(title: string, description = ""): CourseDomain {
  const haystack = `${title} ${description}`.toLowerCase();
  if (/agentic|langgraph|langchain|multi-agent|crewai|autogen|ai agent|mcp/.test(haystack)) return "agentic";
  if (/generative ai|genai|llm|rag|prompt|chatgpt|openai|gemini|transformer/.test(haystack)) return "genai";
  if (/system design|distributed|caching|cdn|load balanc|sharding|scalability/.test(haystack)) return "system_design";
  if (/hacking|penetration|pentest|cyber|security|kali|wireshark|exploit/.test(haystack)) return "cybersecurity";
  if (/backend|node\.?js|nodejs|fastapi|express|nestjs|mongoose|redis|docker|kubernetes|microservice/.test(haystack)) return "backend";
  if (/excel|power bi|tableau|pandas|analytics|data science|sql/.test(haystack)) return "data";
  if (/react|next\.?js|javascript|typescript|frontend|tailwind|html|css/.test(haystack)) return "frontend";
  if (/python|codewithharry|cs50p/.test(haystack)) return "python";
  return "general";
}

function extractTranscriptExcerpt(
  transcripts: TranscriptSegment[] | null,
  startSeconds: number,
  endSeconds: number,
  maxChars = 340
): string {
  if (!transcripts || transcripts.length === 0) return "";
  const matched = transcripts.filter(
    (seg) => seg.start >= startSeconds && seg.start < endSeconds
  );
  if (matched.length === 0) return "";
  const combined = matched
    .map((s) => s.text.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (combined.length <= maxChars) return combined;
  return `${combined.slice(0, maxChars).replace(/\s+\S*$/, "")}...`;
}

function matchesGlossaryKeyword(lowerText: string, rawKw: string): boolean {
  const kw = rawKw.trim().toLowerCase();
  if (!kw) return false;
  if (/^[a-z0-9_.-]+$/.test(kw)) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z0-9_])${escaped}(?:$|[^a-z0-9_])`).test(lowerText);
  }
  return lowerText.includes(kw);
}

function matchConceptsForText(text: string): ConceptEntry[] {
  const lower = text.toLowerCase();
  const hits: ConceptEntry[] = [];
  for (const entry of KNOWLEDGE_GLOSSARY) {
    if (entry.keywords.some((kw) => matchesGlossaryKeyword(lower, kw))) {
      hits.push(entry);
    }
  }
  return hits;
}

function cleanConceptTopic(rawTitle: string): string {
  return rawTitle
    .replace(/^\d+[\.\:\-]\s*/, "")
    .replace(/\s*\(Part\s*\d+(?:\s*of\s*\d+)?[:\s]*[^)]*\)\s*/gi, "")
    .replace(/^(Project|Module|Chapter|Day\s*\d+)\s*:\s*/i, "")
    .trim();
}

function extractCourseDescriptionFocus(description = ""): string {
  if (!description) return "";
  const firstPara = description
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find(
      (l) =>
        l.length > 40 &&
        !/^https?:\/\//i.test(l) &&
        !/chapters|subscribe|support|thanks/i.test(l)
    );
  if (!firstPara) return "";
  return firstPara.length > 220 ? `${firstPara.slice(0, 217).trim()}...` : firstPara;
}

interface SegmentAIEnrichment {
  title?: string;
  description?: string;
  summary?: string;
  keyTakeaways?: string[];
  importantDefinitions?: string[];
}

function buildDetailedLessonContent(params: {
  title: string;
  startSeconds: number;
  endSeconds: number;
  lessonIndex: number;
  prevTitle?: string;
  nextTitle?: string;
  courseTitle: string;
  courseDescription?: string;
  transcripts: TranscriptSegment[] | null;
  subTopics?: string[];
  aiEnrichment?: SegmentAIEnrichment;
}): RawLesson {
  const {
    title,
    startSeconds,
    endSeconds,
    lessonIndex,
    prevTitle,
    nextTitle,
    courseTitle,
    courseDescription,
    transcripts,
    subTopics = [],
    aiEnrichment,
  } = params;

  const cleanTopic = cleanConceptTopic(title) || title;
  const cleanSubTopics = subTopics
    .map((s) => cleanConceptTopic(s) || s.trim())
    .filter((s, idx, arr) => Boolean(s) && arr.indexOf(s) === idx);
  const durMin = Math.max(1, Math.round((endSeconds - startSeconds) / 60));
  const clockStart = formatClockTimestamp(startSeconds);
  const clockEnd = formatClockTimestamp(endSeconds);
  const concepts = matchConceptsForText(
    `${title} ${cleanSubTopics.join(" ")} ${courseTitle}`
  );
  const primaryConcept = concepts[0];
  const transcriptSnippet = extractTranscriptExcerpt(transcripts, startSeconds, endSeconds);
  const courseLead = extractCourseDescriptionFocus(courseDescription);

  const descriptionParts = aiEnrichment?.description?.trim()
    ? [aiEnrichment.description.trim()]
    : [
        `Explore ${cleanTopic} (${clockStart} – ${clockEnd}, ${durMin} min) with practical architecture walkthroughs tailored to ${courseTitle.split(/[|–—-]/)[0].trim()}.`,
      ];
  if (!aiEnrichment?.description?.trim()) {
    if (cleanSubTopics.length > 1) {
      descriptionParts.push(
        `Topics covered: ${cleanSubTopics.slice(0, 7).join(" · ")}.`
      );
    } else if (primaryConcept) {
      descriptionParts.push(primaryConcept.definition);
    } else if (nextTitle) {
      descriptionParts.push(`Connects directly into "${cleanConceptTopic(nextTitle)}" as the system scales.`);
    }
  }

  const summaryParts = aiEnrichment?.summary?.trim()
    ? [
        `[${clockStart} – ${clockEnd}] ${aiEnrichment.summary.trim()}`,
        ...(transcriptSnippet ? [`Spoken highlights from video: "${transcriptSnippet}"`] : []),
      ]
    : [
        `Segment Overview [${clockStart} – ${clockEnd}]: This ${durMin}-minute lesson breaks down ${cleanTopic}.`,
      ];
  if (!aiEnrichment?.summary?.trim()) {
    if (cleanSubTopics.length > 1) {
      summaryParts.push(
        `Sections inside this module: ${cleanSubTopics.slice(0, 8).join("; ")}.`
      );
    }
    if (concepts.length > 0) {
      summaryParts.push(
        `Key focus areas include ${concepts
          .slice(0, 3)
          .map((c) => c.term)
          .join(", ")}. ${concepts[0].definition}`
      );
    } else if (courseLead) {
      summaryParts.push(`Context within the curriculum: ${courseLead}`);
    }
    if (transcriptSnippet) {
      summaryParts.push(`Spoken highlights from video: "${transcriptSnippet}"`);
    } else if (prevTitle || nextTitle) {
      const flow: string[] = [];
      const formatRef = (t: string) => t.replace(/^\d+[\.\:\-]\s*/, "").trim();
      if (prevTitle) flow.push(`building upon "${formatRef(prevTitle)}"`);
      if (nextTitle) flow.push(`preparing for "${formatRef(nextTitle)}"`);
      summaryParts.push(`Curriculum progression: ${flow.join(" and ")}.`);
    }
  }

  const takeawaysSet = new Set<string>();
  const aiTakeaways = Array.isArray(aiEnrichment?.keyTakeaways)
    ? aiEnrichment.keyTakeaways
        .map((t) => (typeof t === "string" ? t.trim() : ""))
        .filter((t) => t.length >= 8)
    : [];
  for (const t of aiTakeaways.slice(0, 6)) {
    takeawaysSet.add(t);
  }
  if (takeawaysSet.size < 2) {
    for (const c of concepts.slice(0, 3)) {
      takeawaysSet.add(c.takeaway);
    }
    for (const sub of cleanSubTopics.slice(0, 5)) {
      const strippedSub = sub.replace(/\s*\(\d{1,2}:\d{2}(?::\d{2})?\)$/, "").trim();
      if (strippedSub.length >= 6 && takeawaysSet.size < 6) {
        takeawaysSet.add(`Apply practical workflows and core techniques for ${strippedSub}.`);
      }
    }
    takeawaysSet.add(`Understand the core mechanics and practical implementation of ${cleanTopic}.`);
    if (takeawaysSet.size < 3 && nextTitle) {
      takeawaysSet.add(`See how ${cleanTopic} integrates cleanly before moving to ${cleanConceptTopic(nextTitle)}.`);
    }
    if (takeawaysSet.size < 3) {
      takeawaysSet.add(`Review patterns, failure modes, and verifiable engineering checkpoints across this ${durMin}-minute module.`);
    }
  }

  const aiDefs = Array.isArray(aiEnrichment?.importantDefinitions)
    ? aiEnrichment.importantDefinitions
        .map((d) => (typeof d === "string" ? d.trim() : ""))
        .filter((d) => d.length >= 8 && d.includes(":"))
    : [];
  const definitions: string[] =
    aiDefs.length > 0
      ? aiDefs.slice(0, 4)
      : concepts.slice(0, 3).map((c) => `${c.term}: ${c.definition}`);
  if (cleanSubTopics.length > 1 && definitions.length < 4) {
    for (const sub of cleanSubTopics) {
      const strippedSub = sub.replace(/\s*\(\d{1,2}:\d{2}(?::\d{2})?\)$/, "").trim();
      if (strippedSub.length >= 8 && definitions.length < 4 && !definitions.some((d) => d.startsWith(`${strippedSub}:`))) {
        definitions.push(`${strippedSub}: Key section covered during ${sub}.`);
      }
    }
  }
  if (definitions.length === 0) {
    definitions.push(
      `${cleanTopic}: Core module taught from ${clockStart} to ${clockEnd} covering concepts, workflows, and practical code patterns.`
    );
  }
  if (definitions.length < 2) {
    definitions.push(
      `Production Reliability: Validating schemas, handling failure states gracefully, and keeping ${cleanTopic} modular.`
    );
  }

  const quizQuestions: RawQuizQuestion[] = synthesizeLessonQuizQuestions({
    title,
    description: descriptionParts.join(" "),
    summary: summaryParts.join(" "),
    keyTakeaways: Array.from(takeawaysSet).slice(0, 6),
    importantDefinitions: definitions.slice(0, 4),
    courseTitle,
    startSeconds,
    endSeconds,
    durationSeconds: Math.max(60, endSeconds - startSeconds),
    lessonIndex,
    transcriptExcerpt: transcriptSnippet,
  });

  return {
    title,
    description: descriptionParts.join(" "),
    startSeconds,
    endSeconds,
    summary: summaryParts.join(" "),
    keyTakeaways: Array.from(takeawaysSet).slice(0, 6),
    importantDefinitions: definitions.slice(0, 4),
    quizQuestions,
    transcriptExcerpt: transcriptSnippet || undefined,
  };
}

function getSubpartLabel(rawTitle: string, partIdx: number, totalParts: number): string {
  const isProject = /project|build|chatbot|planner|agent|deploy/i.test(rawTitle);
  const labels3 = isProject
    ? ["Architecture & Setup", "Core Workflow & Logic", "Integration & Walkthrough"]
    : ["Core Concepts & Setup", "Implementation Walkthrough", "Advanced Patterns & Wrap-Up"];
  const labels4 = isProject
    ? [
        "Architecture & Core Setup",
        "State, Agents & Business Logic",
        "APIs, Persistence & Integrations",
        "Testing, Deployment & Review",
      ]
    : [
        "Foundations & Mental Model",
        "Core Implementation",
        "Edge Cases & Integration",
        "Production Review",
      ];

  if (totalParts === 2) {
    return partIdx === 0 ? "Foundations & Setup" : "Hands-On Implementation";
  }
  if (totalParts === 3 && labels3[partIdx]) return labels3[partIdx];
  if (totalParts === 4 && labels4[partIdx]) return labels4[partIdx];
  return `Part ${partIdx + 1} of ${totalParts}`;
}

interface TimeSegment {
  title: string;
  startSeconds: number;
  endSeconds: number;
  subTopics?: string[];
  aiEnrichment?: SegmentAIEnrichment;
}

function isFillerChapterTitle(rawTitle: string): boolean {
  return /^(intro(duction)?|welcome|how to watch.*|overview|outro|conclusion|what to do next|wrap[- ]?up)$/i.test(
    cleanConceptTopic(rawTitle).trim()
  );
}

function pickConsolidatedTitle(bucket: TimeSegment[]): string {
  if (bucket.length === 1) return bucket[0].title;
  const cleanedAll = bucket
    .map((b) => cleanConceptTopic(b.title) || b.title.trim())
    .filter(Boolean);
  const substantive = cleanedAll.filter((t) => !isFillerChapterTitle(t));
  const pool = substantive.length > 0 ? substantive : cleanedAll;
  if (pool.length === 0) return bucket[0].title;
  if (pool.length === 1) return pool[0];

  const trimAnchor = (text: string) =>
    text
      .replace(/^FULL SETUP FROM SCRATCH:\s*/i, "")
      .replace(/^#?\d+\s*:\s*/i, "")
      .replace(/\s*\([^)]{6,}\)\s*$/g, "")
      .trim();

  const first = trimAnchor(pool[0]);
  const last = trimAnchor(pool[pool.length - 1]);
  if (first.toLowerCase() === last.toLowerCase()) return first;

  const combined = `${first} & ${last}`;
  if (combined.length <= 86) return combined;

  const stripBuildPrefix = (s: string) =>
    s.replace(/^(?:BUILD|Build|Offer Menu)(?:\s*#?\d+)?:\s*/i, "").trim();

  const compactFirst = stripBuildPrefix(first.split(/[|—–]/)[0].trim());
  const compactLast = stripBuildPrefix(last.split(/[|—–]/)[0].trim());
  const compactCombined =
    compactFirst.toLowerCase() === compactLast.toLowerCase()
      ? first.length <= 86
        ? first
        : compactFirst
      : `${compactFirst} & ${compactLast}`;
  if (compactCombined.length <= 86) return compactCombined;
  return `${compactCombined.slice(0, 83).trim()}...`;
}

function consolidateMicroSegments(
  segments: TimeSegment[],
  totalDuration: number
): TimeSegment[] {
  const totalSpan = Math.max(
    totalDuration,
    segments[segments.length - 1]?.endSeconds || 0
  );
  const avgSegSeconds = segments.length > 0 ? totalSpan / segments.length : 0;

  // Preserve normal multi-chapter videos (>= ~7m average or <= 15 markers);
  // only consolidate dense micro-timestamped marathons (e.g. 60+ 1-3m markers across 3h)
  if (segments.length < 16 || totalSpan < 2700 || avgSegSeconds >= 420) {
    return segments;
  }

  const MIN_MERGED_SECONDS = 540; // ~9 min target minimum study lesson
  const MAX_MERGED_SECONDS = 900; // ~15 min max per consolidated block
  const groupedBuckets: TimeSegment[][] = [];
  let bucket: TimeSegment[] = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const bucketStart = bucket[0].startSeconds;
    const bucketDur = bucket[bucket.length - 1].endSeconds - bucketStart;
    const combinedDur = seg.endSeconds - bucketStart;
    const segDur = seg.endSeconds - seg.startSeconds;

    if (
      combinedDur <= MAX_MERGED_SECONDS &&
      (bucketDur < MIN_MERGED_SECONDS || segDur < 180)
    ) {
      bucket.push(seg);
    } else {
      groupedBuckets.push(bucket);
      bucket = [seg];
    }
  }
  groupedBuckets.push(bucket);

  // Fold tiny trailing outro bucket into previous lesson if total stays <= 20m
  if (groupedBuckets.length >= 2) {
    const lastBucket = groupedBuckets[groupedBuckets.length - 1];
    const prevBucket = groupedBuckets[groupedBuckets.length - 2];
    const lastDur =
      lastBucket[lastBucket.length - 1].endSeconds - lastBucket[0].startSeconds;
    const mergedDur =
      lastBucket[lastBucket.length - 1].endSeconds - prevBucket[0].startSeconds;
    if (lastDur < 300 && mergedDur <= 1200) {
      prevBucket.push(...lastBucket);
      groupedBuckets.pop();
    }
  }

  return groupedBuckets.map((grp) => ({
    title: pickConsolidatedTitle(grp),
    startSeconds: grp[0].startSeconds,
    endSeconds: grp[grp.length - 1].endSeconds,
    subTopics:
      grp.length > 1
        ? grp.map(
            (s) =>
              `${cleanPlacementText(s.title) || s.title} (${formatClockTimestamp(
                s.startSeconds
              )})`
          )
        : undefined,
  }));
}

function normalizeAndSubdivideChapters(
  rawChapters: VideoChapter[],
  totalDuration: number
): TimeSegment[] {
  const sorted = [...rawChapters]
    .filter((c) => c.endSeconds > c.startSeconds)
    .sort((a, b) => a.startSeconds - b.startSeconds);

  if (sorted.length === 0) return [];

  const continuous: TimeSegment[] = [];

  // Prepend intro segment if chapters start well after 0:00
  if (sorted[0].startSeconds >= 120) {
    continuous.push({
      title: "Course Introduction & Prerequisites",
      startSeconds: 0,
      endSeconds: sorted[0].startSeconds,
    });
  }

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const start = Math.max(
      continuous.length > 0 ? continuous[continuous.length - 1].endSeconds : 0,
      cur.startSeconds
    );
    const nextStart = sorted[i + 1]?.startSeconds;
    const targetEnd =
      i === sorted.length - 1
        ? Math.max(totalDuration, cur.endSeconds)
        : nextStart && nextStart > start
        ? nextStart
        : cur.endSeconds;

    if (targetEnd > start) {
      continuous.push({
        title: cleanPlacementText(cur.title) || cur.title,
        startSeconds: start,
        endSeconds: targetEnd,
      });
    }
  }

  // Coalesce micro-fragmented multi-hour markers (1-2m clips) into 9-15m cohesive lessons
  const consolidated = consolidateMicroSegments(continuous, totalDuration);

  // Split oversized chapters (> 50 minutes = 3000s) into ~35-42 min focused lessons
  const MAX_CHAPTER_SECONDS = 3000;
  const IDEAL_SUBPART_SECONDS = 2400;
  const subdivided: TimeSegment[] = [];

  for (const seg of consolidated) {
    const dur = seg.endSeconds - seg.startSeconds;
    if (dur <= MAX_CHAPTER_SECONDS) {
      subdivided.push(seg);
      continue;
    }

    const partsCount = Math.min(10, Math.max(2, Math.ceil(dur / IDEAL_SUBPART_SECONDS)));
    const step = Math.floor(dur / partsCount);

    for (let p = 0; p < partsCount; p++) {
      const pStart = p === 0 ? seg.startSeconds : seg.startSeconds + p * step;
      const pEnd = p === partsCount - 1 ? seg.endSeconds : seg.startSeconds + (p + 1) * step;
      const phase = getSubpartLabel(seg.title, p, partsCount);
      subdivided.push({
        title: `${seg.title} (Part ${p + 1}: ${phase})`,
        startSeconds: pStart,
        endSeconds: pEnd,
      });
    }
  }

  return subdivided;
}

function buildDayTitle(dayNumber: number, lessons: TimeSegment[]): string {
  const cleanedTopics = lessons
    .map((l) =>
      cleanConceptTopic(l.title)
        .split(/[|–—]/)[0]
        .replace(/^What is\s+/i, "")
        .replace(/^How to\s+/i, "")
        .replace(/^BUILD(?:\s*#?\d+)?:\s*/i, "")
        .replace(/^#?\d+\s*:\s*/i, "")
        .replace(/^Build\s+(?:Your\s+Own\s+|Your\s+|End-to-End\s+|Permanent\s+)?/i, "")
        .replace(/^Add\s+/i, "")
        .replace(/^Implement\s+/i, "")
        .replace(/^Integrate\s+/i, "")
        .replace(/^Understand(?:ing)?\s+/i, "")
        .replace(/^Master\s+/i, "")
        .replace(/\s+using\s+.*$/i, "")
        .replace(/\s+with\s+.*$/i, "")
        .replace(/\s+in\s+Agentic Chatbot.*$/i, "")
        .trim()
    )
    .filter(Boolean);

  const uniqueTopics: string[] = [];
  for (const t of cleanedTopics) {
    if (!uniqueTopics.some((u) => u.toLowerCase() === t.toLowerCase())) {
      uniqueTopics.push(t);
    }
  }

  let focusLabel = "Core Concepts & Practice";
  if (uniqueTopics.length === 1) {
    focusLabel = uniqueTopics[0];
  } else if (uniqueTopics.length >= 2) {
    const combined = `${uniqueTopics[0]} & ${uniqueTopics[uniqueTopics.length - 1]}`;
    focusLabel = combined.length <= 54 ? combined : uniqueTopics[0];
  }

  if (focusLabel.length > 56) {
    focusLabel = `${focusLabel.slice(0, 53).trim()}...`;
  }

  return `Day ${dayNumber} (${focusLabel})`;
}

function partitionSegmentsIntoDays(
  segments: TimeSegment[],
  totalDuration: number,
  meta: { title: string; description?: string },
  transcripts: TranscriptSegment[] | null
): RawCurriculum {
  const effectiveTotal = Math.max(
    totalDuration,
    segments[segments.length - 1]?.endSeconds || 0
  );

  // ~2h daily study pacing for multi-hour courses; up to 14 days for 24h+ marathons
  let targetDaysCount = 1;
  if (effectiveTotal > 5400 && segments.length > 2) {
    const maxDays = effectiveTotal > 18 * 3600 ? 14 : 10;
    const rawDays = Math.round(effectiveTotal / (2 * 3600));
    targetDaysCount = Math.min(maxDays, Math.min(segments.length, Math.max(2, rawDays)));
  }

  const dayGroups: TimeSegment[][] = [];
  let cursor = 0;

  for (let d = 0; d < targetDaysCount; d++) {
    const remainingDaysAfterThis = targetDaysCount - 1 - d;
    if (remainingDaysAfterThis === 0) {
      dayGroups.push(segments.slice(cursor));
      break;
    }

    const idealEnd = ((d + 1) / targetDaysCount) * effectiveTotal;
    const group: TimeSegment[] = [];

    while (cursor < segments.length) {
      const remainingSegmentsAfterCur = segments.length - 1 - cursor;
      const curSeg = segments[cursor];

      // Always ensure at least 1 segment per remaining day
      if (group.length === 0) {
        group.push(curSeg);
        cursor++;
        if (remainingSegmentsAfterCur <= remainingDaysAfterThis) break;
        continue;
      }

      if (remainingSegmentsAfterCur < remainingDaysAfterThis) break;

      const prevEnd = group[group.length - 1].endSeconds;
      if (prevEnd >= idealEnd) break;

      // Pick whichever boundary (stopping before cur vs including cur) is closer to idealEnd
      const distBefore = Math.abs(idealEnd - prevEnd);
      const distAfter = Math.abs(curSeg.endSeconds - idealEnd);
      if (curSeg.endSeconds > idealEnd && distAfter > distBefore) {
        break;
      }

      group.push(curSeg);
      cursor++;
    }

    dayGroups.push(group);
  }

  let globalLessonIdx = 0;
  const rawChapters: RawChapter[] = dayGroups
    .filter((g) => g.length > 0)
    .map((group, dIdx) => {
      const lessons = group.map((seg) => {
        const prev = globalLessonIdx > 0 ? segments[globalLessonIdx - 1]?.title : undefined;
        const next =
          globalLessonIdx < segments.length - 1
            ? segments[globalLessonIdx + 1]?.title
            : undefined;
        const lessonObj = buildDetailedLessonContent({
          title: seg.title,
          startSeconds: seg.startSeconds,
          endSeconds: seg.endSeconds,
          lessonIndex: globalLessonIdx,
          prevTitle: prev,
          nextTitle: next,
          courseTitle: meta.title,
          courseDescription: meta.description,
          transcripts,
          subTopics: seg.subTopics,
          aiEnrichment: seg.aiEnrichment,
        });
        globalLessonIdx++;
        return lessonObj;
      });

      const dayStart = lessons[0].startSeconds;
      const dayEnd = lessons[lessons.length - 1].endSeconds;
      const dayMinutes = Math.max(1, Math.round((dayEnd - dayStart) / 60));

      return {
        title: buildDayTitle(dIdx + 1, group),
        description: `Day ${dIdx + 1} study plan spanning ${lessons.length} focused lesson${
          lessons.length > 1 ? "s" : ""
        } (${formatDuration(dayEnd - dayStart)} · ${dayMinutes} min total video instruction from ${formatClockTimestamp(
          dayStart
        )} to ${formatClockTimestamp(dayEnd)}).`,
        lessons,
      };
    });

  return {
    chapters: rawChapters,
    placementQuestions: generateFallbackPlacement({ chapters: rawChapters }),
  };
}

function buildScheduleSlots(totalDuration: number): {
  daysCount: number;
  slots: { dayIndex: number; lessonIndexInDay: number; startSeconds: number; endSeconds: number }[];
} {
  const duration = Math.max(600, totalDuration);
  const maxDays = duration > 18 * 3600 ? 14 : 10;
  const daysCount =
    duration <= 5400
      ? 1
      : Math.min(maxDays, Math.max(2, Math.round(duration / (2 * 3600))));

  const dayDuration = duration / daysCount;
  // Target ~20–26 min lessons (~1400s), bounded 3–7 per day so 24h gets ~60–72 lessons
  const lessonsPerDay =
    duration <= 1800
      ? Math.max(2, Math.round(duration / 600))
      : Math.min(7, Math.max(4, Math.round(dayDuration / 1400)));

  const totalLessons = daysCount * lessonsPerDay;
  const singleDur = Math.floor(duration / totalLessons);
  const slots: { dayIndex: number; lessonIndexInDay: number; startSeconds: number; endSeconds: number }[] = [];

  for (let i = 0; i < totalLessons; i++) {
    const startSeconds = i * singleDur;
    const endSeconds = i === totalLessons - 1 ? duration : (i + 1) * singleDur;
    slots.push({
      dayIndex: Math.floor(i / lessonsPerDay),
      lessonIndexInDay: i % lessonsPerDay,
      startSeconds,
      endSeconds,
    });
  }

  return { daysCount, slots };
}

async function callJSONWithProviderFailover<T>(
  primary: AIProvider,
  prompt: string,
  schema: string
): Promise<T> {
  try {
    return await primary.generateJSON<T>(prompt, schema);
  } catch (primaryErr) {
    const secondary = getSecondaryAIProvider(primary);
    if (secondary) {
      return await secondary.generateJSON<T>(prompt, schema);
    }
    throw primaryErr;
  }
}

async function generatePlacementWithLLM(
  curriculum: { chapters: RawChapter[] },
  courseTitle: string,
  difficulty: string,
  provider: AIProvider
): Promise<RawPlacementQuestion[] | null> {
  if (!isExternalAIProvider(provider)) return null;

  const allLessons = curriculum.chapters.flatMap((c) => c.lessons);
  if (allLessons.length === 0) return null;

  const targetCount = Math.min(8, Math.max(4, Math.min(allLessons.length, 6)));
  const step = allLessons.length / targetCount;
  const sampled = Array.from({ length: targetCount }, (_, i) => {
    const idx = Math.min(allLessons.length - 1, Math.floor(i * step));
    const les = allLessons[idx];
    return `${idx + 1}. ${les.title}: ${les.description.slice(0, 140)}`;
  }).join("\n");

  const prompt = `Create ${targetCount} diagnostic placement-test questions for the course "${courseTitle}" (difficulty: ${difficulty}).
Each question maps to one of these curriculum lessons so learners who already know a topic can skip ahead safely:
${sampled}

Requirements:
- Generate exactly ${targetCount} multiple-choice questions, one per key topic sampled above.
- Each question MUST have topicName matching the core skill, 4 distinct options, a valid correctOptionIndex (0-3), and a concise 1-sentence explanation.`;

  const schema = `{
  "questions": [
    {
      "topicName": "Short topic label",
      "questionText": "Question prompt",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOptionIndex": 0,
      "explanation": "Concise explanation"
    }
  ]
}`;

  const parsed = await Promise.race([
    callJSONWithProviderFailover<{
      questions?: {
        topicName?: string;
        questionText?: string;
        options?: string[];
        correctOptionIndex?: number;
        explanation?: string;
      }[];
    }>(provider, prompt, schema),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000)),
  ]);

  if (!parsed?.questions || !Array.isArray(parsed.questions)) return null;

  const valid: RawPlacementQuestion[] = parsed.questions
    .filter(
      (q) =>
        typeof q?.topicName === "string" &&
        q.topicName.trim().length > 1 &&
        typeof q?.questionText === "string" &&
        q.questionText.trim().length > 10 &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.every((o) => typeof o === "string" && o.trim().length > 0) &&
        typeof q.correctOptionIndex === "number" &&
        q.correctOptionIndex >= 0 &&
        q.correctOptionIndex <= 3
    )
    .slice(0, 8)
    .map((q) => ({
      topicName: q.topicName!.trim(),
      questionText: q.questionText!.trim(),
      options: q.options!.map((o) => o.trim()),
      correctOptionIndex: q.correctOptionIndex!,
      explanation: (q.explanation || `Assesses readiness on ${q.topicName!.trim()}.`).trim(),
    }));

  return valid.length >= 3 ? valid : null;
}

export async function generateCurriculumStructure(
  meta: Pick<VideoMetadata, "title" | "durationSeconds" | "description" | "chapters">,
  transcripts: TranscriptSegment[] | null,
  provider: AIProvider,
  difficulty: string
): Promise<RawCurriculum> {
  const hasRealChapters = Boolean(meta.chapters && meta.chapters.length >= 2);

  // Build authoritative full-duration segments first (never clamping or truncating multi-hour videos)
  const baseSegments: TimeSegment[] = hasRealChapters
    ? normalizeAndSubdivideChapters(meta.chapters!, meta.durationSeconds)
    : buildScheduleSlots(meta.durationSeconds).slots.map((slot, idx) => ({
        title: `Module ${idx + 1}: Core Concepts & Walkthrough`,
        startSeconds: slot.startSeconds,
        endSeconds: slot.endSeconds,
      }));

  // Tier 1: Enrich curriculum modules via configured external LLM (both chaptered and chapterless videos)
  if (isExternalAIProvider(provider) && baseSegments.length > 0) {
    try {
      const batchSize = 10;
      const llmDeadlineMs = Date.now() + 24_000;
      const enrichedSegments: TimeSegment[] = baseSegments.map((s) => ({ ...s }));
      let batchesSucceeded = 0;

      for (let i = 0; i < baseSegments.length; i += batchSize) {
        if (Date.now() >= llmDeadlineMs) break;

        const batch = baseSegments.slice(i, i + batchSize);
        const slotHints = batch
          .map((s, idx) => {
            const excerpt = extractTranscriptExcerpt(transcripts, s.startSeconds, s.endSeconds, 220);
            const subHint = s.subTopics?.length
              ? ` | Subtopics: ${s.subTopics.slice(0, 5).join(", ")}`
              : "";
            return `Module ${idx} [${formatClockTimestamp(s.startSeconds)}-${formatClockTimestamp(
              s.endSeconds
            )}]: Current="${s.title}"${subHint}${excerpt ? ` | Transcript: "${excerpt}"` : ""}`;
          })
          .join("\n");

        const prompt = `You are designing structured course lessons from "${meta.title}" (${formatDuration(
          meta.durationSeconds
        )} total, difficulty: ${difficulty}).
Course context: ${(meta.description || "").slice(0, 600)}

Enrich EVERY module below in exact order (indexes 0..${batch.length - 1}) using the chapter topic and transcript hints without merging or dropping any time window:
${slotHints}`;

        const schema = `{
  "lessons": [
    {
      "index": 0,
      "title": "${hasRealChapters ? "Clear refined lesson title preserving original topic" : "Specific concise lesson title"}",
      "description": "1-2 sentence overview of what learners build or master in this time window",
      "summary": "2-3 sentence technical study summary grounded in the module content",
      "keyTakeaways": ["3 concise practical takeaways"],
      "importantDefinitions": ["Term: Clear technical definition"]
    }
  ]
}`;

        try {
          const res = await callJSONWithProviderFailover<{
            lessons?: {
              index?: number;
              title?: string;
              description?: string;
              summary?: string;
              keyTakeaways?: string[];
              importantDefinitions?: string[];
            }[];
          }>(provider, prompt, schema);

          const returned = Array.isArray(res?.lessons) ? res.lessons : [];
          if (returned.length === 0) {
            throw new Error("LLM returned empty curriculum lessons batch.");
          }

          batch.forEach((seg, idx) => {
            const matched =
              returned.find((item) => item?.index === idx) || returned[idx];
            if (!matched) return;

            const refinedTitle = matched.title?.trim();
            enrichedSegments[i + idx] = {
              ...seg,
              title:
                !hasRealChapters && refinedTitle
                  ? refinedTitle
                  : refinedTitle && refinedTitle.length >= 6 && refinedTitle.length <= 96
                    ? refinedTitle
                    : seg.title,
              aiEnrichment: {
                description: matched.description?.trim(),
                summary: matched.summary?.trim(),
                keyTakeaways: Array.isArray(matched.keyTakeaways)
                  ? matched.keyTakeaways.map((k) => String(k).trim()).filter(Boolean)
                  : undefined,
                importantDefinitions: Array.isArray(matched.importantDefinitions)
                  ? matched.importantDefinitions.map((d) => String(d).trim()).filter(Boolean)
                  : undefined,
              },
            };
          });

          batchesSucceeded++;
        } catch (batchErr) {
          if (batchesSucceeded === 0) {
            throw batchErr;
          }
          console.warn("Partial LLM curriculum batch fallback for remaining segments:", batchErr);
          break;
        }
      }

      if (batchesSucceeded > 0) {
        return partitionSegmentsIntoDays(
          enrichedSegments,
          meta.durationSeconds,
          meta,
          transcripts
        );
      }
    } catch (err) {
      console.warn(
        "LLM curriculum enrichment failed, cleanly falling back to deterministic synthesis:",
        err
      );
    }
  }

  // Tier 2: Resilient deterministic fallback preserving full-video proportional duration
  if (hasRealChapters) {
    return organizeChaptersIntoDailyPlan(
      meta.chapters!,
      meta.durationSeconds,
      meta.title,
      meta.description,
      transcripts
    );
  }

  return generateFallbackCurriculum(meta, difficulty, transcripts);
}

function organizeChaptersIntoDailyPlan(
  chapters: VideoChapter[],
  totalDuration: number,
  courseTitle: string,
  courseDescription?: string,
  transcripts: TranscriptSegment[] | null = null
): RawCurriculum {
  const segments = normalizeAndSubdivideChapters(chapters, totalDuration);
  return partitionSegmentsIntoDays(
    segments,
    totalDuration,
    { title: courseTitle, description: courseDescription },
    transcripts
  );
}

function generateFallbackCurriculum(
  meta: { title: string; durationSeconds: number; description?: string; chapters?: VideoChapter[] },
  difficulty: string,
  transcripts: TranscriptSegment[] | null = null
): RawCurriculum {
  if (meta.chapters && meta.chapters.length >= 2) {
    return organizeChaptersIntoDailyPlan(
      meta.chapters,
      meta.durationSeconds,
      meta.title,
      meta.description,
      transcripts
    );
  }

  const domain = detectCourseDomain(meta.title, meta.description);
  const pool = DOMAIN_TOPIC_POOLS[domain];
  const { slots } = buildScheduleSlots(meta.durationSeconds);

  const segments: TimeSegment[] = slots.map((slot, idx) => {
    const poolIdx = Math.min(
      pool.lessons.length - 1,
      Math.floor((idx / Math.max(1, slots.length - 1)) * (pool.lessons.length - 1))
    );
    const baseTopic = pool.lessons[poolIdx];
    const isDuplicateTopic = idx > 0 && Math.floor(((idx - 1) / Math.max(1, slots.length - 1)) * (pool.lessons.length - 1)) === poolIdx;
    const title = isDuplicateTopic
      ? `${baseTopic} (Deep Dive & Applied Lab)`
      : `${idx + 1}. ${baseTopic}`;

    return {
      title,
      startSeconds: slot.startSeconds,
      endSeconds: slot.endSeconds,
    };
  });

  // Ensure Day themes harmonize nicely if video lacked timestamps
  const curriculum = partitionSegmentsIntoDays(
    segments,
    meta.durationSeconds,
    meta,
    transcripts
  );

  // Prefix Day Focus cleanly when chapterless fallback used multi-part slots
  curriculum.chapters = curriculum.chapters.map((ch, idx) => {
    if (ch.title.includes("(Deep Dive") && pool.themes[idx % pool.themes.length]) {
      return {
        ...ch,
        title: `Day ${idx + 1} (${pool.themes[idx % pool.themes.length]})`,
      };
    }
    return ch;
  });

  void difficulty;
  return curriculum;
}

function cleanPlacementText(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\u0026/g, "&")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0027/g, "'")
    .replace(/\\u0022/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/^\d+[\.\:\-]\s*/, "")
    .trim();
}

function generateFallbackPlacement(curriculum: { chapters: RawChapter[] }): RawPlacementQuestion[] {
  const allLessons: RawLesson[] = [];
  curriculum.chapters.forEach((chap) => {
    chap.lessons.forEach((les) => {
      allLessons.push(les);
    });
  });

  const targetCount = Math.min(8, Math.max(4, Math.min(allLessons.length, 6)));
  const selectedLessons: RawLesson[] = [];
  if (allLessons.length <= targetCount) {
    selectedLessons.push(...allLessons);
  } else {
    const step = allLessons.length / targetCount;
    for (let i = 0; i < targetCount; i++) {
      const idx = Math.min(allLessons.length - 1, Math.floor(i * step));
      selectedLessons.push(allLessons[idx]);
    }
  }

  return selectedLessons.map((les, idx) => {
    const cleanTopic = cleanConceptTopic(cleanPlacementText(les.title)) || cleanPlacementText(les.title);
    const glossaryHits = matchConceptsForText(cleanTopic);
    const conceptWithQ = glossaryHits.find((g) => g.question);

    let questionText = "";
    let correctOption = "";
    let wrong1 = "";
    let wrong2 = "";
    let wrong3 = "";
    let explanation = "";

    if (conceptWithQ?.question) {
      questionText = conceptWithQ.question.prompt;
      correctOption = conceptWithQ.question.correct;
      [wrong1, wrong2, wrong3] = conceptWithQ.question.distractors;
      explanation = conceptWithQ.question.explanation;
    } else if (glossaryHits[0]) {
      const c = glossaryHits[0];
      questionText = `Which core engineering principle best describes "${c.term}" when building ${cleanTopic}?`;
      correctOption = c.definition;
      wrong1 = "Storing all state inside mutable global variables without validation or interfaces.";
      wrong2 = "Disabling schema verification and runtime error handling in production.";
      wrong3 = "Eliminating automated tests and deployment checks to ship unverified builds.";
      explanation = `${c.term}: ${c.takeaway}`;
    } else {
      questionText = `In practical software development, what is the core architectural objective when working with ${cleanTopic}?`;
      correctOption = `Building modular, verifiable components with strict contracts tailored to ${cleanTopic}.`;
      wrong1 = "Merging all business logic, database queries, and UI components into one unmaintainable script.";
      wrong2 = "Disabling automated verification and validation checks prior to release.";
      wrong3 = "Bypassing error handling and allowing unhandled exceptions to terminate execution.";
      explanation = "Engineering best practices emphasize modularity, clear contracts, and automated test coverage.";
    }

    const targetCorrectIdx = idx % 4;
    const rawOptions = [correctOption, wrong1, wrong2, wrong3];
    const options: string[] = [];
    let wrongIdx = 1;
    for (let o = 0; o < 4; o++) {
      if (o === targetCorrectIdx) {
        options.push(correctOption);
      } else {
        options.push(rawOptions[wrongIdx]);
        wrongIdx++;
      }
    }

    return {
      topicName: cleanTopic,
      questionText,
      options,
      correctOptionIndex: targetCorrectIdx,
      explanation,
    };
  });
}

