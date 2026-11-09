const Database = require('better-sqlite3');
const db = new Database('./dev.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

const TOTAL_DURATION = 46899; // 13h 1m 39s
const VIDEO_ID = 'J9BI0jGOds8';
const CHANNEL_TITLE = 'Mayank Aggarwal';
const COURSE_TITLE = 'Best Python + AI Full Course | Learn Python + AI, Build Projects & Land Your First Job';
const COURSE_SLUG = 'best-python-ai-full-course-mayank-aggarwal';
const THUMBNAIL_URL = 'https://i.ytimg.com/vi/J9BI0jGOds8/maxresdefault.jpg';
const COURSE_ID = 'crs_mayank_python_ai';

// Raw 96 chapters extracted from YouTube video
const RAW_CHAPTERS = [
  { start: 0, title: "Intro: Master Python + AI" },
  { start: 158, title: "Why Do We Need Programming?" },
  { start: 405, title: "What Is Python & Where It's Used" },
  { start: 670, title: "Key Features of Python" },
  { start: 862, title: "Installing Python" },
  { start: 978, title: "Running Python in Terminal & IDLE" },
  { start: 1231, title: "Anaconda & Jupyter Notebook Setup" },
  { start: 1758, title: "Builtin Functions & print()" },
  { start: 2142, title: "Python Modules (math, import)" },
  { start: 2300, title: "Errors: Syntax vs Runtime" },
  { start: 2639, title: "Identifiers & Naming Rules" },
  { start: 3117, title: "Data Types & Integers" },
  { start: 3614, title: "Float Data Type" },
  { start: 3793, title: "Complex Numbers" },
  { start: 3980, title: "Boolean Data Type" },
  { start: 4348, title: "Strings Basics" },
  { start: 4744, title: "String Indexing" },
  { start: 5015, title: "Negative Indexing" },
  { start: 5255, title: "String Concatenation & Repetition" },
  { start: 5620, title: "String Slicing" },
  { start: 6614, title: "Slicing with Step Value" },
  { start: 7273, title: "Type Conversion: Implicit" },
  { start: 7632, title: "Explicit Type Casting" },
  { start: 8150, title: "Operators in Python: Overview" },
  { start: 8279, title: "Arithmetic Operators" },
  { start: 8768, title: "Relational Operators" },
  { start: 9826, title: "Logical Operators" },
  { start: 10383, title: "Assignment Operators" },
  { start: 10691, title: "Identity Operators (is vs ==)" },
  { start: 11168, title: "Operator Precedence & Associativity" },
  { start: 11626, title: "String Formatting" },
  { start: 12307, title: "Python fStrings" },
  { start: 12523, title: "Decision Control & if Statement" },
  { start: 13277, title: "ifelse Statement" },
  { start: 13623, title: "elif Ladder" },
  { start: 14184, title: "Nested if Statements" },
  { start: 14658, title: "Conditionals: Practice Questions" },
  { start: 15590, title: "while Loop" },
  { start: 16249, title: "break Statement" },
  { start: 16672, title: "continue Statement" },
  { start: 17136, title: "pass Statement" },
  { start: 17316, title: "for Loop" },
  { start: 18029, title: "range() Function" },
  { start: 18908, title: "for Loop with range()" },
  { start: 19255, title: "Nested Loops" },
  { start: 20036, title: "Intro to Data Structures" },
  { start: 20617, title: "Lists in Python" },
  { start: 21264, title: "List Operations" },
  { start: 21709, title: "Builtin List Functions" },
  { start: 22475, title: "List Methods" },
  { start: 23300, title: "Copying Lists" },
  { start: 23618, title: "List Comprehension" },
  { start: 24522, title: "Tuples" },
  { start: 26281, title: "Sets" },
  { start: 26897, title: "Set Operations" },
  { start: 28138, title: "Dictionaries" },
  { start: 28964, title: "Dictionary Operations & Methods" },
  { start: 29970, title: "Strings Revisited: ord() & chr()" },
  { start: 30401, title: "String Methods" },
  { start: 31296, title: "Defining Your Own Function" },
  { start: 31681, title: "Return vs Void Functions" },
  { start: 32372, title: "Functions: Core Concepts" },
  { start: 33011, title: "Positional Arguments" },
  { start: 33212, title: "Default Arguments" },
  { start: 34131, title: "VariableLength Arguments (*args)" },
  { start: 34385, title: "Keyword Arguments (**kwargs)" },
  { start: 34820, title: "Variable Scope: Local vs Global" },
  { start: 35768, title: "Functions as FirstClass Citizens" },
  { start: 37324, title: "Lambda Functions" },
  { start: 37958, title: "map() Function" },
  { start: 38227, title: "filter() Function" },
  { start: 38586, title: "reduce() Function" },
  { start: 38868, title: "Python WrapUp & AI Section Intro" },
  { start: 39128, title: "Large Language Models (LLMs)" },
  { start: 39487, title: "Prompting" },
  { start: 39717, title: "Temperature" },
  { start: 40063, title: "AI Hallucination" },
  { start: 40339, title: "Context Engineering" },
  { start: 40642, title: "Tokens & Token Costs" },
  { start: 41182, title: "Vectors & Embeddings" },
  { start: 41497, title: "Context Window" },
  { start: 41989, title: "Model Parameters" },
  { start: 42416, title: "Attention Mechanism" },
  { start: 42766, title: "Transformers" },
  { start: 43477, title: "How LLMs Learn: Pretraining" },
  { start: 43690, title: "FineTuning" },
  { start: 43891, title: "RLHF" },
  { start: 44168, title: "RAG (RetrievalAugmented Generation)" },
  { start: 44807, title: "MCP (Model Context Protocol)" },
  { start: 45527, title: "AI Agents" },
  { start: 45949, title: "Multimodal AI" },
  { start: 46095, title: "Reasoning Models" },
  { start: 46327, title: "Small Language Models" },
  { start: 46450, title: "AGI vs ASI" },
  { start: 46607, title: "Recap: How It All Connects" },
  { start: 46743, title: "Final Thoughts" },
];

// Compute end and duration for each lesson
const lessonsWithDuration = RAW_CHAPTERS.map((ch, idx) => {
  const next = RAW_CHAPTERS[idx + 1];
  const end = next ? next.start : TOTAL_DURATION;
  return {
    title: ch.title,
    startSeconds: ch.start,
    endSeconds: end,
    durationSeconds: Math.max(10, end - ch.start),
  };
});

// Group into 7 Days:
// Day 1: 0 to 20 (up to 7273s - 2h 1m)
// Day 2: 21 to 32 (up to 12523s - 1h 27m)
// Day 3: 33 to 45 (up to 20036s - 2h 5m)
// Day 4: 46 to 53 (up to 26281s - 1h 44m)
// Day 5: 54 to 59 (up to 31296s - 1h 23m)
// Day 6: 60 to 72 (up to 39128s - 2h 10m)
// Day 7: 73 to 95 (up to 46899s - 2h 9m)
const DAY_DEFINITIONS = [
  {
    title: "Day 1 (Core Fundamentals & Setup)",
    description: "Python origin, execution model, variables, basic types, and string basics.",
    startIdx: 0,
    endIdx: 20,
  },
  {
    title: "Day 2 (Strings & Type Conversions)",
    description: "Slicing, explicit casting, arithmetic and relational operators.",
    startIdx: 21,
    endIdx: 32,
  },
  {
    title: "Day 3 (Operators & Control Flow)",
    description: "Conditionals, while loops, for loops, and range iterations.",
    startIdx: 33,
    endIdx: 45,
  },
  {
    title: "Day 4 (Lists & Tuples)",
    description: "List manipulations, comprehensions, and immutable tuple structures.",
    startIdx: 46,
    endIdx: 53,
  },
  {
    title: "Day 5 (Sets & Dictionaries)",
    description: "Hashing, unique sets, key-value mappings, and dictionary methods.",
    startIdx: 54,
    endIdx: 59,
  },
  {
    title: "Day 6 (Functions & Advanced Logic)",
    description: "Functions, arguments (*args, **kwargs), scopes, lambdas, map, filter, and reduce.",
    startIdx: 60,
    endIdx: 72,
  },
  {
    title: "Day 7 (AI, LLMs, RAG, MCP & Agents)",
    description: "LLMs, Prompt Engineering, Embeddings, Transformers, Fine-tuning, RAG, MCP, and Autonomous Agents.",
    startIdx: 73,
    endIdx: 95,
  },
];

console.log(`Starting database seed for Mayank Aggarwal 13h course (${lessonsWithDuration.length} lessons across ${DAY_DEFINITIONS.length} days)...`);

// 1. Ensure user exists (e.g. admin or creator)
const user = db.prepare("SELECT id FROM User LIMIT 1").get();
const creatorId = user ? user.id : 'usr_default';

// 2. Upsert Course
const existingCourse = db.prepare("SELECT id FROM Course WHERE id = ?").get(COURSE_ID);
if (existingCourse) {
  db.prepare(`
    UPDATE Course 
    SET title = ?, slug = ?, description = ?, thumbnailUrl = ?, totalDurationSeconds = ?, estimatedStudyMinutes = ?, status = 'READY', isPublic = 1
    WHERE id = ?
  `).run(
    COURSE_TITLE,
    COURSE_SLUG,
    "Master Python programming and Modern AI Engineering from scratch with Mayank Aggarwal. 13+ hours comprehensive 7-day masterclass covering core Python, data structures, OOP, LLMs, RAG, MCP, and AI Agents.",
    THUMBNAIL_URL,
    TOTAL_DURATION,
    1172,
    COURSE_ID
  );
} else {
  db.prepare(`
    INSERT INTO Course (id, creatorId, title, slug, description, targetAudience, difficulty, thumbnailUrl, totalDurationSeconds, estimatedStudyMinutes, status, isPublic, enrollmentCount, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'READY', 1, 1, datetime('now'), datetime('now'))
  `).run(
    COURSE_ID,
    creatorId,
    COURSE_TITLE,
    COURSE_SLUG,
    "Master Python programming and Modern AI Engineering from scratch with Mayank Aggarwal. 13+ hours comprehensive 7-day masterclass covering core Python, data structures, OOP, LLMs, RAG, MCP, and AI Agents.",
    "Developers, students, and engineers looking to build real-world AI applications.",
    "INTERMEDIATE",
    THUMBNAIL_URL,
    TOTAL_DURATION,
    1172
  );
}

// 3. Upsert CourseSource
const existingSource = db.prepare("SELECT id FROM CourseSource WHERE courseId = ?").get(COURSE_ID);
if (existingSource) {
  db.prepare(`
    UPDATE CourseSource 
    SET sourceType = 'YOUTUBE_VIDEO', sourceUrl = ?, youtubeId = ?, channelTitle = ?
    WHERE courseId = ?
  `).run(`https://youtu.be/${VIDEO_ID}`, VIDEO_ID, CHANNEL_TITLE, COURSE_ID);
} else {
  db.prepare(`
    INSERT INTO CourseSource (id, courseId, sourceType, sourceUrl, youtubeId, channelTitle)
    VALUES (?, ?, 'YOUTUBE_VIDEO', ?, ?, ?)
  `).run(`csrc_${COURSE_ID}`, COURSE_ID, `https://youtu.be/${VIDEO_ID}`, VIDEO_ID, CHANNEL_TITLE);
}

// 4. Clean up old chapters, lessons, quiz questions for this course
const existingChapters = db.prepare("SELECT id FROM Chapter WHERE courseId = ?").all(COURSE_ID);
for (const chap of existingChapters) {
  const existingLessons = db.prepare("SELECT id FROM Lesson WHERE chapterId = ?").all(chap.id);
  for (const les of existingLessons) {
    const existingQuizzes = db.prepare("SELECT id FROM QuizQuestion WHERE lessonId = ?").all(les.id);
    for (const q of existingQuizzes) {
      db.prepare("DELETE FROM QuizOption WHERE questionId = ?").run(q.id);
    }
    db.prepare("DELETE FROM QuizQuestion WHERE lessonId = ?").run(les.id);
    db.prepare("DELETE FROM LessonProgress WHERE lessonId = ?").run(les.id);
    db.prepare("DELETE FROM StudyNote WHERE lessonId = ?").run(les.id);
  }
  db.prepare("DELETE FROM Lesson WHERE chapterId = ?").run(chap.id);
}
db.prepare("DELETE FROM Chapter WHERE courseId = ?").run(COURSE_ID);

// 5. Insert 7 Chapters & 96 Lessons
DAY_DEFINITIONS.forEach((dayDef, dayIdx) => {
  const chapterId = `ch_mayank_day_${dayIdx + 1}`;
  db.prepare(`
    INSERT INTO Chapter (id, courseId, orderIndex, title, description, createdAt)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(chapterId, COURSE_ID, dayIdx, dayDef.title, dayDef.description);

  const dayLessons = lessonsWithDuration.slice(dayDef.startIdx, dayDef.endIdx + 1);

  dayLessons.forEach((l, lIdx) => {
    const lessonId = `les_mayank_${dayIdx + 1}_${lIdx + 1}`;
    const midPoint = Math.floor((l.startSeconds + l.endSeconds) / 2);

    const keyTakeaways = JSON.stringify([
      `Mastering ${l.title}`,
      `Practical code patterns and implementation tips`,
      `Common pitfalls and debugging techniques`,
    ]);

    const importantDefinitions = JSON.stringify([
      `${l.title}: Key subject matter covered in this segment of the full masterclass.`,
      `Standard Practice: Writing maintainable, readable code according to Python best practices.`,
    ]);

    db.prepare(`
      INSERT INTO Lesson (id, chapterId, orderIndex, title, description, youtubeVideoId, startSeconds, endSeconds, durationSeconds, summary, keyTakeaways, importantDefinitions, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'READY', datetime('now'), datetime('now'))
    `).run(
      lessonId,
      chapterId,
      lIdx,
      l.title,
      `Step-by-step masterclass instruction covering ${l.title} with Mayank Aggarwal.`,
      VIDEO_ID,
      l.startSeconds,
      l.endSeconds,
      l.durationSeconds,
      `In this lesson, Mayank Aggarwal explains the principles, internal execution, and coding workflows for ${l.title}.`,
      keyTakeaways,
      importantDefinitions
    );

    // Add 2 interactive quiz questions
    const q1Id = `q_${lessonId}_1`;
    db.prepare(`
      INSERT INTO QuizQuestion (id, lessonId, orderIndex, questionText, correctOptionIndex, explanation, replayTimestampSeconds)
      VALUES (?, ?, 0, ?, 0, ?, ?)
    `).run(
      q1Id,
      lessonId,
      `What is the primary concept covered in "${l.title}"?`,
      `The lesson explains the underlying mechanics and standard application of ${l.title}.`,
      Math.floor(l.startSeconds + (l.endSeconds - l.startSeconds) * 0.2)
    );

    db.prepare(`INSERT INTO QuizOption (id, questionId, optionIndex, optionText) VALUES (?, ?, 0, ?)`).run(`opt_${q1Id}_0`, q1Id, `Mastering the proper syntax, design, and practical use of ${l.title}`);
    db.prepare(`INSERT INTO QuizOption (id, questionId, optionIndex, optionText) VALUES (?, ?, 1, ?)`).run(`opt_${q1Id}_1`, q1Id, `Skipping variables and writing everything in a single unformatted line`);
    db.prepare(`INSERT INTO QuizOption (id, questionId, optionIndex, optionText) VALUES (?, ?, 2, ?)`).run(`opt_${q1Id}_2`, q1Id, `Ignoring error messages and execution traces`);
    db.prepare(`INSERT INTO QuizOption (id, questionId, optionIndex, optionText) VALUES (?, ?, 3, ?)`).run(`opt_${q1Id}_3`, q1Id, `Deprecated patterns not supported in modern Python`);

    const q2Id = `q_${lessonId}_2`;
    db.prepare(`
      INSERT INTO QuizQuestion (id, lessonId, orderIndex, questionText, correctOptionIndex, explanation, replayTimestampSeconds)
      VALUES (?, ?, 1, ?, 0, ?, ?)
    `).run(
      q2Id,
      lessonId,
      `Which approach is considered best practice when developing with ${l.title}?`,
      `Following idiomatic Python patterns ensures code clarity and maintainability.`,
      midPoint
    );

    db.prepare(`INSERT INTO QuizOption (id, questionId, optionIndex, optionText) VALUES (?, ?, 0, ?)`).run(`opt_${q2Id}_0`, q2Id, `Writing clean, modular code with descriptive identifiers`);
    db.prepare(`INSERT INTO QuizOption (id, questionId, optionIndex, optionText) VALUES (?, ?, 1, ?)`).run(`opt_${q2Id}_1`, q2Id, `Using random one-letter names for all variables and functions`);
    db.prepare(`INSERT INTO QuizOption (id, questionId, optionIndex, optionText) VALUES (?, ?, 2, ?)`).run(`opt_${q2Id}_2`, q2Id, `Hardcoding credentials and database tokens directly into source`);
    db.prepare(`INSERT INTO QuizOption (id, questionId, optionIndex, optionText) VALUES (?, ?, 3, ?)`).run(`opt_${q2Id}_3`, q2Id, `Suppressing all exceptions without handling them`);
  });
});

console.log('Seeded all 7 Chapters and 96 Lessons with quizzes successfully!');

// 6. Link this course to roadmap `cmw97w67x00008wu2kc7z20ve` ("Become An AI Engineer")
const targetRoadmapId = 'cmw97w67x00008wu2kc7z20ve';
const rdm = db.prepare("SELECT * FROM Roadmap WHERE id = ?").get(targetRoadmapId);
if (rdm) {
  // Ensure stage exists
  let stage = db.prepare("SELECT id FROM RoadmapStage WHERE roadmapId = ? ORDER BY stageIndex ASC LIMIT 1").get(targetRoadmapId);
  if (!stage) {
    const newStageId = `stg_become_ai_${Date.now()}`;
    db.prepare(`
      INSERT INTO RoadmapStage (id, roadmapId, stageIndex, title, description, createdAt)
      VALUES (?, ?, 0, 'Foundations & Prerequisite', 'Core Python programming and Modern AI Engineering foundation.', datetime('now'))
    `).run(newStageId, targetRoadmapId);
    stage = { id: newStageId };
  } else {
    db.prepare("UPDATE RoadmapStage SET title = 'Foundations & Prerequisite' WHERE id = ?").run(stage.id);
  }

  // Ensure RoadmapCourse links to crs_mayank_python_ai
  db.prepare("DELETE FROM RoadmapCourse WHERE roadmapStageId = ?").run(stage.id);
  db.prepare(`
    INSERT INTO RoadmapCourse (id, roadmapStageId, courseId, orderIndex)
    VALUES (?, ?, ?, 0)
  `).run(`rc_mayank_${Date.now()}`, stage.id, COURSE_ID);

  console.log(`Linked course to roadmap ${rdm.slug} (${targetRoadmapId}) in stage ${stage.id}.`);
}

// 7. Also link to `cmw99mqna0002kcu2811dysio` ("Pythin + Ai")
const rdm2 = db.prepare("SELECT * FROM Roadmap WHERE id = 'cmw99mqna0002kcu2811dysio'").get();
if (rdm2) {
  let stage2 = db.prepare("SELECT id FROM RoadmapStage WHERE roadmapId = 'cmw99mqna0002kcu2811dysio' ORDER BY stageIndex ASC LIMIT 1").get();
  if (!stage2) {
    const sId = 'stg_pythin_ai_1';
    db.prepare(`
      INSERT INTO RoadmapStage (id, roadmapId, stageIndex, title, description, createdAt)
      VALUES (?, 'cmw99mqna0002kcu2811dysio', 0, 'Python & AI Masterclass', 'Comprehensive 13-hour learning path.', datetime('now'))
    `).run(sId);
    stage2 = { id: sId };
  }
  db.prepare("DELETE FROM RoadmapCourse WHERE roadmapStageId = ?").run(stage2.id);
  db.prepare(`
    INSERT INTO RoadmapCourse (id, roadmapStageId, courseId, orderIndex)
    VALUES (?, ?, ?, 0)
  `).run(`rc_pythin_${Date.now()}`, stage2.id, COURSE_ID);
}

// 8. Auto-enroll user in course
const firstUser = db.prepare("SELECT id FROM User LIMIT 1").get();
if (firstUser) {
  const existingEnroll = db.prepare("SELECT id FROM Enrollment WHERE userId = ? AND courseId = ?").get(firstUser.id, COURSE_ID);
  if (!existingEnroll) {
    db.prepare(`
      INSERT INTO Enrollment (id, userId, courseId, progressPercentage, enrolledAt, lastAccessedAt)
      VALUES (?, ?, ?, 0, datetime('now'), datetime('now'))
    `).run(`enr_mayank_${firstUser.id}`, firstUser.id, COURSE_ID);
  }
}

console.log('Database verification:');
const checkCourse = db.prepare("SELECT c.id, c.title, c.totalDurationSeconds, cs.channelTitle, (SELECT COUNT(*) FROM Chapter WHERE courseId = c.id) as chCount, (SELECT COUNT(*) FROM Lesson l JOIN Chapter ch ON l.chapterId = ch.id WHERE ch.courseId = c.id) as lesCount FROM Course c LEFT JOIN CourseSource cs ON c.id = cs.courseId WHERE c.id = ?").get(COURSE_ID);
console.log(checkCourse);
