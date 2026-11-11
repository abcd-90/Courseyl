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

  // Tier limits: allow comprehensive multi-hour masterclasses (including 24h+ marathons)
  const tierLimits = {
    FREE: { maxCourses: 5, maxDurationSec: 108000 },
    PRO: { maxCourses: 20, maxDurationSec: 144000 },
    MAX: { maxCourses: 50, maxDurationSec: 180000 },
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

  // 5. Ingest transcript (skip massive caption XML streams on 4h+ chaptered videos unless LLM active)
  const provider = getAIProvider();
  const hasExternalAI =
    provider instanceof NemotronAIProvider || provider instanceof OpenAIProvider;
  let transcripts: TranscriptSegment[] | null = null;
  if (manualTranscript && manualTranscript.trim()) {
    transcripts = [
      {
        text: manualTranscript.trim(),
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
  try {
    let curriculumData = await generateCurriculumStructure(meta, transcripts, provider, difficulty);

    // Ensure we have at least 1 chapter and lessons covering duration
    if (!curriculumData.chapters || curriculumData.chapters.length === 0) {
      curriculumData = generateFallbackCurriculum(meta, difficulty, transcripts);
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
    const firstStart = firstLessonData.startSeconds ?? 0;
    const firstEnd = firstLessonData.endSeconds ?? Math.min(600, meta.durationSeconds);
    const createdFirstLesson = await prisma.lesson.create({
      data: {
        chapterId: createdFirstChapter.id,
        orderIndex: 0,
        title: firstLessonData.title,
        description: firstLessonData.description || firstLessonData.summary || `Master ${firstLessonData.title} with step-by-step guidance.`,
        youtubeVideoId: parsedUrl.videoId,
        startSeconds: firstStart,
        endSeconds: firstEnd,
        durationSeconds: Math.max(30, firstEnd - firstStart),
        summary: firstLessonData.summary || firstLessonData.description || `Master ${firstLessonData.title} with step-by-step guidance.`,
        keyTakeaways: JSON.stringify(firstLessonData.keyTakeaways || []),
        importantDefinitions: JSON.stringify(firstLessonData.importantDefinitions || []),
        status: "READY",
      },
    });

    // Create quiz for Lesson 1 with nested options
    if (firstLessonData.quizQuestions && firstLessonData.quizQuestions.length > 0) {
      await Promise.all(
        firstLessonData.quizQuestions.map((q, qIdx) =>
          prisma.quizQuestion.create({
            data: {
              lessonId: createdFirstLesson.id,
              orderIndex: qIdx,
              questionText: q.questionText,
              correctOptionIndex: q.correctOptionIndex,
              explanation: q.explanation,
              replayTimestampSeconds: q.replayTimestampSeconds || createdFirstLesson.startSeconds,
              options: {
                create: (q.options || []).map((opt, optIdx) => ({
                  optionIndex: optIdx,
                  optionText: opt,
                })),
              },
            },
          })
        )
      );
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

    // 9. Process remaining lessons in Chapter 1 and subsequent chapters using bounded concurrency batches
    const firstChapter = curriculumData.chapters[0];
    if (firstChapter.lessons.length > 1) {
      await Promise.all(
        firstChapter.lessons.slice(1).map((l, sliceIdx) =>
          prisma.lesson.create({
            data: {
              chapterId: createdFirstChapter.id,
              orderIndex: sliceIdx + 1,
              title: l.title,
              description: l.description || l.summary || `Comprehensive lesson on ${l.title}.`,
              youtubeVideoId: parsedUrl.videoId || "",
              startSeconds: l.startSeconds,
              endSeconds: l.endSeconds,
              durationSeconds: Math.max(30, l.endSeconds - l.startSeconds),
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
          })
        )
      );
    }

    const remainingChapters = curriculumData.chapters.slice(1);
    const CHAPTER_CONCURRENCY = 3;
    for (let i = 0; i < remainingChapters.length; i += CHAPTER_CONCURRENCY) {
      const wave = remainingChapters.slice(i, i + CHAPTER_CONCURRENCY);
      await Promise.all(
        wave.map((c, waveIdx) => {
          const cIdx = i + waveIdx + 1;
          return prisma.chapter.create({
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
                  durationSeconds: Math.max(30, l.endSeconds - l.startSeconds),
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
        })
      );
    }

    // 10. Generate Placement Diagnostic Questions for the course (nested creates in parallel)
    const placementQuestions =
      curriculumData.placementQuestions && curriculumData.placementQuestions.length >= 3
        ? curriculumData.placementQuestions
        : generateFallbackPlacement(curriculumData);

    await Promise.all(
      placementQuestions.map((pq, pIdx) =>
        prisma.placementQuestion.create({
          data: {
            courseId: course.id,
            orderIndex: pIdx,
            topicName: cleanPlacementText(pq.topicName),
            questionText: cleanPlacementText(pq.questionText),
            correctOptionIndex: pq.correctOptionIndex,
            explanation: cleanPlacementText(pq.explanation),
            options: {
              create: pq.options.map((optText, optIdx) => ({
                optionIndex: optIdx,
                optionText: cleanPlacementText(optText),
              })),
            },
          },
        })
      )
    );

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
    keywords: ["langgraph", "stategraph", "node", "edge", "graph"],
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
    keywords: ["fastapi", "postgresql", "postgres", "sqlalchemy", "database", "crud", "groq", "api"],
    term: "Backend API & Relational Storage",
    definition: "Exposing typed REST endpoints (e.g., FastAPI) backed by transactional PostgreSQL/SQLAlchemy models and low-latency inference APIs.",
    takeaway: "Decouple stateless HTTP request handlers from connection-pooled database persistence and strict schema validation.",
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
  if (/backend|fastapi|express|nestjs|redis|docker|kubernetes|microservice/.test(haystack)) return "backend";
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

function matchConceptsForText(text: string): ConceptEntry[] {
  const lower = text.toLowerCase();
  const hits: ConceptEntry[] = [];
  for (const entry of KNOWLEDGE_GLOSSARY) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
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
  } = params;

  const cleanTopic = cleanConceptTopic(title) || title;
  const durMin = Math.max(1, Math.round((endSeconds - startSeconds) / 60));
  const clockStart = formatClockTimestamp(startSeconds);
  const clockEnd = formatClockTimestamp(endSeconds);
  const concepts = matchConceptsForText(`${title} ${courseTitle}`);
  const primaryConcept = concepts[0];
  const transcriptSnippet = extractTranscriptExcerpt(transcripts, startSeconds, endSeconds);
  const courseLead = extractCourseDescriptionFocus(courseDescription);

  const descriptionParts = [
    `Explore ${cleanTopic} (${clockStart} – ${clockEnd}, ${durMin} min) with practical architecture walkthroughs tailored to ${courseTitle.split(/[|–—-]/)[0].trim()}.`,
  ];
  if (primaryConcept) {
    descriptionParts.push(primaryConcept.definition);
  } else if (nextTitle) {
    descriptionParts.push(`Connects directly into "${cleanConceptTopic(nextTitle)}" as the system scales.`);
  }

  const summaryParts = [
    `Segment Overview [${clockStart} – ${clockEnd}]: This ${durMin}-minute lesson breaks down ${cleanTopic}.`,
  ];
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

  const takeawaysSet = new Set<string>();
  for (const c of concepts.slice(0, 3)) {
    takeawaysSet.add(c.takeaway);
  }
  takeawaysSet.add(`Understand the core mechanics and practical implementation of ${cleanTopic}.`);
  if (takeawaysSet.size < 3 && nextTitle) {
    takeawaysSet.add(`See how ${cleanTopic} integrates cleanly before moving to ${cleanConceptTopic(nextTitle)}.`);
  }
  if (takeawaysSet.size < 3) {
    takeawaysSet.add(`Review patterns, failure modes, and verifiable engineering checkpoints across this ${durMin}-minute module.`);
  }

  const definitions: string[] = concepts
    .slice(0, 3)
    .map((c) => `${c.term}: ${c.definition}`);
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

  const quizQuestions: RawQuizQuestion[] = [];
  const span = Math.max(20, endSeconds - startSeconds);
  const conceptWithQ = concepts.find((c) => c.question);

  const rotateQuiz = (
    qText: string,
    correct: string,
    wrongs: [string, string, string],
    explanation: string,
    qIdx: number
  ): RawQuizQuestion => {
    const targetIdx = (lessonIndex + qIdx) % 4;
    const options: string[] = [];
    let wCursor = 0;
    for (let i = 0; i < 4; i++) {
      if (i === targetIdx) options.push(correct);
      else options.push(wrongs[wCursor++]);
    }
    return {
      questionText: qText,
      options,
      correctOptionIndex: targetIdx,
      explanation,
      replayTimestampSeconds: Math.floor(startSeconds + span * (qIdx === 0 ? 0.25 : 0.6)),
    };
  };

  if (conceptWithQ?.question) {
    quizQuestions.push(
      rotateQuiz(
        conceptWithQ.question.prompt,
        conceptWithQ.question.correct,
        conceptWithQ.question.distractors,
        conceptWithQ.question.explanation,
        0
      )
    );
  } else {
    quizQuestions.push(
      rotateQuiz(
        `What is the primary learning outcome of "${cleanTopic}"?`,
        `Designing, implementing, and verifying ${cleanTopic} using clean interfaces and structured data flow.`,
        [
          `Bypassing input validation and relying on hardcoded global state throughout`,
          `Replacing modular components with duplicated copy-pasted scripts`,
          `Suppressing runtime exceptions so failures remain invisible`,
        ],
        `This module focuses on mastering ${cleanTopic} with maintainable patterns and clear validation.`,
        0
      )
    );
  }

  quizQuestions.push(
    rotateQuiz(
      `When applying "${cleanTopic}" in a real-world workflow, which practice ensures stability?`,
      concepts[0]
        ? `${concepts[0].takeaway}`
        : `Validating edge cases, documenting assumptions, and verifying outputs before downstream integration.`,
      [
        `Skipping automated verification and ignoring schema constraints`,
        `Hardcoding credentials directly inside source files`,
        `Disabling logging and observability hooks in production`,
      ],
      `Applying ${cleanTopic} reliably requires explicit contracts, clear boundaries, and testable validation.`,
      1
    )
  );

  return {
    title,
    description: descriptionParts.join(" "),
    startSeconds,
    endSeconds,
    summary: summaryParts.join(" "),
    keyTakeaways: Array.from(takeawaysSet).slice(0, 4),
    importantDefinitions: definitions.slice(0, 3),
    quizQuestions,
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

  // Split oversized chapters (> 50 minutes = 3000s) into ~35-42 min focused lessons
  const MAX_CHAPTER_SECONDS = 3000;
  const IDEAL_SUBPART_SECONDS = 2400;
  const subdivided: TimeSegment[] = [];

  for (const seg of continuous) {
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

export async function generateCurriculumStructure(
  meta: Pick<VideoMetadata, "title" | "durationSeconds" | "description" | "chapters">,
  transcripts: TranscriptSegment[] | null,
  provider: ReturnType<typeof getAIProvider>,
  difficulty: string
): Promise<RawCurriculum> {
  // 1. When real YouTube chapters/timestamps exist (>= 2), normalize, subdivide long modules, and partition cleanly
  if (meta.chapters && meta.chapters.length >= 2) {
    return organizeChaptersIntoDailyPlan(
      meta.chapters,
      meta.durationSeconds,
      meta.title,
      meta.description,
      transcripts
    );
  }

  // 2. When no YouTube timestamps exist and external LLM is active, enrich precomputed full-duration timeline slots
  if (provider instanceof NemotronAIProvider || provider instanceof OpenAIProvider) {
    try {
      const { slots } = buildScheduleSlots(meta.durationSeconds);
      const batchSize = 12;
      const enrichedSegments: TimeSegment[] = [];

      for (let i = 0; i < slots.length; i += batchSize) {
        const batch = slots.slice(i, i + batchSize);
        const slotHints = batch
          .map((s, idx) => {
            const excerpt = extractTranscriptExcerpt(transcripts, s.startSeconds, s.endSeconds, 180);
            return `Slot ${idx + 1}: ${s.startSeconds}s..${s.endSeconds}s (${formatClockTimestamp(s.startSeconds)}-${formatClockTimestamp(s.endSeconds)})${
              excerpt ? ` | Transcript: "${excerpt}"` : ""
            }`;
          })
          .join("\n");

        const prompt = `You are structuring an online course from "${meta.title}" (${formatDuration(meta.durationSeconds)} total, difficulty: ${difficulty}).
Course context: ${(meta.description || "").slice(0, 600)}
Generate distinct, progressive lesson titles strictly matching these exact time slots:
${slotHints}`;

        const schema = `{
  "lessons": [
    { "title": "Specific concise lesson title" }
  ]
}`;

        const res = await provider.generateJSON<{ lessons?: { title?: string }[] }>(prompt, schema);
        batch.forEach((slot, idx) => {
          const aiTitle = res?.lessons?.[idx]?.title?.trim();
          enrichedSegments.push({
            title: aiTitle || `Module ${i + idx + 1}: Core Concepts & Walkthrough`,
            startSeconds: slot.startSeconds,
            endSeconds: slot.endSeconds,
          });
        });
      }

      if (enrichedSegments.length === slots.length) {
        return partitionSegmentsIntoDays(
          enrichedSegments,
          meta.durationSeconds,
          meta,
          transcripts
        );
      }
    } catch (err) {
      console.warn(
        "LLM API generation failed, seamlessly falling back to high-fidelity domain synthesizer:",
        err
      );
    }
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

