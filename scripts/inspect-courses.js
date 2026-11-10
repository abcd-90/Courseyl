require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const coursesRes = await client.query(`
    SELECT c.id, c.title, c.slug, c."thumbnailUrl", COUNT(l.id) as lessons
    FROM "Course" c
    LEFT JOIN "Chapter" ch ON ch."courseId" = c.id
    LEFT JOIN "Lesson" l ON l."chapterId" = ch.id
    GROUP BY c.id, c.title, c.slug, c."thumbnailUrl"
  `);
  console.log("ALL COURSES IN DB:");
  console.log(coursesRes.rows);

  const enrollmentsRes = await client.query(`
    SELECT e."userId", u.email, e."courseId", c.title, c.slug, COUNT(l.id) as lessons
    FROM "Enrollment" e
    JOIN "User" u ON u.id = e."userId"
    JOIN "Course" c ON c.id = e."courseId"
    LEFT JOIN "Chapter" ch ON ch."courseId" = c.id
    LEFT JOIN "Lesson" l ON l."chapterId" = ch.id
    GROUP BY e."userId", u.email, e."courseId", c.title, c.slug
  `);
  console.log("\nALL ENROLLMENTS IN DB:");
  console.log(enrollmentsRes.rows);

  const lessonsRes = await client.query(`
    SELECT l.id, l.title, l."startSeconds", l."endSeconds", l."durationSeconds"
    FROM "Lesson" l
    ORDER BY l."startSeconds" ASC
    LIMIT 6
  `);
  console.log("\nSAMPLE LESSONS IN DB:");
  console.log(lessonsRes.rows);

  await client.end();
}

main().catch(console.error);

