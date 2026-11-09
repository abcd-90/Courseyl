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

  // 4. Create Showcase Course 2: "Python & AI Engineering from Scratch"
  const course2Slug = "python-ai-engineering-from-scratch";
  let course2 = await prisma.course.findUnique({ where: { slug: course2Slug } });

  if (!course2) {
    course2 = await prisma.course.create({
      data: {
        creatorId: admin.id,
        title: "Python & Modern AI Engineering from Scratch",
        slug: course2Slug,
        description:
          "Master Python fundamentals, NumPy, vector embeddings, prompt engineering, and LLM orchestration with NVIDIA Nemotron and OpenAI.",
        targetAudience: "Engineers looking to build production AI systems.",
        difficulty: "BEGINNER",
        thumbnailUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800",
        totalDurationSeconds: 3600,
        estimatedStudyMinutes: 90,
        status: "READY",
        isPublic: true,
        enrollmentCount: 68,
        source: {
          create: {
            sourceType: "YOUTUBE_VIDEO",
            sourceUrl: "https://www.youtube.com/watch?v=_uQrJ0TkZlc",
            youtubeId: "_uQrJ0TkZlc",
            channelTitle: "AI Programming Hub",
          },
        },
        chapters: {
          create: [
            {
              orderIndex: 0,
              title: "Chapter 1: Python Fundamentals & Data Structures",
              description: "Lists, dictionaries, list comprehensions, and functional patterns.",
              lessons: {
                create: [
                  {
                    orderIndex: 0,
                    title: "1. Core Syntax, Data Types & Idiomatic Python",
                    description: "Learn clean, idiomatic Python patterns for modern software development.",
                    youtubeVideoId: "_uQrJ0TkZlc",
                    startSeconds: 0,
                    endSeconds: 1200,
                    durationSeconds: 1200,
                    summary: "A rapid review of dynamic typing, lists, tuples, and dictionary unpacking in Python 3.12+.",
                    keyTakeaways: JSON.stringify([
                      "Dictionaries and sets provide O(1) average lookup times.",
                      "List comprehensions provide readable and performant collection generation.",
                    ]),
                    importantDefinitions: JSON.stringify([
                      "List Comprehension: Concise syntax for generating new lists from iterables.",
                    ]),
                    status: "READY",
                    quizQuestions: {
                      create: [
                        {
                          orderIndex: 0,
                          questionText: "What is the average time complexity for key lookup in a Python dictionary?",
                          correctOptionIndex: 0,
                          explanation: "Python dictionaries use hash tables, providing O(1) amortized lookup.",
                          replayTimestampSeconds: 600,
                          options: {
                            create: [
                              { optionIndex: 0, optionText: "O(1)" },
                              { optionIndex: 1, optionText: "O(n)" },
                              { optionIndex: 2, optionText: "O(log n)" },
                              { optionIndex: 3, optionText: "O(n^2)" },
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
              topicName: "Python Basics",
              questionText: "Which keyword defines an anonymous inline function in Python?",
              correctOptionIndex: 2,
              explanation: "lambda creates anonymous functions in Python.",
              options: {
                create: [
                  { optionIndex: 0, optionText: "def" },
                  { optionIndex: 1, optionText: "function" },
                  { optionIndex: 2, optionText: "lambda" },
                  { optionIndex: 3, optionText: "val" },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`✅ Course 2 seeded: Python & AI Engineering`);
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
