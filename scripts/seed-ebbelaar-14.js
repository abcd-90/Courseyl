const Database = require('better-sqlite3');
const db = new Database('./dev.db');

const courseId = 'crs_jhiu0gwjmw91bzjv';
const courseSlug = 'full-stack-ai-engineering-course';

// Delete existing chapters and lessons for this course
const oldChaps = db.prepare('SELECT id FROM Chapter WHERE courseId = ?').all(courseId);
for (const ch of oldChaps) {
  db.prepare('DELETE FROM Lesson WHERE chapterId = ?').run(ch.id);
}
db.prepare('DELETE FROM Chapter WHERE courseId = ?').run(courseId);

// Update course title and details
db.prepare(`
  UPDATE Course SET 
    title = 'Full-Stack AI Engineering Course (FastAPI, LLMs, Docker, Supabase)',
    description = 'Build and deploy a full-stack AI customer support system with FastAPI, Supabase, LLMs, Docker, and React.',
    thumbnailUrl = 'https://i.ytimg.com/vi/XzjSx7u9mGw/maxresdefault.jpg',
    totalDurationSeconds = 11400,
    estimatedStudyMinutes = 190
  WHERE id = ?
`).run(courseId);

const now = new Date().toISOString();

// Insert Day 1 and Day 2
const day1Id = 'chp_ebb_day1';
const day2Id = 'chp_ebb_day2';

db.prepare('INSERT INTO Chapter (id, courseId, orderIndex, title, description, createdAt) VALUES (?, ?, 1, ?, ?, ?)').run(
  day1Id, courseId, 'Day 1', 'Full-Stack AI Architecture & Backend Core', now
);
db.prepare('INSERT INTO Chapter (id, courseId, orderIndex, title, description, createdAt) VALUES (?, ?, 2, ?, ?, ?)').run(
  day2Id, courseId, 'Day 2', 'Docker, React Dashboard & Production Deployment', now
);

const day1Lessons = [
  {
    id: 'lsn_ebb_1',
    title: 'Course Introduction & Project Overview',
    duration: 417,
    durationText: '7m',
    desc: '7m · Understand the full-stack AI customer support system architecture and the end-to-end project scope covering Gmail, FastAPI, Supabase, LLMs, Docker, and a React admin dashboard.',
    start: 0,
    end: 417
  },
  {
    id: 'lsn_ebb_2',
    title: 'Project Setup: Python, UV, FastAPI, and Configuration',
    duration: 840,
    durationText: '14m',
    desc: '14m · Set up the development environment using UV package manager, install FastAPI dependencies, configure environment variables, and verify local server startup.',
    start: 418,
    end: 1258
  },
  {
    id: 'lsn_ebb_3',
    title: 'Gmail API Access: Google Cloud Console, OAuth, and Credentials',
    duration: 1080,
    durationText: '18m',
    desc: '18m · Configure Google Cloud project, enable Gmail API, configure OAuth 2.0 consent screens, and authenticate local scripts to access user inboxes.',
    start: 1259,
    end: 2339
  },
  {
    id: 'lsn_ebb_4',
    title: 'Building Email Webhooks & Polling Service',
    duration: 900,
    durationText: '15m',
    desc: '15m · Implement asynchronous Gmail message polling, extract email body, subject, sender, and thread metadata with error handling.',
    start: 2340,
    end: 3240
  },
  {
    id: 'lsn_ebb_5',
    title: 'FastAPI Core Endpoints & Pydantic Schemas',
    duration: 720,
    durationText: '12m',
    desc: '12m · Author FastAPI REST endpoints for message intake, thread tracking, and agent status with strict Pydantic v2 schemas.',
    start: 3241,
    end: 3960
  },
  {
    id: 'lsn_ebb_6',
    title: 'Supabase Postgres Setup & pgvector Schema',
    duration: 840,
    durationText: '14m',
    desc: '14m · Create Supabase database tables, enable pgvector extension, create vector indexes, and run migrations for knowledge embeddings.',
    start: 3961,
    end: 4800
  },
  {
    id: 'lsn_ebb_7',
    title: 'Building LLM Agent with LangChain & LangGraph',
    duration: 960,
    durationText: '16m',
    desc: '16m · Implement autonomous triage agent graph with state transitions, tool calling, and RAG retrieval over past customer tickets.',
    start: 4801,
    end: 5760
  },
  {
    id: 'lsn_ebb_8',
    title: 'Testing Customer Support Workflow End-to-End',
    duration: 660,
    durationText: '11m',
    desc: '11m · Send live test inquiries, monitor LLM reasoning traces, verify draft response generation, and assert ticket status updates.',
    start: 5761,
    end: 6420
  }
];

