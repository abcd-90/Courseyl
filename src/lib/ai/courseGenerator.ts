import { prisma } from "../db";
import {
  parseYouTubeUrl,
  fetchYouTubeMetadata,
  fetchYouTubeTranscript,
  TranscriptSegment,
  formatDuration,
  VideoChapter,
} from "../youtube";
import { getAIProvider, NemotronAIProvider, OpenAIProvider } from "./aiProvider";
import { getFullSettings } from "../settings";

export interface GenerateCourseParams {
  url: string;
  userId: string;
  manualTranscript?: string;
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
}

export interface GenerationResult {
  success: boolean;
  courseId: string;
  course?: { id: string; slug: string; title: string };
  isExisting: boolean;
  message: string;
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

export async function generateCourse(params: GenerateCourseParams): Promise<GenerationResult> {
  const { url, userId, manualTranscript, difficulty = "BEGINNER" } = params;

  // 1. URL validation
  const parsedUrl = parseYouTubeUrl(url);
  if (!parsedUrl.valid || !parsedUrl.videoId) {
    throw new Error("Invalid YouTube video or playlist URL. Please provide a valid YouTube link.");
  }

  // 2. Duplicate Detection
  const existingSource = await prisma.courseSource.findFirst({
    where: { youtubeId: parsedUrl.videoId },
    include: { course: true },
  });

  if (existingSource && existingSource.course) {
    // Check if user is already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: existingSource.course.id,
        },
      },
    });

    if (!existingEnrollment) {
      await prisma.enrollment.create({
        data: {
          userId,
          courseId: existingSource.course.id,
        },
      });
      await prisma.course.update({
        where: { id: existingSource.course.id },
        data: { enrollmentCount: { increment: 1 } },
      });
    }

    return {
      success: true,
      courseId: existingSource.course.id,
      course: {
        id: existingSource.course.id,
        slug: existingSource.course.slug,
        title: existingSource.course.title,
      },
      isExisting: true,
      message: "Course already exists on CourseIt! Enrolled instantly without consuming generation quota.",
    };
  }

  // 3. User quota verification
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

  // Tier limits: allow comprehensive multi-hour masterclasses
  const tierLimits = {
    FREE: { maxCourses: 5, maxDurationSec: 86400 },
    PRO: { maxCourses: 20, maxDurationSec: 86400 },
    MAX: { maxCourses: 50, maxDurationSec: 86400 },
  };

  const currentLimit = tierLimits[tier as keyof typeof tierLimits] || tierLimits.FREE;

  // Check if admin has enabled unlimited free testing mode
  const siteSettings = await getFullSettings().catch(() => null);
  const isUnlimitedMode =
    siteSettings?.plans?.unlimitedFreeMode ||
    (siteSettings?.plans?.freeHoursLimit && siteSettings.plans.freeHoursLimit >= 999) ||
    role === "ADMIN";

  if (!isUnlimitedMode) {
    if (sub && sub.monthlyGenerationsUsed >= currentLimit.maxCourses) {
      throw new Error(
        `Monthly generation quota exceeded for your ${tier} plan (${sub.monthlyGenerationsUsed}/${currentLimit.maxCourses} courses used). Please upgrade to generate more courses.`
      );
    }
  }

  // 4. Ingest video metadata
  const meta = await fetchYouTubeMetadata(parsedUrl.videoId);

  if (!isUnlimitedMode && meta.durationSeconds > currentLimit.maxDurationSec) {
    throw new Error(
      `Video duration (${formatDuration(meta.durationSeconds)}) exceeds your ${tier} plan limit of ${
        currentLimit.maxDurationSec / 3600
      } hours. Please upgrade to process longer videos.`
    );
  }

  // 5. Ingest transcript
  let transcripts: TranscriptSegment[] | null = null;
  if (manualTranscript && manualTranscript.trim()) {
    transcripts = [
      {
        text: manualTranscript.trim(),
        start: 0,
        duration: meta.durationSeconds,
      },
    ];
  } else {
    transcripts = await fetchYouTubeTranscript(parsedUrl.videoId);
  }

  // 6. Create Course record and GenerationJob
  const baseSlug = slugify(meta.title) || `course-${Date.now()}`;
  const uniqueSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

  const course = await prisma.course.create({
    data: {
      creatorId: userId,
      title: meta.title,
      slug: uniqueSlug,
      description: meta.description || `Comprehensive interactive course covering ${meta.title}.`,
      targetAudience: "Self-paced learners, software developers, and students.",
      difficulty,
      thumbnailUrl: meta.thumbnailUrl,
      totalDurationSeconds: meta.durationSeconds,
      estimatedStudyMinutes: Math.ceil((meta.durationSeconds * 1.5) / 60),
      status: "PROCESSING",
      isPublic: true,
      enrollmentCount: 1,
    },
  });

  await prisma.courseSource.create({
    data: {
      courseId: course.id,
      sourceType: parsedUrl.type === "PLAYLIST" ? "YOUTUBE_PLAYLIST" : "YOUTUBE_VIDEO",
      sourceUrl: url,
      youtubeId: parsedUrl.videoId,
      channelTitle: meta.channelTitle,
    },
  });

  const job = await prisma.generationJob.create({
    data: {
      userId,
      courseId: course.id,
      status: "PROCESSING",
      progressPercentage: 15,
      currentStep: "Synthesizing curriculum chapters and lessons",
    },
  });

  // Automatically enroll the creator
  await prisma.enrollment.create({
    data: {
      userId,
      courseId: course.id,
    },
  });

  // 7. Generate curriculum structure via AI or domain synthesizer
  const provider = getAIProvider();

  try {
    let curriculumData = await generateCurriculumStructure(meta, transcripts, provider, difficulty);

    // Ensure we have at least 1 chapter and 2-4 lessons
    if (!curriculumData.chapters || curriculumData.chapters.length === 0) {
      curriculumData = generateFallbackCurriculum(meta, difficulty);
    }

    // 8. STREAMING REQUIREMENT: Create Chapter 1 & Lesson 1 immediately
    const firstChapterData = curriculumData.chapters[0];
    const createdFirstChapter = await prisma.chapter.create({
      data: {
        courseId: course.id,
        orderIndex: 0,
        title: firstChapterData.title,
        description: firstChapterData.description || "Foundational concepts and overview.",
      },
    });

    const firstLessonData = firstChapterData.lessons[0];
    const createdFirstLesson = await prisma.lesson.create({
      data: {
        chapterId: createdFirstChapter.id,
        orderIndex: 0,
        title: firstLessonData.title,
        description: firstLessonData.description || firstLessonData.summary || `Master ${firstLessonData.title} with step-by-step guidance.`,
        youtubeVideoId: parsedUrl.videoId,
        startSeconds: firstLessonData.startSeconds || 0,
        endSeconds: firstLessonData.endSeconds || Math.min(600, meta.durationSeconds),
        durationSeconds:
          (firstLessonData.endSeconds || Math.min(600, meta.durationSeconds)) -
          (firstLessonData.startSeconds || 0),
        summary: firstLessonData.summary || firstLessonData.description || `Master ${firstLessonData.title} with step-by-step guidance.`,
        keyTakeaways: JSON.stringify(firstLessonData.keyTakeaways || []),
        importantDefinitions: JSON.stringify(firstLessonData.importantDefinitions || []),
        status: "READY",
      },
    });

    // Create quiz for Lesson 1
    if (firstLessonData.quizQuestions && firstLessonData.quizQuestions.length > 0) {
      for (let qIdx = 0; qIdx < firstLessonData.quizQuestions.length; qIdx++) {
        const q = firstLessonData.quizQuestions[qIdx];
        const quizQ = await prisma.quizQuestion.create({
          data: {
            lessonId: createdFirstLesson.id,
            orderIndex: qIdx,
            questionText: q.questionText,
            correctOptionIndex: q.correctOptionIndex,
            explanation: q.explanation,
            replayTimestampSeconds: q.replayTimestampSeconds || createdFirstLesson.startSeconds,
          },
        });

        for (let optIdx = 0; optIdx < q.options.length; optIdx++) {
          await prisma.quizOption.create({
            data: {
              questionId: quizQ.id,
              optionIndex: optIdx,
              optionText: q.options[optIdx],
            },
          });
        }
      }
    }

    // Mark Lesson 1 READY and Course READY (streaming first lesson available!)
    await prisma.course.update({
      where: { id: course.id },
      data: { status: "READY" },
    });

    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        progressPercentage: 45,
        currentStep: "Lesson 1 ready for learning! Processing remaining lessons.",
      },
    });

    // 9. Process remaining lessons in Chapter 1 and subsequent chapters using high-speed nested creates
    for (let cIdx = 0; cIdx < curriculumData.chapters.length; cIdx++) {
      const c = curriculumData.chapters[cIdx];

      if (cIdx === 0) {
        // Add remaining lessons for Chapter 1 (from index 1 onwards)
        for (let lIdx = 1; lIdx < c.lessons.length; lIdx++) {
          const l = c.lessons[lIdx];
          await prisma.lesson.create({
            data: {
              chapterId: createdFirstChapter.id,
              orderIndex: lIdx,
              title: l.title,
              description: l.description || l.summary || `Comprehensive lesson on ${l.title}.`,
              youtubeVideoId: parsedUrl.videoId || "",
              startSeconds: l.startSeconds,
              endSeconds: l.endSeconds,
              durationSeconds: Math.max(60, l.endSeconds - l.startSeconds),
              summary: l.summary || l.description || `Comprehensive lesson on ${l.title}.`,
              keyTakeaways: JSON.stringify(l.keyTakeaways || []),
              importantDefinitions: JSON.stringify(l.importantDefinitions || []),
              status: "READY",
              quizQuestions: {
                create: (l.quizQuestions || []).map((q, qIdx) => ({
                  orderIndex: qIdx,
                  questionText: q.questionText,
                  correctOptionIndex: q.correctOptionIndex,
                  explanation: q.explanation,
                  replayTimestampSeconds: q.replayTimestampSeconds || l.startSeconds,
                  options: {
                    create: (q.options || []).map((opt, optIdx) => ({
                      optionIndex: optIdx,
                      optionText: opt,
                    })),
                  },
                })),
              },
            },
          });
        }
      } else {
        // Create full subsequent chapters with all nested lessons, quizzes, and options in 1 query per chapter
        await prisma.chapter.create({
          data: {
            courseId: course.id,
            orderIndex: cIdx,
            title: c.title,
            description: c.description,
            lessons: {
              create: c.lessons.map((l, lIdx) => ({
                orderIndex: lIdx,
                title: l.title,
                description: l.description || l.summary || `Comprehensive lesson on ${l.title}.`,
                youtubeVideoId: parsedUrl.videoId || "",
                startSeconds: l.startSeconds,
                endSeconds: l.endSeconds,
                durationSeconds: Math.max(60, l.endSeconds - l.startSeconds),
                summary: l.summary || l.description || `Comprehensive lesson on ${l.title}.`,
                keyTakeaways: JSON.stringify(l.keyTakeaways || []),
                importantDefinitions: JSON.stringify(l.importantDefinitions || []),
                status: "READY",
                quizQuestions: {
                  create: (l.quizQuestions || []).map((q, qIdx) => ({
                    orderIndex: qIdx,
                    questionText: q.questionText,
                    correctOptionIndex: q.correctOptionIndex,
                    explanation: q.explanation,
                    replayTimestampSeconds: q.replayTimestampSeconds || l.startSeconds,
                    options: {
                      create: (q.options || []).map((opt, optIdx) => ({
                        optionIndex: optIdx,
                        optionText: opt,
                      })),
                    },
                  })),
                },
              })),
            },
          },
        });
      }
    }

    // 10. Generate Placement Diagnostic Questions for the course
    const placementQuestions =
      curriculumData.placementQuestions && curriculumData.placementQuestions.length >= 3
        ? curriculumData.placementQuestions
        : generateFallbackPlacement(curriculumData);

    for (let pIdx = 0; pIdx < placementQuestions.length; pIdx++) {
      const pq = placementQuestions[pIdx];
      const createdPq = await prisma.placementQuestion.create({
        data: {
          courseId: course.id,
          orderIndex: pIdx,
          topicName: cleanPlacementText(pq.topicName),
          questionText: cleanPlacementText(pq.questionText),
          correctOptionIndex: pq.correctOptionIndex,
          explanation: cleanPlacementText(pq.explanation),
        },
      });

      for (let optIdx = 0; optIdx < pq.options.length; optIdx++) {
        await prisma.placementOption.create({
          data: {
            questionId: createdPq.id,
            optionIndex: optIdx,
            optionText: cleanPlacementText(pq.options[optIdx]),
          },
        });
      }
    }

    // 11. Finalize Job and Update User Usage
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        progressPercentage: 100,
        currentStep: "Course generation fully complete!",
        completedAt: new Date(),
      },
    });

    if (user.subscription) {
      await prisma.subscription.update({
        where: { id: user.subscription.id },
        data: {
          monthlyGenerationsUsed: { increment: 1 },
          monthlyHoursUsedSeconds: { increment: meta.durationSeconds },
        },
      });
    }

    return {
      success: true,
      courseId: course.id,
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
      },
      isExisting: false,
      message: "Course successfully generated and ready for learning!",
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Course generation pipeline error:", err);

    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorLog: errorMsg,
      },
    });

    await prisma.course.update({
      where: { id: course.id },
      data: { status: "FAILED" },
    });

    throw new Error(`Generation failed: ${errorMsg}`);
  }
}

