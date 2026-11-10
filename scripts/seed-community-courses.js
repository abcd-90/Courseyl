require("dotenv").config();
const { Client } = require("pg");
const crypto = require("crypto");

const cuid = () => "cmw" + crypto.randomBytes(10).toString("hex");

const coursesToSeed = [
  {
    title: "Python Tutorial For Beginners in Hindi | Complete Python Course",
    slug: "python-tutorial-for-beginners-in-hindi-complete-python-course-p1a8b",
    channelTitle: "CodeWithHarry",
    youtubeId: "urbkF3zPpxw",
    thumbnailUrl: "https://i.ytimg.com/vi/urbkF3zPpxw/hqdefault.jpg",
    totalDurationSeconds: 39240,
    difficulty: "BEGINNER",
    enrollmentCount: 241,
    creatorName: "Phonk",
    description: "Learn Python from scratch with hands-on practice, real-world examples, and foundational coding exercises.",
    topics: ["Python Syntax & Variables", "Control Flow & Loops", "Functions & Scope", "Data Structures", "Object Oriented Programming"],
  },
  {
    title: "Complete Agentic AI Course In 10 Hours- Langchain, LangGraph, RAG & MCP",
    slug: "complete-agentic-ai-course-in-10-hours-langchain-langgraph-rag-mcp-ag92f",
    channelTitle: "Krish Naik",
    youtubeId: "eynUbHweaQM",
    thumbnailUrl: "https://i.ytimg.com/vi/eynUbHweaQM/hqdefault.jpg",
    totalDurationSeconds: 40380,
    difficulty: "INTERMEDIATE",
    enrollmentCount: 156,
    creatorName: "Bhanuranjan",
    description: "Build production AI agents using LangChain, LangGraph, tool-calling LLMs, and multi-agent coordination.",
    topics: ["LLM Fundamentals & Tokens", "Prompt Engineering & CoT", "RAG & Vector Databases", "LangGraph State Machines", "Autonomous Agents & Tools"],
  },
  {
    title: "Python for AI - Full Beginner Course",
    slug: "python-for-ai-full-beginner-course-py81a",
    channelTitle: "Dave Ebbelaar",
    youtubeId: "ygXn5nV5qFc",
    thumbnailUrl: "https://i.ytimg.com/vi/ygXn5nV5qFc/maxresdefault.jpg",
    totalDurationSeconds: 18960,
    difficulty: "BEGINNER",
    enrollmentCount: 104,
    creatorName: "ABHISHEK",
    description: "Python essentials tailored specifically for AI engineers: NumPy arrays, Pandas DataFrames, and model APIs.",
    topics: ["Python Setup & Pip", "NumPy Vectorized Math", "Pandas Data Wrangling", "FastAPI Endpoints", "OpenAI & Anthropic SDKs"],
  },
  {
    title: "Learn Full Excel Course from Basic to Advanced with AI",
    slug: "learn-full-excel-course-from-basic-to-advanced-with-ai-ex44k",
    channelTitle: "Satish Dhawale",
    youtubeId: "5eP_l_w3kio",
    thumbnailUrl: "https://i.ytimg.com/vi/5eP_l_w3kio/hqdefault.jpg",
    totalDurationSeconds: 54420,
    difficulty: "BEGINNER",
    enrollmentCount: 75,
    creatorName: "Ramu",
    description: "Master modern spreadsheets: VLOOKUP, XLOOKUP, Pivot Tables, Power Query, and Copilot AI integrations.",
    topics: ["Formulas & Cell Referencing", "XLOOKUP & Nested Logic", "Pivot Tables & Slicers", "Power Query Transformations", "Excel AI Workflows"],
  },
  {
    title: "Advanced Backend + AI Full Course | Docker, Redis, System Design",
    slug: "advanced-backend-ai-full-course-docker-redis-system-design-bk90q",
    channelTitle: "VIRTUAL CODE",
    youtubeId: "bK_xK3pLq18",
    thumbnailUrl: "https://i.ytimg.com/vi/bK_xK3pLq18/hqdefault.jpg",
    totalDurationSeconds: 34620,
    difficulty: "ADVANCED",
    enrollmentCount: 68,
    creatorName: "ABHISHEK",
    description: "Design high-scale backend architectures with microservices, Redis caching, message queues, and Docker containerization.",
    topics: ["Microservice Architecture", "Redis Caching Strategies", "Postgres Indexing & Locks", "Docker Compose Orchestration", "Rate Limiting & Auth"],
  },
  {
    title: "Full-Stack AI Engineering Course (FastAPI, LLMs, Docker, Supabase)",
    slug: "full-stack-ai-engineering-course-fastapi-llms-docker-supabase-fs77m",
    channelTitle: "Dave Ebbelaar",
    youtubeId: "y_b3tJ9_1e8",
    thumbnailUrl: "https://i.ytimg.com/vi/y_b3tJ9_1e8/hqdefault.jpg",
    totalDurationSeconds: 11400,
    difficulty: "INTERMEDIATE",
    enrollmentCount: 63,
    creatorName: "Manish",
    description: "End-to-end full-stack AI app development combining a React frontend with FastAPI and Supabase pgvector.",
    topics: ["Full-Stack Architecture", "FastAPI Async Services", "Supabase Vector Embeddings", "Streaming LLM Responses", "Production Deployment"],
  },
  {
    title: "Harvard CS50's Introduction to Programming with Python",
    slug: "harvard-cs50s-introduction-to-programming-with-python-cs50p",
    channelTitle: "freeCodeCamp.org",
    youtubeId: "nLRL_NcnK-4",
    thumbnailUrl: "https://i.ytimg.com/vi/nLRL_NcnK-4/hqdefault.jpg",
    totalDurationSeconds: 57480,
    difficulty: "BEGINNER",
    enrollmentCount: 120,
    creatorName: "David",
    description: "Harvard university's gold-standard introduction to computer science using Python.",
    topics: ["Functions & Variables", "Conditionals & Exceptions", "Loops & Iterations", "Libraries & Unit Tests", "Object-Oriented Programming"],
  },
  {
    title: "System Design Course - APIs, Databases, Caching, CDNs",
    slug: "system-design-course-apis-databases-caching-cdns-sd22c",
    channelTitle: "freeCodeCamp.org",
    youtubeId: "m8Icp_Cid5o",
    thumbnailUrl: "https://i.ytimg.com/vi/m8Icp_Cid5o/hqdefault.jpg",
    totalDurationSeconds: 7500,
    difficulty: "ADVANCED",
    enrollmentCount: 42,
    creatorName: "Anil",
    description: "Learn how modern web systems scale to millions of users with horizontal scaling, CDNs, load balancing, and ACID databases.",
    topics: ["Horizontal vs Vertical Scaling", "Load Balancers & Reverse Proxies", "Database Sharding & Replication", "Cache Invalidation Patterns", "Asynchronous Message Queues"],
  },
  {
    title: "Learn Ethical Hacking from ZERO to ADVANCED | 35+ Hours Practical Course",
    slug: "learn-ethical-hacking-from-zero-to-advanced-35-hours-dgwh",
    channelTitle: "Cyber Mind Space",
    youtubeId: "3Kq1MIfTWCE",
    thumbnailUrl: "https://i.ytimg.com/vi/3Kq1MIfTWCE/hqdefault.jpg",
    totalDurationSeconds: 43020,
    difficulty: "ADVANCED",
    enrollmentCount: 89,
    creatorName: "Sameer",
    description: "Practical penetration testing, network reconnaissance, web app exploitation, privilege escalation, and defense mechanisms.",
    topics: ["Network Reconnaissance", "Port Scanning & Nmap", "Vulnerability Analysis", "Web Exploitation & SQLi", "Privilege Escalation"],
  },
];

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  console.log("Connected to PostgreSQL DB.");

  // Clean up any courses without chapters from previous aborted run
  await client.query(`DELETE FROM "Course" WHERE id NOT IN (SELECT DISTINCT "courseId" FROM "Chapter") AND "createdAt" > NOW() - INTERVAL '1 hour'`);

  // Get a creator user id
  const userRes = await client.query(`SELECT id FROM "User" LIMIT 1`);
  if (userRes.rows.length === 0) {
    console.error("No user found in DB.");
    process.exit(1);
  }
  const creatorId = userRes.rows[0].id;

  for (const c of coursesToSeed) {
    const existing = await client.query(`SELECT id FROM "Course" WHERE slug = $1`, [c.slug]);
    if (existing.rows.length > 0) {
      console.log(`Course exists: ${c.title}`);
      continue;
    }

    const courseId = cuid();
    console.log(`Creating: ${c.title} (${courseId})...`);

    await client.query(
      `INSERT INTO "Course" (id, "creatorId", title, slug, description, difficulty, "thumbnailUrl", "totalDurationSeconds", "estimatedStudyMinutes", status, "isPublic", "enrollmentCount", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'READY', true, $10, NOW(), NOW())`,
      [
        courseId,
        creatorId,
        c.title,
        c.slug,
        c.description,
        c.difficulty,
        c.thumbnailUrl,
        c.totalDurationSeconds,
        Math.round(c.totalDurationSeconds / 60),
        c.enrollmentCount,
      ]
    );

    const sourceId = cuid();
    await client.query(
      `INSERT INTO "CourseSource" (id, "courseId", "sourceType", "sourceUrl", "youtubeId", "channelTitle")
       VALUES ($1, $2, 'YOUTUBE_VIDEO', $3, $4, $5)`,
      [sourceId, courseId, `https://www.youtube.com/watch?v=${c.youtubeId}`, c.youtubeId, c.channelTitle]
    );

    // Chapters & Lessons
    const dayCount = 4;
    const lessonsPerDay = 4;
    let lessonIndex = 0;

    for (let day = 1; day <= dayCount; day++) {
      const chapterId = cuid();
      const chapterTitle = `Day ${day} (${c.topics[day - 1] || "Core Concepts"})`;
      await client.query(
        `INSERT INTO "Chapter" (id, "courseId", title, "orderIndex")
         VALUES ($1, $2, $3, $4)`,
        [chapterId, courseId, chapterTitle, day]
      );

      for (let l = 1; l <= lessonsPerDay; l++) {
        lessonIndex++;
        const lessonId = cuid();
        const durationSec = Math.round(c.totalDurationSeconds / (dayCount * lessonsPerDay));
        const lessonTitle = `Module ${day}.${l}: ${c.topics[(day + l) % c.topics.length]} (Part ${l})`;
        const summary = `In this lesson, master ${c.topics[(day + l) % c.topics.length]} with real world implementations and practical examples.`;

        await client.query(
          `INSERT INTO "Lesson" (id, "chapterId", title, "orderIndex", "youtubeVideoId", "startSeconds", "endSeconds", "durationSeconds", summary, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [
            lessonId,
            chapterId,
            lessonTitle,
            l,
            c.youtubeId,
            (lessonIndex - 1) * durationSec,
            lessonIndex * durationSec,
            durationSec,
            summary,
          ]
        );
      }
    }

    // Diagnostic Placement Questions
    for (let qIdx = 0; qIdx < c.topics.length; qIdx++) {
      const qId = cuid();
      const topic = c.topics[qIdx];
      const qText = `Which statement best describes the core principle of ${topic}?`;
      const correctIdx = qIdx % 4;

      await client.query(
        `INSERT INTO "PlacementQuestion" (id, "courseId", "topicName", "questionText", "correctOptionIndex", "orderIndex", "explanation")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [qId, courseId, topic, qText, correctIdx, qIdx + 1, `Demonstrates solid grasp and practical competency in ${topic}.`]
      );

      const topicOptions = [
        `It provides modular, reliable contracts for scaling ${topic} effectively in real systems.`,
        `It forces linear blocking operations without asynchronous concurrency or caching.`,
        `It bypasses error validation and leaves state synchronization unmanaged.`,
        `It requires full system downtime whenever configuration changes occur.`,
      ];

      // Rotate options so correctIdx matches the right answer
      const rotatedOptions = [...topicOptions];
      if (correctIdx !== 0) {
        const temp = rotatedOptions[0];
        rotatedOptions[0] = rotatedOptions[correctIdx];
        rotatedOptions[correctIdx] = temp;
      }

      for (let optIdx = 0; optIdx < rotatedOptions.length; optIdx++) {
        const optId = cuid();
        await client.query(
          `INSERT INTO "PlacementOption" (id, "questionId", "optionIndex", "optionText")
           VALUES ($1, $2, $3, $4)`,
          [optId, qId, optIdx, rotatedOptions[optIdx]]
        );
      }
    }

    console.log(`✓ Seeded ${c.title}`);
  }

  await client.end();
  console.log("All community courses seeded successfully!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Error seeding:", e);
  process.exit(1);
});