const day2Lessons = [
  {
    id: 'lsn_ebb_9',
    title: 'Dockerizing FastAPI, Worker & Redis',
    duration: 720,
    durationText: '12m',
    desc: '12m · Write multi-stage Dockerfiles for the FastAPI API server and background Celery worker tasks.',
    start: 6421,
    end: 7140
  },
  {
    id: 'lsn_ebb_10',
    title: 'Docker Compose Multi-Container Architecture',
    duration: 900,
    durationText: '15m',
    desc: '15m · Orchestrate API, worker, Redis cache, and Postgres mock instances using docker-compose.yml.',
    start: 7141,
    end: 8040
  },
  {
    id: 'lsn_ebb_11',
    title: 'React Admin Dashboard Overview & Setup',
    duration: 960,
    durationText: '16m',
    desc: '16m · Scaffold modern React dashboard with Tailwind CSS to visualize customer tickets, AI drafts, and sentiment stats.',
    start: 8041,
    end: 9000
  },
  {
    id: 'lsn_ebb_12',
    title: 'Connecting Dashboard to FastAPI WebSocket Stream',
    duration: 840,
    durationText: '14m',
    desc: '14m · Stream live incoming emails and AI agent generation chunks directly into the React UI with real-time WebSockets.',
    start: 9001,
    end: 9840
  },
  {
    id: 'lsn_ebb_13',
    title: 'Production Deployment to Railway & Supabase Cloud',
    duration: 1080,
    durationText: '18m',
    desc: '18m · Deploy backend containers to Railway, connect managed Supabase secrets, and configure custom domain SSL.',
    start: 9841,
    end: 10920
  },
  {
    id: 'lsn_ebb_14',
    title: 'Evaluation, Monitoring & Guardrails',
    duration: 600,
    durationText: '10m',
    desc: '10m · Implement response guardrails, toxicity filters, hallucination evaluators, and CloudWatch telemetry metrics.',
    start: 10921,
    end: 11520
  }
];

const insertLsn = db.prepare(`
  INSERT INTO Lesson (id, chapterId, orderIndex, title, description, youtubeVideoId, startSeconds, endSeconds, durationSeconds, summary, status, createdAt, updatedAt)
  VALUES (@id, @chapterId, @orderIndex, @title, @description, 'XzjSx7u9mGw', @startSeconds, @endSeconds, @durationSeconds, @summary, 'READY', @now, @now)
`);

day1Lessons.forEach((l, idx) => {
  insertLsn.run({
    id: l.id,
    chapterId: day1Id,
    orderIndex: idx + 1,
    title: l.title,
    description: l.desc,
    startSeconds: l.start,
    endSeconds: l.end,
    durationSeconds: l.duration,
    summary: l.desc,
    now
  });
});

day2Lessons.forEach((l, idx) => {
  insertLsn.run({
    id: l.id,
    chapterId: day2Id,
    orderIndex: idx + 1,
    title: l.title,
    description: l.desc,
    startSeconds: l.start,
    endSeconds: l.end,
    durationSeconds: l.duration,
    summary: l.desc,
    now
  });
});

// Seed sample Quiz for Lesson 1
const insertQuizQ = db.prepare(`
  INSERT INTO QuizQuestion (id, lessonId, orderIndex, questionText, correctOptionIndex, explanation, replayTimestampSeconds, createdAt)
  VALUES (@id, @lessonId, @orderIndex, @questionText, @correctOptionIndex, @explanation, @replayTimestampSeconds, @now)
`);
const insertQuizOpt = db.prepare(`
  INSERT INTO QuizOption (id, questionId, optionIndex, optionText)
  VALUES (@id, @questionId, @optionIndex, @optionText)
`);

const q1 = 'qz_ebb_1';
insertQuizQ.run({
  id: q1,
  lessonId: 'lsn_ebb_1',
  orderIndex: 1,
  questionText: 'What is the primary role of FastAPI in this full-stack AI system?',
  correctOptionIndex: 1,
  explanation: 'FastAPI acts as the high-performance async API backend orchestrating LLM calls, webhooks, and Supabase database records.',
  replayTimestampSeconds: 120,
  now
});
insertQuizOpt.run({ id: 'opt_1_1', questionId: q1, optionIndex: 0, optionText: 'Frontend UI rendering' });
insertQuizOpt.run({ id: 'opt_1_2', questionId: q1, optionIndex: 1, optionText: 'High-performance async API server orchestrating AI workflows' });
insertQuizOpt.run({ id: 'opt_1_3', questionId: q1, optionIndex: 2, optionText: 'Only email storage' });

const q2 = 'qz_ebb_2';
insertQuizQ.run({
  id: q2,
  lessonId: 'lsn_ebb_1',
  orderIndex: 2,
  questionText: 'Which database and extension are utilized for storing embeddings and customer tickets?',
  correctOptionIndex: 0,
  explanation: 'Supabase with PostgreSQL and the pgvector extension is used for storing ticket vectors and knowledge retrieval.',
  replayTimestampSeconds: 240,
  now
});
insertQuizOpt.run({ id: 'opt_2_1', questionId: q2, optionIndex: 0, optionText: 'Supabase PostgreSQL with pgvector extension' });
insertQuizOpt.run({ id: 'opt_2_2', questionId: q2, optionIndex: 1, optionText: 'Local text files' });
insertQuizOpt.run({ id: 'opt_2_3', questionId: q2, optionIndex: 2, optionText: 'SQLite in-memory only' });

// Enroll user in full-stack AI course
const adminUser = db.prepare("SELECT id FROM User WHERE email = 'admin@courseit.xyz'").get();
const learnerUser = db.prepare("SELECT id FROM User WHERE email = 'learner@courseit.xyz'").get();
const userIds = [adminUser?.id, learnerUser?.id].filter(Boolean);

for (const uId of userIds) {
  const existing = db.prepare("SELECT id FROM Enrollment WHERE userId = ? AND courseId = ?").get(uId, courseId);
  if (!existing) {
    db.prepare(`
      INSERT INTO Enrollment (id, userId, courseId, progressPercentage, completedLessonsCount, enrolledAt, lastAccessedAt)
      VALUES (?, ?, ?, 0, 0, ?, ?)
    `).run('enr_ebb_' + uId, uId, courseId, now, now);
  }
}

console.log('Seeded Dave Ebbelaar 14 lessons, quiz, and enrollments!');