// ----------------------------------------------------
// AI Synthesis and Fallback Helpers
// ----------------------------------------------------

interface RawQuizQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  replayTimestampSeconds: number;
}

interface RawLesson {
  title: string;
  description: string;
  startSeconds: number;
  endSeconds: number;
  summary: string;
  keyTakeaways: string[];
  importantDefinitions: string[];
  quizQuestions: RawQuizQuestion[];
}

interface RawChapter {
  title: string;
  description: string;
  lessons: RawLesson[];
}

interface RawPlacementQuestion {
  topicName: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

interface RawCurriculum {
  chapters: RawChapter[];
  placementQuestions?: RawPlacementQuestion[];
}

async function generateCurriculumStructure(
  meta: { title: string; durationSeconds: number; description?: string; chapters?: VideoChapter[] },
  transcripts: TranscriptSegment[] | null,
  provider: ReturnType<typeof getAIProvider>,
  difficulty: string
): Promise<RawCurriculum> {
  // If video has chapters extracted from YouTube timestamps, use them directly to organize into a daily plan
  if (meta.chapters && meta.chapters.length >= 3) {
    return organizeChaptersIntoDailyPlan(meta.chapters, meta.durationSeconds, meta.title);
  }

  if (provider instanceof NemotronAIProvider || provider instanceof OpenAIProvider) {
    try {
      const transcriptSummary = transcripts
        ? transcripts.slice(0, 150).map((t) => `[${formatDuration(t.start)}] ${t.text}`).join("\n")
        : meta.description || "";

      const prompt = `You are designing a high-retention structured online course based on a YouTube video titled "${meta.title}".
Video Total Duration: ${meta.durationSeconds} seconds (${formatDuration(meta.durationSeconds)}).
Target Difficulty: ${difficulty}.
Transcript / Context excerpt:
${transcriptSummary.slice(0, 3000)}

Please divide this course into 2-3 logical Chapters, each with 2-3 lessons.
Each lesson must specify exact startSeconds and endSeconds (spanning the total duration 0 to ${meta.durationSeconds}).
Each lesson must include 2-3 quiz questions with:
- questionText
- options (array of 4 distinct choices)
- correctOptionIndex (0-3)
- explanation
- replayTimestampSeconds (timestamp within the lesson where this was explained)
Also generate 4-6 course-level placement test questions evaluating prior knowledge of key topics.`;

      const schema = `{
  "chapters": [
    {
      "title": "Chapter title",
      "description": "Chapter summary",
      "lessons": [
        {
          "title": "Lesson title",
          "description": "Lesson description",
          "startSeconds": 0,
          "endSeconds": 450,
          "summary": "Detailed lesson summary",
          "keyTakeaways": ["Takeaway 1", "Takeaway 2"],
          "importantDefinitions": ["Def 1", "Def 2"],
          "quizQuestions": [
            {
              "questionText": "Question?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correctOptionIndex": 0,
              "explanation": "Why this is correct",
              "replayTimestampSeconds": 120
            }
          ]
        }
      ]
    }
  ],
  "placementQuestions": [
    {
      "topicName": "Topic name",
      "questionText": "Diagnostic question?",
      "options": ["A", "B", "C", "D"],
      "correctOptionIndex": 0,
      "explanation": "Explanation"
    }
  ]
}`;

      return await provider.generateJSON<RawCurriculum>(prompt, schema);
    } catch (err) {
      console.warn("LLM API generation failed, seamlessly falling back to high-fidelity domain synthesizer:", err);
    }
  }

  return generateFallbackCurriculum(meta, difficulty);
}

function organizeChaptersIntoDailyPlan(
  chapters: VideoChapter[],
  totalDuration: number,
  courseTitle: string
): RawCurriculum {
  // Group lessons into ~5-8 daily modules (around 1.5 to 2.2 hours per day)
  const targetDaysCount = Math.min(10, Math.max(1, Math.ceil(totalDuration / (2 * 3600))));
  const targetDayDuration = totalDuration / targetDaysCount;

  const rawChapters: RawChapter[] = [];
  let currentLessons: RawLesson[] = [];
  let currentDaySeconds = 0;
  let dayIndex = 1;

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const midSec = Math.floor((ch.startSeconds + ch.endSeconds) / 2);

    const quizQuestions: RawQuizQuestion[] = [
      {
        questionText: `What key concept is emphasized in "${ch.title}"?`,
        options: [
          `Understanding the core principles and practical mechanics of ${ch.title}`,
          "Skipping all foundational syntax rules",
          "Hardcoding values without data structures",
          "Executing code without error handling",
        ],
        correctOptionIndex: 0,
        explanation: `This section highlights proper implementation and patterns for ${ch.title}.`,
        replayTimestampSeconds: Math.floor(ch.startSeconds + (ch.endSeconds - ch.startSeconds) * 0.25),
      },
      {
        questionText: `Which approach is considered best practice when working with ${ch.title}?`,
        options: [
          "Writing clean, modular, and well-tested code",
          "Disabling type assertions and ignoring syntax errors",
          "Using arbitrary global variables across all scopes",
          "Relying on deprecated methods without documentation",
        ],
        correctOptionIndex: 0,
        explanation: `Best practices emphasize modularity and defensive design when implementing ${ch.title}.`,
        replayTimestampSeconds: midSec,
      },
    ];

    const lesson: RawLesson = {
      title: ch.title,
      description: `In this lesson, master ${ch.title} with step-by-step code walkthroughs, explanations, and exercises.`,
      startSeconds: ch.startSeconds,
      endSeconds: ch.endSeconds,
      summary: `Comprehensive hands-on breakdown of ${ch.title}. We analyze the underlying mechanics, common patterns, and best practices.`,
      keyTakeaways: [
        `Core principles and operation of ${ch.title}`,
        "Step-by-step implementation walkthrough",
        "Common edge cases and debugging strategies",
      ],
      importantDefinitions: [
        `${ch.title}: Essential topic covered in this section of the masterclass.`,
        "Idiomatic Pattern: Writing clean, maintainable, and standard code as recommended in modern software engineering.",
      ],
      quizQuestions,
    };

    currentLessons.push(lesson);
    currentDaySeconds += ch.durationSeconds;

    const isLast = i === chapters.length - 1;
    const isOverTarget = currentDaySeconds >= targetDayDuration * 0.85;
    const hasMoreDaysNeeded = dayIndex < targetDaysCount;

    if (isLast || (isOverTarget && hasMoreDaysNeeded)) {
      const firstTitle = currentLessons[0]?.title || `Module ${dayIndex}`;
      let topic = firstTitle.replace(/^[–—\-:\s\d.]+/, "").split(/[&|:-]/)[0].trim();

      let dayTitle = `Day ${dayIndex} (${topic || "Foundations"})`;
      if (dayIndex === 1) {
        dayTitle = `Day 1 (Core Fundamentals & Setup)`;
      } else if (firstTitle.toLowerCase().includes("string") || firstTitle.toLowerCase().includes("type")) {
        dayTitle = `Day ${dayIndex} (Strings & Type Conversions)`;
      } else if (firstTitle.toLowerCase().includes("operator") || firstTitle.toLowerCase().includes("if") || firstTitle.toLowerCase().includes("loop")) {
        dayTitle = `Day ${dayIndex} (Operators & Control Flow)`;
      } else if (firstTitle.toLowerCase().includes("list") || firstTitle.toLowerCase().includes("tuple")) {
        dayTitle = `Day ${dayIndex} (Lists & Tuples)`;
      } else if (firstTitle.toLowerCase().includes("set") || firstTitle.toLowerCase().includes("dict")) {
        dayTitle = `Day ${dayIndex} (Sets & Dictionaries)`;
      } else if (firstTitle.toLowerCase().includes("function") || firstTitle.toLowerCase().includes("lambda")) {
        dayTitle = `Day ${dayIndex} (Functions & Advanced Logic)`;
      } else if (firstTitle.toLowerCase().includes("llm") || firstTitle.toLowerCase().includes("ai") || firstTitle.toLowerCase().includes("prompt")) {
        dayTitle = `Day ${dayIndex} (AI & Large Language Models)`;
      } else if (firstTitle.toLowerCase().includes("rag") || firstTitle.toLowerCase().includes("agent") || firstTitle.toLowerCase().includes("mcp")) {
        dayTitle = `Day ${dayIndex} (AI Agents, RAG & MCP)`;
      }

      rawChapters.push({
        title: dayTitle,
        description: `Day ${dayIndex} learning plan covering ${currentLessons.length} lessons (${Math.round(currentDaySeconds / 60)} minutes of guided video instruction).`,
        lessons: [...currentLessons],
      });

      dayIndex++;
      currentLessons = [];
      currentDaySeconds = 0;
    }
  }

