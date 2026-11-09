const Database = require('better-sqlite3');
const db = new Database('dev.db');

const courseId = 'crs_mayank_python_ai';
const videoId = 'J9BI0jGOds8';
const title = 'Best Python + AI Full Course | Learn Python + AI, Build Projects & Land Your First Job';
const creator = 'Mayank Aggarwal';
const thumbnail = 'https://i.ytimg.com/vi/J9BI0jGOds8/maxresdefault.jpg';
const slug = 'best-python-ai-full-course-mayank-aggarwal';
const duration = 13500; // ~3h 45m

// 1. Check or insert Course
const existingCourse = db.prepare('SELECT id FROM Course WHERE id = ?').get(courseId);
if (!existingCourse) {
  const creatorId = db.prepare('SELECT id FROM User LIMIT 1').get()?.id || 'cmw7ty0nk0000ygu21ma73asd';
  db.prepare(`
    INSERT INTO Course (id, creatorId, title, slug, description, thumbnailUrl, totalDurationSeconds, difficulty, status, isPublic, enrollmentCount, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(
    courseId,
    creatorId,
    title,
    slug,
    'Learn Python and AI from scratch with Mayank Aggarwal. Master core syntax, data structures, OOP, NumPy, Pandas, and build real-world AI applications.',
    thumbnail,
    duration,
    'INTERMEDIATE',
    'READY',
    1,
    42
  );
  console.log('Inserted Mayank Aggarwal course');
} else {
  db.prepare(`
    UPDATE Course
    SET title = ?, slug = ?, thumbnailUrl = ?, totalDurationSeconds = ?
    WHERE id = ?
  `).run(title, slug, thumbnail, duration, courseId);
  console.log('Updated Mayank Aggarwal course');
}

// 2. Check or insert CourseSource
const existingSource = db.prepare('SELECT id FROM CourseSource WHERE courseId = ?').get(courseId);
if (!existingSource) {
  db.prepare(`
    INSERT INTO CourseSource (id, courseId, sourceType, sourceUrl, youtubeId, channelTitle)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'src_' + courseId,
    courseId,
    'YOUTUBE_VIDEO',
    'https://youtu.be/J9BI0jGOds8',
    videoId,
    creator
  );
  console.log('Inserted CourseSource for Mayank Aggarwal');
} else {
  db.prepare(`
    UPDATE CourseSource
    SET youtubeId = ?, channelTitle = ?, sourceUrl = ?
    WHERE courseId = ?
  `).run(videoId, creator, 'https://youtu.be/J9BI0jGOds8', courseId);
}

// Also check if any existing CourseSource has youtubeId = videoId
const srcByVideo = db.prepare('SELECT id, courseId FROM CourseSource WHERE youtubeId = ?').get(videoId);
console.log('Source by video:', srcByVideo);

// 3. Chapters & Lessons
const existingChapter = db.prepare('SELECT id FROM Chapter WHERE courseId = ?').get(courseId);
if (!existingChapter) {
  const chId = 'ch_mayank_1';
  db.prepare(`
    INSERT INTO Chapter (id, courseId, orderIndex, title, description, createdAt)
    VALUES (?, ?, 0, 'Stage 1: Python & AI Foundations', 'Core Python programming, data science libraries, and modern AI engineering.', CURRENT_TIMESTAMP)
  `).run(chId, courseId);

  const lessons = [
    { title: 'Python Fundamentals & Syntax', start: 0, end: 3600, dur: 3600 },
    { title: 'Data Structures, Functions & OOP', start: 3600, end: 7200, dur: 3600 },
    { title: 'NumPy, Pandas & Data Manipulation', start: 7200, end: 10800, dur: 3600 },
    { title: 'Building Real AI Projects & Deployment', start: 10800, end: 13500, dur: 2700 }
  ];

  lessons.forEach((lsn, idx) => {
    db.prepare(`
      INSERT INTO Lesson (id, chapterId, orderIndex, title, description, youtubeVideoId, startSeconds, endSeconds, durationSeconds, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'READY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      `lsn_mayank_${idx + 1}`,
      chId,
      idx,
      lsn.title,
      `Comprehensive hands-on lesson on ${lsn.title} with Mayank Aggarwal.`,
      videoId,
      lsn.start,
      lsn.end,
      lsn.dur
    );
  });
  console.log('Inserted 4 lessons for Mayank course');
}

// 4. Update the user roadmap: cmw97w67x00008wu2kc7z20ve ('becomr-an-ai-engineer-sap5s')
// Change title to "Become An Ai Engineer"
db.prepare(`UPDATE Roadmap SET title = 'Become An Ai Engineer' WHERE slug = 'becomr-an-ai-engineer-sap5s' OR id = 'cmw97w67x00008wu2kc7z20ve'`).run();

// Change Stage 1 title to "Stage 1"
db.prepare(`UPDATE RoadmapStage SET title = 'Stage 1' WHERE roadmapId = 'cmw97w67x00008wu2kc7z20ve'`).run();

// Update RoadmapCourse to point to Mayank Aggarwal's course
const stage = db.prepare(`SELECT id FROM RoadmapStage WHERE roadmapId = 'cmw97w67x00008wu2kc7z20ve' LIMIT 1`).get();
if (stage) {
  db.prepare(`DELETE FROM RoadmapCourse WHERE roadmapStageId = ?`).run(stage.id);
  db.prepare(`
    INSERT INTO RoadmapCourse (id, roadmapStageId, courseId, orderIndex)
    VALUES ('rc_mayank_user_1', ?, ?, 0)
  `).run(stage.id, courseId);
  console.log('Linked Mayank Aggarwal course to Stage 1 of user roadmap');
}

console.log('Database updated successfully.');
