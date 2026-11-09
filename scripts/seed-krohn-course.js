const Database = require('better-sqlite3');
const db = new Database('./dev.db');

try {
  const userId = 'cmw7ty0nk0000ygu21ma73asd'; // Admin user
  const courseId = 'crs_krohn_agentic_ai';
  const courseSlug = 'agentic-ai-engineering-workshop';

  // 1. Insert or Replace Course
  db.prepare(`
    INSERT OR REPLACE INTO Course (
      id, creatorId, title, slug, description, targetAudience, difficulty, thumbnailUrl,
      totalDurationSeconds, estimatedStudyMinutes, status, isPublic, enrollmentCount, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'READY', 1, 18, datetime('now'), datetime('now')
    )
  `).run(
    courseId,
    userId,
    'Agentic AI Engineering: Complete 4-Hour Workshop feat. MCP, CrewAI and OpenAI Agents SDK',
    courseSlug,
    'Build production-grade AI agents from scratch with Jon Krohn. Master Model Context Protocol (MCP), CrewAI, OpenAI Agents SDK, tool calling, and multi-agent coordination.',
    'Engineers & Developers',
    'INTERMEDIATE',
    'https://i.ytimg.com/vi/LSk5KaEGVK4/maxresdefault.jpg',
    12840, // 3h 34m
    214
  );

  // 2. Insert CourseSource
  db.prepare(`
    INSERT OR REPLACE INTO CourseSource (
      id, courseId, sourceType, sourceUrl, youtubeId, channelTitle
    ) VALUES (
      'src_krohn_1', ?, 'YOUTUBE_VIDEO', 'https://youtu.be/LSk5KaEGVK4?si=fmwdT28Br9SFmNZz', 'LSk5KaEGVK4', 'Jon Krohn'
    )
  `).run(courseId);

  // 3. Clear existing lessons/chapters for this course if any
  db.prepare("DELETE FROM LessonProgress WHERE lessonId LIKE 'lsn_krohn_%'").run();
  db.prepare("DELETE FROM QuizAttempt WHERE lessonId LIKE 'lsn_krohn_%'").run();
  db.prepare("DELETE FROM QuizOption WHERE questionId IN (SELECT id FROM QuizQuestion WHERE lessonId LIKE 'lsn_krohn_%')").run();
  db.prepare("DELETE FROM QuizQuestion WHERE lessonId LIKE 'lsn_krohn_%'").run();
  db.prepare("DELETE FROM StudyNote WHERE lessonId LIKE 'lsn_krohn_%'").run();
  db.prepare("DELETE FROM Lesson WHERE chapterId IN (SELECT id FROM Chapter WHERE courseId = ?)").run(courseId);
  db.prepare("DELETE FROM Chapter WHERE courseId = ?").run(courseId);

  // 4. Create Chapters
  const chapterStmt = db.prepare(`
    INSERT INTO Chapter (id, courseId, title, description, orderIndex, createdAt)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  chapterStmt.run('ch_krohn_1', courseId, 'Day 1 (6 lessons · 1h 42m Today)', 'Overview, model benchmarks, workflows vs agents, tool calling mechanics', 0);
  chapterStmt.run('ch_krohn_2', courseId, 'Day 2 (4 lessons · 1h 12m Tomorrow)', 'OpenAI Agents SDK, CrewAI orchestration, and Model Context Protocol', 1);
  chapterStmt.run('ch_krohn_3', courseId, 'Day 3 (3 lessons · 44m Wednesday)', 'Benchmarking, guardrails, security sandbox, and real-world deployment', 2);

  // 5. Create 13 Lessons across 3 Days matching Screenshot 5
  const lessons = [
    // Day 1: 6 lessons
    {
      id: 'lsn_krohn_1',
      chapterId: 'ch_krohn_1',
      title: 'Workshop Overview and Agent Definitions',
      durationSeconds: 1020, // 17m
      orderIndex: 0,
      summary: 'Understand the core definition of an AI agent, how it differs from traditional LLM chat, and workshop scope.'
    },
    {
      id: 'lsn_krohn_2',
      chapterId: 'ch_krohn_1',
      title: 'Business Case for Agentic AI and Model Benchmarks',
      durationSeconds: 960, // 16m
      orderIndex: 1,
      summary: 'Explore ROI metrics, commercial applications, and comparative benchmarks for top reasoning models.'
    },
    {
      id: 'lsn_krohn_3',
      chapterId: 'ch_krohn_1',
      title: 'Ten Reasons to Build Agents Now and Use Case Examples',
      durationSeconds: 960, // 16m
      orderIndex: 2,
      summary: 'Analyze high-leverage workflows ripe for agent automation across software engineering and research.'
    },
    {
      id: 'lsn_krohn_4',
      chapterId: 'ch_krohn_1',
      title: 'Workflows vs. Agents and Tool Calling Mechanics',
      durationSeconds: 1260, // 21m
      orderIndex: 3,
      summary: 'Deep dive into deterministic workflows versus autonomous reasoning loops, function calling schemas, and validation.'
    },
    {
      id: 'lsn_krohn_5',
      chapterId: 'ch_krohn_1',
      title: 'Agentic Frameworks Overview and Risks',
      durationSeconds: 1020, // 17m
      orderIndex: 4,
      summary: 'Survey landscape: LangChain, CrewAI, AutoGen, OpenAI Agents SDK, and evaluate loop hazards and hallucination risks.'
    },
    {
      id: 'lsn_krohn_6',
      chapterId: 'ch_krohn_1',
      title: 'Ed Donovan Introduction and OpenAI Agents SDK Philosophy',
      durationSeconds: 840, // 14m
      orderIndex: 5,
      summary: 'Guest speaker Ed Donovan breaks down minimal abstraction philosophy and lightweight state handling.'
    },
    // Day 2: 4 lessons
    {
      id: 'lsn_krohn_7',
      chapterId: 'ch_krohn_2',
      title: 'Building Single-Agent Workflows with OpenAI Agents SDK',
      durationSeconds: 1080, // 18m
      orderIndex: 6,
      summary: 'Implement your first single-agent pipeline with type-safe tool execution and streaming response handling.'
    },
    {
      id: 'lsn_krohn_8',
      chapterId: 'ch_krohn_2',
      title: 'Multi-Agent Orchestration with CrewAI',
      durationSeconds: 1200, // 20m
      orderIndex: 7,
      summary: 'Configure specialized roles, hierarchical management, shared task queues, and delegation patterns.'
    },
    {
      id: 'lsn_krohn_9',
      chapterId: 'ch_krohn_2',
      title: 'Model Context Protocol (MCP) Integration',
      durationSeconds: 1140, // 19m
      orderIndex: 8,
      summary: 'Connect standardized external data sources, SQLite servers, and filesystem MCP servers into agent runtime.'
    },
    {
      id: 'lsn_krohn_10',
      chapterId: 'ch_krohn_2',
      title: 'Custom Tools and Memory Persistence',
      durationSeconds: 900, // 15m
      orderIndex: 9,
      summary: 'Persist state across multi-turn sessions with vector stores, SQLite memory, and conversation summaries.'
    },
    // Day 3: 3 lessons
    {
      id: 'lsn_krohn_11',
      chapterId: 'ch_krohn_3',
      title: 'Evaluation and Benchmarking Agentic Workflows',
      durationSeconds: 960, // 16m
      orderIndex: 10,
      summary: 'Run synthetic evaluations, measure trajectory success rates, and compute tool invocation accuracy.'
    },
    {
      id: 'lsn_krohn_12',
      chapterId: 'ch_krohn_3',
      title: 'Production Security, Guardrails and Sandboxing',
      durationSeconds: 840, // 14m
      orderIndex: 11,
      summary: 'Enforce output guardrails, restrict container permissions, and mitigate prompt injection threats.'
    },
    {
      id: 'lsn_krohn_13',
      chapterId: 'ch_krohn_3',
      title: 'Future of Agentic AI & Project Deployment',
      durationSeconds: 840, // 14m
      orderIndex: 12,
      summary: 'Deploy your agentic stack to Docker / Cloud Run, monitor latencies, and wrap up project deliverables.'
    }
  ];

  const lessonStmt = db.prepare(`
    INSERT INTO Lesson (
      id, chapterId, orderIndex, title, description,
      youtubeVideoId, startSeconds, endSeconds, durationSeconds, summary, keyTakeaways, importantDefinitions, status, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, 'LSk5KaEGVK4', 0, ?, ?, ?, ?, ?, 'READY', datetime('now'), datetime('now')
    )
  `);

  for (const l of lessons) {
    lessonStmt.run(
      l.id,
      l.chapterId,
      l.orderIndex,
      l.title,
      l.summary,
      l.durationSeconds,
      l.durationSeconds,
      l.summary,
      JSON.stringify(["Understand architecture patterns", "Hands-on implementation", "Production checklist"]),
      JSON.stringify([{ term: "Agent", definition: "An autonomous entity powered by an LLM with memory and tools." }])
    );
  }

  // 6. Insert or update Roadmap "Become An Ai Engineer" with slug "become-an-ai-engineer-8q7c"
  const roadmapId = 'rdm_become_ai_engineer';
  const roadmapSlug = 'become-an-ai-engineer-8q7c';

  db.prepare(`
    INSERT OR REPLACE INTO Roadmap (
      id, creatorId, title, slug, description, badge, isPublic, enrollmentCount, createdAt, updatedAt
    ) VALUES (
      ?, ?, 'Become An Ai Engineer', ?, 'Curated learning journey', '🎯', 1, 1, datetime('now'), datetime('now')
    )
  `).run(roadmapId, userId, roadmapSlug);

  // Roadmap Stage 1
  const stageId = 'stg_become_ai_1';
  db.prepare(`
    INSERT OR REPLACE INTO RoadmapStage (
      id, roadmapId, stageIndex, title, description, createdAt
    ) VALUES (
      ?, ?, 0, 'Stage 1', '', datetime('now')
    )
  `).run(stageId, roadmapId);

  // Clear existing course links for this stage
  db.prepare("DELETE FROM RoadmapCourse WHERE roadmapStageId = ?").run(stageId);

  // Roadmap Course link
  db.prepare(`
    INSERT OR REPLACE INTO RoadmapCourse (
      id, roadmapStageId, courseId, orderIndex
    ) VALUES (
      'rc_become_ai_1', ?, ?, 0
    )
  `).run(stageId, courseId);

  // Roadmap Enrollment for admin
  db.prepare(`
    INSERT OR REPLACE INTO RoadmapEnrollment (
      id, userId, roadmapId, progressPercentage, enrolledAt
    ) VALUES (
      're_become_ai_admin', ?, ?, 0, datetime('now')
    )
  `).run(userId, roadmapId);

  console.log('✅ Successfully seeded Jon Krohn course and Become An Ai Engineer roadmap!');
} catch (err) {
  console.error('Error seeding Jon Krohn course:', err);
}