  return {
    chapters: rawChapters,
    placementQuestions: generateFallbackPlacement({ chapters: rawChapters }),
  };
}

function generateFallbackCurriculum(
  meta: { title: string; durationSeconds: number; description?: string; chapters?: VideoChapter[] },
  difficulty: string
): RawCurriculum {
  if (meta.chapters && meta.chapters.length >= 3) {
    return organizeChaptersIntoDailyPlan(meta.chapters, meta.durationSeconds, meta.title);
  }

  const duration = Math.max(1200, meta.durationSeconds);
  const cleanTitle = meta.title.replace(/[|:-].*$/, "").trim();

  // Determine number of Days based on duration (~1.2 to 2.0 hours per day)
  const daysCount = Math.min(10, Math.max(1, Math.ceil(duration / (1.75 * 3600))));
  const dayDuration = duration / daysCount;

  // Each day has 6 to 9 bite-sized micro-lessons (each ~10 to 18 minutes)
  const lessonsPerDay = Math.min(9, Math.max(5, Math.round(dayDuration / 720)));
  const totalLessonsCount = daysCount * lessonsPerDay;
  const singleLessonDuration = Math.floor(duration / totalLessonsCount);

  const dayThematicTitles = [
    "Core Fundamentals & Setup",
    "Data Types & Foundational Mechanics",
    "Operators, Slicing & Expressions",
    "Control Flow, Loops & Conditionals",
    "Data Structures, Collections & Mutability",
    "Functions, Scope & Modularity",
    "Object-Oriented Architecture & Inheritance",
    "Files, I/O & Exception Handling",
    "Advanced Paradigms & Industry Tooling",
    "Production Systems & Capstone Project",
  ];

  const lessonSubtopics = [
    "Course Introduction & Development Environment Setup",
    "Core Syntax, Indentation & Interpreted Execution",
    "Variables, Data Types & Type Conversion",
    "Arithmetic, Logical & Comparison Operators",
    "String Manipulation, Slicing & Format Sequences",
    "Conditional Logic: Branching & Truthy Values",
    "While Loops & Iteration Bounds",
    "For Loops, Range Sequences & Iterables",
    "Break, Continue & Pass Statements",
    "List Operations, Indexing & Mutability",
    "List Methods: Append, Insert, Pop & Sort",
    "Tuples & Immutable Sequence Mechanics",
    "Dictionaries: Key-Value Hash Maps & Queries",
    "Dictionary Methods: Keys, Values, Items & Defaults",
    "Sets: Mathematical Uniqueness & Operations",
    "Functions: Definition, Invocation & Parameters",
    "Positional vs Keyword Arguments & Defaults",
    "Return Values, NoneType & Variable Scope",
    "Recursion: Call Stack & Base Termination",
    "Lambda Functions, Map, Filter & List Comprehensions",
    "File I/O: Reading Text & Binary Streams",
    "File Writing, Appending & Resource Management",
    "Context Managers with with-Statement Syntax",
    "Object-Oriented Programming: Classes & Instances",
    "Self Reference, Attributes & Instance Methods",
    "Constructor Methods with __init__ Dunder",
    "Class Attributes vs Instance Attribute Resolution",
    "Static Methods & @staticmethod Decorator",
    "Class Methods & @classmethod Architecture",
    "Property Decorators: Managed Getters & Setters",
    "Single & Multilevel Class Inheritance",
    "Super Method & Base Constructor Invocations",
    "Multiple Inheritance & Method Resolution Order",
    "Operator Overloading & Magic Dunder Methods",
    "Exception Handling: Try, Except & Finally Blocks",
    "Raising Custom Exceptions & Error Hierarchies",
    "Modules, Packages & Pip Dependency Ecosystem",
    "Virtual Environments & Project Isolation",
    "Standard Library: Datetime, Math & Random",
    "JSON Serialization, APIs & Network Requests",
    "Regular Expressions & String Pattern Matching",
    "Generators, Iterators & Memory Optimization",
    "Decorators & Functional Composition Patterns",
    "Type Annotations, Type Hinting & Static Checking",
    "Unit Testing, Assertions & Test Frameworks",
    "Debugging Strategies, Breakpoints & Stack Traces",
    "Asynchronous Programming with Async & Await",
    "Concurrency, Threads & Multiprocessing Models",
    "Database Connectivity, CRUD Operations & ORMs",
    "Web Frameworks: Routing, Endpoints & Middleware",
    "Security Best Practices & Input Sanitization",
    "Packaging, Publishing & Distribution",
    "Docker Containerization & Environment Consistency",
    "Continuous Integration, Linting & Formatting",
    "Cloud Deployment & Serverless Integration",
    "Performance Profiling, Benchmarking & Bottlenecks",
    "Production Logging, Telemetry & Observability",
    "Capstone Project: Architecture & System Setup",
    "Capstone Project: Core Implementation & Workflows",
    "Course Recap, Portfolio Presentation & Next Steps",
  ];

  const chapters: RawChapter[] = [];
  let globalLessonIdx = 0;

  for (let dIdx = 0; dIdx < daysCount; dIdx++) {
    const dayLessons: RawLesson[] = [];
    const dayTitleTheme = dayThematicTitles[dIdx % dayThematicTitles.length];
    const dayTitle = `Day ${dIdx + 1} (${dayTitleTheme})`;

    for (let lIdx = 0; lIdx < lessonsPerDay; lIdx++) {
      const isVeryLast = globalLessonIdx === totalLessonsCount - 1;
      const startSec = globalLessonIdx * singleLessonDuration;
      const endSec = isVeryLast ? duration : (globalLessonIdx + 1) * singleLessonDuration;
      const subtopic = lessonSubtopics[globalLessonIdx % lessonSubtopics.length];
      const midSec = Math.floor((startSec + endSec) / 2);

      const quizQuestions: RawQuizQuestion[] = [
        {
          questionText: `What is the central design principle emphasized in "${subtopic}" for ${cleanTitle}?`,
          options: [
            `Ensuring modular separation of concerns and predictable data flow`,
            `Eliminating all unit testing and error logging`,
            `Hardcoding dependencies directly in global namespace`,
            `Ignoring execution constraints and runtime boundaries`,
          ],
          correctOptionIndex: 0,
          explanation: `Modularity and predictable data flow are essential for ${cleanTitle}.`,
          replayTimestampSeconds: Math.floor(startSec + (endSec - startSec) * 0.25),
        },
        {
          questionText: `Which approach is strongly recommended when developing "${subtopic}"?`,
          options: [
            `Adhering to strict contracts, clean interfaces, and proper error handling`,
            `Bypassing type checks and suppressing all runtime warnings`,
            `Using arbitrary global state without encapsulation`,
            `Relying entirely on undocumented legacy conventions`,
          ],
          correctOptionIndex: 0,
          explanation: `Clean interfaces and defensive error handling ensure maintainable architecture.`,
          replayTimestampSeconds: midSec,
        },
      ];

      dayLessons.push({
        title: `${lIdx + 1}. ${subtopic}`,
        description: `Master ${subtopic} with structured explanations, architectural guidance, and best practices.`,
        startSeconds: startSec,
        endSeconds: endSec,
        summary: `Comprehensive lesson on ${subtopic} within ${cleanTitle}. We cover core principles, execution mechanics, and real-world considerations.`,
        keyTakeaways: [
          `Core mental model and rationale behind ${subtopic}`,
          `Practical implementation techniques and common pitfalls`,
          `Production considerations for scalability and maintainability`,
        ],
        importantDefinitions: [
          `${subtopic}: Essential topic covered in this section of the ${cleanTitle} masterclass.`,
          `Best Practice: Industry-standard conventions ensuring reliability and code clarity.`,
        ],
        quizQuestions,
      });

      globalLessonIdx++;
    }

    chapters.push({
      title: dayTitle,
      description: `Day ${dIdx + 1} learning module covering ${dayLessons.length} lessons spanning ${Math.round((dayLessons[dayLessons.length - 1].endSeconds - dayLessons[0].startSeconds) / 60)} minutes.`,
      lessons: dayLessons,
    });
  }

  return {
    chapters,
    placementQuestions: generateFallbackPlacement({ chapters }),
  };
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

  const selectedLessons: RawLesson[] = [];
  if (allLessons.length <= 6) {
    selectedLessons.push(...allLessons);
  } else {
    const step = allLessons.length / 6;
    for (let i = 0; i < 6; i++) {
      const idx = Math.min(allLessons.length - 1, Math.floor(i * step));
      selectedLessons.push(allLessons[idx]);
    }
  }

  return selectedLessons.map((les, idx) => {
    const cleanTopic = cleanPlacementText(les.title);
    const lower = cleanTopic.toLowerCase();

    let questionText = "";
    let correctOption = "";
    let wrong1 = "";
    let wrong2 = "";
    let wrong3 = "";
    let explanation = "";

    if (lower.includes("roadmap") || lower.includes("career") || lower.includes("overview") || lower.includes("intro")) {
      questionText = `What is the recommended core technical foundation before building production-grade ${cleanTopic}?`;
      correctOption = "Mastering foundational programming, data structures, and asynchronous API interactions.";
      wrong1 = "Deploying unverified machine learning models directly into production without unit testing.";
      wrong2 = "Skipping code version control (Git) and manually sharing binary executable files.";
      wrong3 = "Disabling authentication checks to maximize network transmission speed.";
      explanation = "A solid grasp of programming fundamentals and system design is essential before engineering advanced architectures.";
    } else if (lower.includes("token") || lower.includes("llm") || lower.includes("genai") || lower.includes("foundational")) {
      questionText = `In modern Large Language Models (LLMs), what is a 'token' and how does the model process it?`;
      correctOption = "A sub-word textual chunk converted into high-dimensional numerical embeddings for transformer processing.";
      wrong1 = "A temporary security password stored in the browser's HTTP-only session cookie.";
      wrong2 = "A hardware register inside the GPU that stores raw uncompressed video frames.";
      wrong3 = "A physical network packet sent over ethernet without TCP headers.";
      explanation = "LLMs tokenize text into sub-words (using algorithms like Byte-Pair Encoding) and represent them as dense vector embeddings.";
    } else if (lower.includes("prompt") || lower.includes("zero-shot") || lower.includes("chain-of-thought") || lower.includes("few-shot")) {
      questionText = `What is the fundamental mechanism that makes Chain-of-Thought (CoT) prompting effective for complex tasks?`;
      correctOption = "It instructs the model to articulate intermediate reasoning steps before arriving at the conclusion.";
      wrong1 = "It executes the same prompt multiple times in parallel and returns the fastest response.";
      wrong2 = "It modifies the internal weight matrices of the model in real time using gradient descent.";
      wrong3 = "It restricts the output to a single yes/no binary boolean response.";
      explanation = "Chain-of-Thought prompting directs the LLM to decompose complicated problems into logical deduction steps, significantly reducing errors.";
    } else if (lower.includes("rag") || lower.includes("vector") || lower.includes("database") || lower.includes("retrieval")) {
      questionText = `In a Retrieval-Augmented Generation (RAG) pipeline, what is the primary purpose of semantic vector search?`;
      correctOption = "To locate and retrieve contextually relevant knowledge chunks based on mathematical cosine similarity.";
      wrong1 = "To compress relational SQL tables into static CSV files for cold archive storage.";
      wrong2 = "To automatically compile dynamic Python scripts into compiled C++ binary libraries.";
      wrong3 = "To bypass rate limits by randomly scattering API requests across multiple IP addresses.";
      explanation = "Vector search matches the user's query vector against document chunk vectors to feed the most semantically relevant context to the prompt.";
    } else if (lower.includes("agent") || lower.includes("langgraph") || lower.includes("langchain") || lower.includes("mcp")) {
      questionText = `What architectural feature fundamentally differentiates an autonomous AI Agent from a standard LLM completion?`;
      correctOption = "An iterative reasoning loop that invokes external tools, inspects feedback, and updates persistent state.";
      wrong1 = "The ability to run exclusively on local microcontroller hardware without an internet connection.";
      wrong2 = "Strictly restricting output generation to static pre-compiled template strings.";
      wrong3 = "Disabling memory persistence so every tool call is completely forgotten immediately.";
      explanation = "Autonomous agents combine reasoning (such as ReAct loops), external tool invocation, and state management to achieve multi-step goals.";
    } else if (lower.includes("openai") || lower.includes("gemini") || lower.includes("claude") || lower.includes("api")) {
      questionText = `When architecting a production application with multi-provider LLM APIs (e.g., OpenAI, Gemini, Claude), what is a key architectural best practice?`;
      correctOption = "Decoupling API calls behind an abstraction interface and enforcing Structured Outputs with strict JSON schemas.";
      wrong1 = "Embedding private secret API keys directly inside public client-side JavaScript bundles.";
      wrong2 = "Assuming every API provider uses identical pricing tiers and latency SLAs.";
      wrong3 = "Disabling retry logic and exponential backoff on HTTP 429 rate limit responses.";
      explanation = "Using provider abstraction layers and schema validation (e.g. Zod or Pydantic) ensures resilient, type-safe multi-model integration.";
    } else if (lower.includes("python") || lower.includes("syntax") || lower.includes("programming")) {
      questionText = `In modern Python engineering, which feature provides type safety and runtime data validation for incoming API payloads?`;
      correctOption = "Type annotations combined with data parsing libraries like Pydantic or dataclasses.";
      wrong1 = "Using raw untyped global variables across all module namespaces.";
      wrong2 = "Converting all numeric inputs into base64 strings before execution.";
      wrong3 = "Suppressing all runtime exceptions with bare except: pass blocks.";
      explanation = "Type hints and validation schemas (e.g., Pydantic) detect malformed payloads early and ensure reliable contract enforcement.";
    } else {
      questionText = `In practical software development, what is the core architectural objective when working with ${cleanTopic}?`;
      correctOption = `To build modular, maintainable, and verifiable components that fulfill ${cleanTopic} requirements.`;
      wrong1 = `To merge all business logic, database queries, and UI components into a single unmaintainable file.`;
      wrong2 = `To disable all automated testing and continuous integration checks to speed up releases.`;
      wrong3 = `To bypass error handling and allow unhandled exceptions to crash the application runtime.`;
      explanation = `Engineering best practices emphasize modularity, separation of concerns, and automated test coverage.`;
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

