import { prisma } from "./db";
import { hashPassword } from "./auth";

export async function runSeed() {
  console.log("🌱 Starting CourseIt Database Seeding...");

  // 1. Create or update Admin User
  const adminEmail = process.env.ADMIN_EMAIL || "admin@courseit.xyz";
  const adminPassword = process.env.ADMIN_PASSWORD || "AdminPassword123!";
  const adminPasswordHash = await hashPassword(adminPassword);

  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: "ADMIN",
        profile: {
          create: {
            displayName: "System Administrator",
            bio: "Principal Engineer and Platform Administrator for CourseIt.",
            avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            dailyStudyMinutes: 60,
            currentStreakDays: 14,
            lastStudyDate: new Date(),
          },
        },
        subscription: {
          create: {
            tier: "MAX",
            status: "ACTIVE",
            monthlyGenerationsUsed: 2,
            monthlyHoursUsedSeconds: 7200,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
    });
    console.log(`✅ Admin user seeded: ${adminEmail}`);
  }

  // 2. Create or update Demo Learner
  const learnerEmail = "learner@courseit.xyz";
  const learnerPassword = "LearnerPassword123!";
  const learnerPasswordHash = await hashPassword(learnerPassword);

  let learner = await prisma.user.findUnique({ where: { email: learnerEmail } });
  if (!learner) {
    learner = await prisma.user.create({
      data: {
        email: learnerEmail,
        passwordHash: learnerPasswordHash,
        role: "USER",
        profile: {
          create: {
            displayName: "Alex Mercer",
            bio: "Self-taught developer building full-stack applications with AI.",
            avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
            dailyStudyMinutes: 60,
            currentStreakDays: 5,
            lastStudyDate: new Date(),
          },
        },
        subscription: {
          create: {
            tier: "PRO",
            status: "ACTIVE",
            monthlyGenerationsUsed: 1,
            monthlyHoursUsedSeconds: 3600,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
    });
    console.log(`✅ Demo learner seeded: ${learnerEmail}`);
  }

  // 3. Create Showcase Course 1: "Next.js 15 & React 19 Full-Stack Masterclass"
  const course1Slug = "nextjs-15-react-19-masterclass";
  let course1 = await prisma.course.findUnique({ where: { slug: course1Slug } });

  if (!course1) {
    course1 = await prisma.course.create({
      data: {
        creatorId: admin.id,
        title: "Next.js 15 & React 19 Full-Stack Masterclass",
        slug: course1Slug,
        description:
          "Transform from frontend beginner into a full-stack engineer. Learn Server Components, Server Actions, App Router caching, streaming SSR, and Prisma persistence.",
        targetAudience: "Web developers looking to master modern full-stack development with Next.js 15.",
        difficulty: "INTERMEDIATE",
        thumbnailUrl: "https://images.unsplash.com/photo-1618401471353-b98aedd04e11?w=800",
        totalDurationSeconds: 4800, // 80 minutes
        estimatedStudyMinutes: 120,
        status: "READY",
        isPublic: true,
        enrollmentCount: 42,
        source: {
          create: {
            sourceType: "YOUTUBE_VIDEO",
            sourceUrl: "https://www.youtube.com/watch?v=wm5gMKuwSYk",
            youtubeId: "wm5gMKuwSYk",
            channelTitle: "Next.js Mastery",
          },
        },
        chapters: {
          create: [
            {
              orderIndex: 0,
              title: "Chapter 1: Foundational Architecture & Server Components",
              description: "Explore the Next.js 15 paradigm, hydration boundaries, and Server Components.",
              lessons: {
                create: [
                  {
                    orderIndex: 0,
                    title: "1. Understanding React Server Components & App Router",
                    description: "Learn how RSC reduces client bundle sizes and executes securely on the server.",
                    youtubeVideoId: "wm5gMKuwSYk",
                    startSeconds: 0,
                    endSeconds: 720, // 12 min
                    durationSeconds: 720,
                    summary:
                      "React Server Components fundamentally alter how web applications load. By executing on the server, components can directly query databases, read file systems, and keep heavy third-party dependencies completely off the client bundle.",
                    keyTakeaways: JSON.stringify([
                      "RSCs render only on the server, transmitting serializable JSON payload to the client.",
                      "Zero client JavaScript footprint for purely informational and data-fetching components.",
                      "Use 'use client' strictly when browser hooks (useState, useEffect, event handlers) are needed.",
                    ]),
                    importantDefinitions: JSON.stringify([
                      "Server Component: A component that executes exclusively on the server and yields virtual DOM representations.",
                      "Client Boundary: Marked by 'use client', this directive establishes where hydration begins.",
                    ]),
                    status: "READY",
                    quizQuestions: {
                      create: [
                        {
                          orderIndex: 0,
                          questionText: "What is the primary benefit of React Server Components (RSC) in Next.js 15?",
                          correctOptionIndex: 1,
                          explanation:
                            "RSCs execute on the server, allowing direct database access while eliminating large libraries from client-side JavaScript bundles.",
                          replayTimestampSeconds: 180,
                          options: {
                            create: [
                              { optionIndex: 0, optionText: "They force all rendering to occur on user mobile devices." },
                              { optionIndex: 1, optionText: "They keep secrets and heavy dependencies on the server with zero client JS." },
                              { optionIndex: 2, optionText: "They disable all CSS animations completely." },
                              { optionIndex: 3, optionText: "They make React code incompatible with TypeScript." },
                            ],
                          },
                        },
                        {
                          orderIndex: 1,
                          questionText: "When should you add the 'use client' directive at the top of a file?",
                          correctOptionIndex: 0,
                          explanation:
                            "'use client' tells Next.js that the component utilizes browser APIs or React lifecycle hooks like useState.",
                          replayTimestampSeconds: 420,
                          options: {
                            create: [
                              { optionIndex: 0, optionText: "When using hooks like useState, useEffect, or interactive onClick handlers." },
                              { optionIndex: 1, optionText: "On every single file in the project regardless of functionality." },
                              { optionIndex: 2, optionText: "Only when connecting directly to PostgreSQL." },
                              { optionIndex: 3, optionText: "Only in the root layout file." },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  {
                    orderIndex: 1,
                    title: "2. Data Fetching, Caching, and Streaming with Suspense",
                    description: "Harness async components, fetch caching, and granular Suspense streaming fallbacks.",
                    youtubeVideoId: "wm5gMKuwSYk",
                    startSeconds: 720,
                    endSeconds: 1600,
                    durationSeconds: 880,
                    summary:
                      "Next.js integrates with native fetch to provide granular request memoization and caching. Using React Suspense, pages can stream in UI blocks progressively as data finishes loading without blocking the entire page.",
                    keyTakeaways: JSON.stringify([
                      "Async React components can directly await database queries or fetch calls.",
                      "React Suspense decouples page loading states into granular skeletons.",
                    ]),
                    importantDefinitions: JSON.stringify([
                      "Streaming SSR: Sending HTML chunks to the browser as soon as they become ready.",
                      "Cache Tagging: Revalidating cached data using revalidateTag() upon mutation.",
                    ]),
                    status: "READY",
                    quizQuestions: {
                      create: [
                        {
                          orderIndex: 0,
                          questionText: "How does React Suspense improve perceived performance in Next.js?",
                          correctOptionIndex: 2,
                          explanation:
                            "Suspense allows fast parts of a page to render instantly while slow data fetches stream in asynchronously with skeleton fallbacks.",
                          replayTimestampSeconds: 950,
                          options: {
                            create: [
                              { optionIndex: 0, optionText: "It compresses all video streams into GIF files." },
                              { optionIndex: 1, optionText: "It blocks the user from clicking links until all databases reply." },
                              { optionIndex: 2, optionText: "It streams HTML progressively so users see partial UI immediately." },
                              { optionIndex: 3, optionText: "It requires running a dedicated Redis cluster for every page." },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            {
              orderIndex: 1,
              title: "Chapter 2: Mutations, Server Actions & Persistence",
              description: "Build robust forms and secure mutations using Server Actions and Prisma.",
              lessons: {
                create: [
                  {
                    orderIndex: 0,
                    title: "3. Server Actions & Form Mutation Architecture",
                    description: "Eliminate repetitive API boilerplate with type-safe server functions called directly from client forms.",
                    youtubeVideoId: "wm5gMKuwSYk",
                    startSeconds: 1600,
                    endSeconds: 2700,
                    durationSeconds: 1100,
                    summary:
                      "Server Actions provide asynchronous RPC-like functions defined on the server that can be passed directly to form actions or triggered via useTransition.",
                    keyTakeaways: JSON.stringify([
                      "Server Actions handle progressive enhancement natively without client JS enabled.",
                      "Always validate incoming formData with Zod or server-side schema verification.",
                    ]),
                    importantDefinitions: JSON.stringify([
                      "Server Action: A secure server-side function that can be invoked directly from the UI.",
                    ]),
                    status: "READY",
                    quizQuestions: {
                      create: [
                        {
                          orderIndex: 0,
                          questionText: "Why must Server Actions validate their inputs on the server?",
                          correctOptionIndex: 1,
                          explanation:
                            "Server Actions are exposed as public HTTP endpoints and can be called arbitrarily; server-side validation is non-negotiable.",
                          replayTimestampSeconds: 2100,
                          options: {
                            create: [
                              { optionIndex: 0, optionText: "Because browsers never transmit form text." },
                              { optionIndex: 1, optionText: "Because client inputs can be spoofed or bypassed by malicious actors." },
                              { optionIndex: 2, optionText: "Because TypeScript compiles to C++ in production." },
                              { optionIndex: 3, optionText: "Because Next.js crashes if Zod is not installed." },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
        placementQuestions: {
          create: [
            {
              orderIndex: 0,
              topicName: "Server Components",
              questionText: "Do React Server Components include their code in the browser JavaScript bundle?",
              correctOptionIndex: 1,
              explanation: "RSCs stay on the server and do not add to the client bundle.",
              options: {
                create: [
                  { optionIndex: 0, optionText: "Yes, all components are bundled into client JS." },
                  { optionIndex: 1, optionText: "No, they execute strictly on the server." },
                  { optionIndex: 2, optionText: "Only if using Tailwind CSS." },
                  { optionIndex: 3, optionText: "Only when deployed to AWS." },
                ],
              },
            },
            {
              orderIndex: 1,
              topicName: "Server Actions",
              questionText: "What directive designates a file or function as a Server Action?",
              correctOptionIndex: 0,
              explanation: "'use server' declares server actions.",
              options: {
                create: [
                  { optionIndex: 0, optionText: "'use server'" },
                  { optionIndex: 1, optionText: "'use client'" },
                  { optionIndex: 2, optionText: "'use action'" },
                  { optionIndex: 3, optionText: "'use backend'" },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`✅ Course 1 seeded: Next.js 15 Masterclass`);
  }

  // 4. Create Showcase Course 2: 13-Hour Mayank Aggarwal Python + AI Masterclass (100% Real YouTube Data)
  const course2Slug = "best-python-ai-full-course";
  let course2: any = await prisma.course.findFirst({
    where: {
      OR: [
        { slug: course2Slug },
        { slug: "python-ai-engineering-from-scratch" },
        { source: { youtubeId: "J9BI0jGOds8" } },
      ],
    },
    include: { source: true },
  });

  if (course2) {
    // Update to 100% real Mayank Aggarwal metadata
    course2 = await prisma.course.update({
      where: { id: course2.id },
      data: {
        title: "Best Python + AI Full Course | Learn Python + AI, Build Projects & Land Your First Job",
        slug: course2Slug,
        description:
          "Want to learn Python from scratch and use it to build real-world AI projects? 13-hour comprehensive masterclass by Mayank Aggarwal covering Python foundations, data structures, OOP, LLMs, prompt engineering, RAG, and AI agents.",
        targetAudience: "Aspiring AI Engineers, Software Developers, and Data Scientists.",
        difficulty: "BEGINNER",
        thumbnailUrl: "https://img.youtube.com/vi/J9BI0jGOds8/hqdefault.jpg",
        totalDurationSeconds: 46899,
        estimatedStudyMinutes: 780,
        status: "READY",
        isPublic: true,
      },
      include: { source: true },
    });

    if (course2.source) {
      await prisma.courseSource.update({
        where: { id: course2.source.id },
        data: {
          youtubeId: "J9BI0jGOds8",
          channelTitle: "Mayank Aggarwal",
          sourceUrl: "https://youtu.be/J9BI0jGOds8",
        },
      });
    }
  } else {
    course2 = await prisma.course.create({
      data: {
        creatorId: admin.id,
        title: "Best Python + AI Full Course | Learn Python + AI, Build Projects & Land Your First Job",
        slug: course2Slug,
        description:
          "Want to learn Python from scratch and use it to build real-world AI projects? 13-hour comprehensive masterclass by Mayank Aggarwal covering Python foundations, data structures, OOP, LLMs, prompt engineering, RAG, and AI agents.",
        targetAudience: "Aspiring AI Engineers, Software Developers, and Data Scientists.",
        difficulty: "BEGINNER",
        thumbnailUrl: "https://img.youtube.com/vi/J9BI0jGOds8/hqdefault.jpg",
        totalDurationSeconds: 46899,
        estimatedStudyMinutes: 780,
        status: "READY",
        isPublic: true,
        enrollmentCount: 142,
        source: {
          create: {
            sourceType: "YOUTUBE_VIDEO",
            sourceUrl: "https://youtu.be/J9BI0jGOds8",
            youtubeId: "J9BI0jGOds8",
            channelTitle: "Mayank Aggarwal",
          },
        },
        chapters: {
          create: [
            {
              orderIndex: 0,
              title: "Day 1 (Core Fundamentals & Setup)",
              description: "Python setup, Anaconda, Jupyter Notebooks, identifiers, and primitive types.",
              lessons: {
                create: [
                  {
                    orderIndex: 0,
                    title: "1. Intro: Master Python + AI",
                    description: "Overview of Python and roadmap to becoming an AI engineer.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 0,
                    endSeconds: 158,
                    durationSeconds: 158,
                    summary: "Introduction to the 13-hour comprehensive masterclass by Mayank Aggarwal.",
                    keyTakeaways: JSON.stringify(["Python is the primary language powering modern AI systems."]),
                    importantDefinitions: JSON.stringify(["Python: High-level interpreted programming language."]),
                    status: "READY",
                  },
                  {
                    orderIndex: 1,
                    title: "2. Why Do We Need Programming?",
                    description: "Foundational computer science principles and machine instruction execution.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 158,
                    endSeconds: 405,
                    durationSeconds: 247,
                    summary: "Exploration of instructions, memory architectures, and the role of code in automating tasks.",
                    status: "READY",
                  },
                  {
                    orderIndex: 2,
                    title: "3. What Is Python & Where It's Used",
                    description: "Industry use cases: Web development, Data Science, Machine Learning, and AI Agents.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 405,
                    endSeconds: 670,
                    durationSeconds: 265,
                    status: "READY",
                  },
                  {
                    orderIndex: 3,
                    title: "4. Anaconda & Jupyter Notebook Setup",
                    description: "Complete local environment configuration for interactive AI experimentation.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 1231,
                    endSeconds: 1758,
                    durationSeconds: 527,
                    status: "READY",
                  },
                ],
              },
            },
            {
              orderIndex: 1,
              title: "Day 2 (Strings & Type Conversions)",
              description: "String slicing, negative indexing, implicit/explicit type casting, and f-strings.",
              lessons: {
                create: [
                  {
                    orderIndex: 0,
                    title: "1. String Indexing & Slicing",
                    description: "Detailed walkthrough of string manipulation, slicing syntax, and step values.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 4744,
                    endSeconds: 6614,
                    durationSeconds: 1870,
                    status: "READY",
                  },
                  {
                    orderIndex: 1,
                    title: "2. Type Conversions & Casting",
                    description: "Implicit type conversion versus explicit type casting in Python.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 7273,
                    endSeconds: 8150,
                    durationSeconds: 877,
                    status: "READY",
                  },
                  {
                    orderIndex: 2,
                    title: "3. Python f-Strings & Formatting",
                    description: "Modern formatted string literals for clean text interpolation.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 12307,
                    endSeconds: 12523,
                    durationSeconds: 216,
                    status: "READY",
                  },
                ],
              },
            },
            {
              orderIndex: 2,
              title: "Day 3 (Conditionals & Loops)",
              description: "Decision control, if-elif-else ladders, while loops, and for loops with range.",
              lessons: {
                create: [
                  {
                    orderIndex: 0,
                    title: "1. Decision Control & if-elif-else",
                    description: "Conditional branching and logic structures in Python.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 12523,
                    endSeconds: 14644,
                    durationSeconds: 2121,
                    status: "READY",
                  },
                  {
                    orderIndex: 1,
                    title: "2. Loops: while and for with range()",
                    description: "Iterative execution, range generator, and break/continue statements.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 15590,
                    endSeconds: 19200,
                    durationSeconds: 3610,
                    status: "READY",
                  },
                ],
              },
            },
            {
              orderIndex: 3,
              title: "Day 4 (Data Structures: Lists, Tuples, Dictionaries)",
              description: "Built-in collections, list comprehensions, tuples, sets, and dictionary lookups.",
              lessons: {
                create: [
                  {
                    orderIndex: 0,
                    title: "1. Lists & List Comprehension",
                    description: "Creating, mutating, sorting, and transforming collections concisely.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 20617,
                    endSeconds: 24522,
                    durationSeconds: 3905,
                    status: "READY",
                  },
                  {
                    orderIndex: 1,
                    title: "2. Tuples, Sets & Dictionaries",
                    description: "Hash-based key-value lookups, immutable sequences, and set algebra.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 24522,
                    endSeconds: 29970,
                    durationSeconds: 5448,
                    status: "READY",
                  },
                ],
              },
            },
            {
              orderIndex: 4,
              title: "Day 5 (Functions & Advanced Logic)",
              description: "Defining functions, *args, **kwargs, variable scopes, and lambda expressions.",
              lessons: {
                create: [
                  {
                    orderIndex: 0,
                    title: "1. Defining Functions & Arguments",
                    description: "Positional, default, keyword, and arbitrary argument lists.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 31296,
                    endSeconds: 34820,
                    durationSeconds: 3524,
                    status: "READY",
                  },
                  {
                    orderIndex: 1,
                    title: "2. Lambda, map, filter & reduce",
                    description: "Functional programming patterns for fast data transformations.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 37324,
                    endSeconds: 38868,
                    durationSeconds: 1544,
                    status: "READY",
                  },
                ],
              },
            },
            {
              orderIndex: 5,
              title: "Day 6 (AI & Large Language Models)",
              description: "LLMs, prompt engineering, temperature, vectors, embeddings, and attention.",
              lessons: {
                create: [
                  {
                    orderIndex: 0,
                    title: "1. Large Language Models (LLMs) & Prompting",
                    description: "How modern generative models interpret instructions and generate tokens.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 39128,
                    endSeconds: 40642,
                    durationSeconds: 1514,
                    status: "READY",
                  },
                  {
                    orderIndex: 1,
                    title: "2. Vectors, Embeddings & Context Window",
                    description: "Representing semantic meaning numerically in high-dimensional vector space.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 41182,
                    endSeconds: 42416,
                    durationSeconds: 1234,
                    status: "READY",
                  },
                  {
                    orderIndex: 2,
                    title: "3. Attention Mechanism & Transformers",
                    description: "Self-attention calculations and the breakthrough architecture powering AI.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 42416,
                    endSeconds: 43477,
                    durationSeconds: 1061,
                    status: "READY",
                  },
                ],
              },
            },
            {
              orderIndex: 6,
              title: "Day 7 (AI Agents, RAG & MCP)",
              description: "RAG architectures, Model Context Protocol (MCP), and autonomous AI agents.",
              lessons: {
                create: [
                  {
                    orderIndex: 0,
                    title: "1. Pretraining, Fine-Tuning & RLHF",
                    description: "The full training lifecycle from foundation model to aligned assistant.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 43477,
                    endSeconds: 44168,
                    durationSeconds: 691,
                    status: "READY",
                  },
                  {
                    orderIndex: 1,
                    title: "2. RAG (Retrieval-Augmented Generation)",
                    description: "Grounding LLMs with external knowledge bases and vector databases.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 44168,
                    endSeconds: 44807,
                    durationSeconds: 639,
                    status: "READY",
                  },
                  {
                    orderIndex: 2,
                    title: "3. MCP (Model Context Protocol) & AI Agents",
                    description: "Connecting tools, file systems, APIs, and building multi-turn agent loops.",
                    youtubeVideoId: "J9BI0jGOds8",
                    startSeconds: 44807,
                    endSeconds: 46899,
                    durationSeconds: 2092,
                    status: "READY",
                  },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`✅ Course 2 seeded: Mayank Aggarwal 13h Python + AI Course`);
  }

  // 5. Enroll learner in Course 1 with real progress and a timestamped note
  const learnerEnrollment = await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: learner.id,
        courseId: course1.id,
      },
    },
    update: {},
    create: {
      userId: learner.id,
      courseId: course1.id,
      progressPercentage: 33.3,
      completedLessonsCount: 1,
    },
  });

  const firstLesson = await prisma.lesson.findFirst({
    where: { chapter: { courseId: course1.id } },
  });

  if (firstLesson) {
    // Record lesson progress
    await prisma.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: learnerEnrollment.id,
          lessonId: firstLesson.id,
        },
      },
      update: {},
      create: {
        enrollmentId: learnerEnrollment.id,
        lessonId: firstLesson.id,
        isCompleted: true,
        isSkipped: false,
        lastPlaybackSeconds: 320,
        completedAt: new Date(),
      },
    });

    // Record study note with timestamp
    const existingNote = await prisma.studyNote.findFirst({
      where: { userId: learner.id, lessonId: firstLesson.id },
    });

    if (!existingNote) {
      await prisma.studyNote.create({
        data: {
          userId: learner.id,
          lessonId: firstLesson.id,
          timestampSeconds: 185,
          content:
            "Key insight: Server Components never transmit their source code or node_modules to the client. Only the rendered JSON payload is sent over the wire!",
        },
      });
      console.log(`✅ Seeded timestamped study note for Alex Mercer at 03:05`);
    }
  }

  // 6. Create Multi-Course Roadmap
  const roadmapSlug = "full-stack-ai-engineer-career-track";
  let roadmap = await prisma.roadmap.findUnique({ where: { slug: roadmapSlug } });

  if (!roadmap) {
    roadmap = await prisma.roadmap.create({
      data: {
        creatorId: admin.id,
        title: "Full-Stack AI Software Engineer Career Track",
        slug: roadmapSlug,
        description:
          "The definitive step-by-step pathway from web fundamentals to building production AI SaaS applications. Master Next.js, TypeScript, PostgreSQL, and LLM systems.",
        badge: "🚀",
        isPublic: true,
        enrollmentCount: 19,
        stages: {
          create: [
            {
              stageIndex: 0,
              title: "Stage 1: Modern Web Foundations",
              description: "Build robust full-stack applications with Next.js 15 and Server Components.",
              courses: {
                create: [
                  {
                    orderIndex: 0,
                    courseId: course1.id,
                  },
                ],
              },
            },
            {
              stageIndex: 1,
              title: "Stage 2: AI Engineering & LLM Orchestration",
              description: "Implement AI generation pipelines, embeddings, and prompt architectures.",
              courses: {
                create: [
                  {
                    orderIndex: 0,
                    courseId: course2.id,
                  },
                ],
              },
            },
          ],
        },
      },
    });

    // Enroll learner in roadmap
    await prisma.roadmapEnrollment.create({
      data: {
        userId: learner.id,
        roadmapId: roadmap.id,
        progressPercentage: 50.0,
      },
    });

    console.log(`✅ Seeded multi-course roadmap: ${roadmap.title}`);
  }

  // 7. Seed or Update User's Roadmap: "Become an AI Engineer" (matching user's URL: /roadmaps/becomr-an-ai-engineer-sap5s)
  const userRoadmapSlug = "becomr-an-ai-engineer-sap5s";
  let userRoadmap = await prisma.roadmap.findFirst({
    where: {
      OR: [
        { slug: userRoadmapSlug },
        { title: { contains: "Becom", mode: "insensitive" } },
      ],
    },
    include: { stages: { include: { courses: true } } },
  });

  if (!userRoadmap) {
    userRoadmap = await prisma.roadmap.create({
      data: {
        creatorId: admin.id,
        title: "Become an AI Engineer",
        slug: userRoadmapSlug,
        description: "The complete step-by-step roadmap from Python fundamentals to building real-world AI applications, agents, and RAG architectures.",
        badge: "🧠",
        isPublic: true,
        enrollmentCount: 31,
        stages: {
          create: [
            {
              stageIndex: 0,
              title: "Foundations & Prerequisite",
              description: "Master Python fundamentals, modern syntax, and development environments.",
              courses: {
                create: [
                  {
                    orderIndex: 0,
                    courseId: course2.id,
                  },
                ],
              },
            },
            {
              stageIndex: 1,
              title: "Full-Stack AI Engineering & Deployment",
              description: "Build robust full-stack applications with Next.js 15 and Server Components.",
              courses: {
                create: [
                  {
                    orderIndex: 0,
                    courseId: course1.id,
                  },
                ],
              },
            },
          ],
        },
      },
      include: { stages: { include: { courses: true } } },
    });
    console.log(`✅ Seeded user roadmap: ${userRoadmap.title} (${userRoadmapSlug})`);
  } else {
    // Ensure Stage 1 has the Mayank Aggarwal course
    const stage1 = userRoadmap.stages[0];
    if (stage1) {
      await prisma.roadmapCourse.deleteMany({
        where: { roadmapStageId: stage1.id },
      });
      await prisma.roadmapCourse.create({
        data: {
          roadmapStageId: stage1.id,
          courseId: course2.id,
          orderIndex: 0,
        },
      });
      console.log(`✅ Updated stage 1 of ${userRoadmap.title} with Mayank Aggarwal course`);
    }
  }

  console.log("🎉 Database seeding successfully completed!");
}

if (process.env.RUN_SEED_DIRECTLY) {
  runSeed()
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
