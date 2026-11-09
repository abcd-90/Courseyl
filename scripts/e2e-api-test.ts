import assert from "node:assert";

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== COURSEIT COMPLETE END-TO-END VERIFICATION ===");

  // 1. Authenticate as Learner
  console.log("\n[1/10] Authenticating Learner (learner@courseit.xyz)...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "learner@courseit.xyz",
      password: "password123",
    }),
  });
  assert.strictEqual(loginRes.status, 200, "Learner login should succeed");
  const loginCookie = loginRes.headers.get("set-cookie") || "";
  const learnerData = await loginRes.json();
  console.log(`✓ Logged in as: ${learnerData.user.profile?.displayName || "Learner"} (${learnerData.user.email})`);

  // 2. Fetch User Profile and Verify Streak & Plan
  console.log("\n[2/10] Verifying Profile & Learning Streak...");
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: loginCookie },
  });
  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  console.log(`✓ Streak: ${meData.user.profile?.currentStreakDays || 0} days, Daily Goal: ${meData.user.profile?.dailyStudyMinutes || 60} min, Plan: ${meData.user.subscription?.tier || "FREE"}`);

  // 3. Explore Courses Catalog
  console.log("\n[3/10] Querying Public Course Catalog...");
  const coursesRes = await fetch(`${BASE_URL}/api/courses`);
  assert.strictEqual(coursesRes.status, 200);
  const coursesData = await coursesRes.json();
  console.log(`✓ Retrieved ${coursesData.courses.length} courses from database`);
  const pythonCourse = coursesData.courses.find((c: any) => c.slug.includes("python"));
  assert.ok(pythonCourse, "Python course must exist");
  console.log(`✓ Target Course: "${pythonCourse.title}" (${pythonCourse.lessonsCount} lessons)`);

  // 4. Enroll in Course
  console.log("\n[4/10] Enrolling in Course...");
  const enrollRes = await fetch(`${BASE_URL}/api/courses/${pythonCourse.id}/enroll`, {
    method: "POST",
    headers: { Cookie: loginCookie },
  });
  assert.strictEqual(enrollRes.status, 200);
  console.log("✓ Successfully enrolled in course");

  // 5. Test Diagnostic Placement Test & Skip Mechanism
  console.log("\n[5/10] Running Placement Test Diagnostic...");
  const testRes = await fetch(`${BASE_URL}/api/courses/${pythonCourse.id}/placement-test`, {
    headers: { Cookie: loginCookie },
  });
  assert.strictEqual(testRes.status, 200);
  const testData = await testRes.json();
  console.log(`✓ Placement test has ${testData.questions.length} questions`);

  // Submit test with correct answers to test out of lesson 1
  const answers: Record<string, number> = {};
  testData.questions.forEach((q: any) => {
    answers[q.id] = q.correctIndex;
  });

  const submitTestRes = await fetch(`${BASE_URL}/api/courses/${pythonCourse.id}/placement-test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: loginCookie,
    },
    body: JSON.stringify({ answers }),
  });
  assert.strictEqual(submitTestRes.status, 200);
  const submitResult = await submitTestRes.json();
  console.log(`✓ Placement score: ${submitResult.scorePercentage}% — Skipped ${submitResult.skippedCount} mastered lessons!`);

  // 6. Test Lesson Details & Quiz Evaluation ("Replay the Moment")
  console.log("\n[6/10] Testing Lesson Player & Quiz Submission...");
  const courseDetailRes = await fetch(`${BASE_URL}/api/courses/${pythonCourse.id}`, {
    headers: { Cookie: loginCookie },
  });
  const courseDetail = await courseDetailRes.json();
  const firstLesson = courseDetail.course.chapters[0].lessons[0];

  const lessonRes = await fetch(`${BASE_URL}/api/lessons/${firstLesson.id}`, {
    headers: { Cookie: loginCookie },
  });
  assert.strictEqual(lessonRes.status, 200);
  const lessonData = await lessonRes.json();
  console.log(`✓ Lesson 1: "${lessonData.lesson.title}" (Timestamps: ${lessonData.lesson.startSeconds}s - ${lessonData.lesson.endSeconds}s)`);
  assert.ok(lessonData.quizQuestions && lessonData.quizQuestions.length > 0, "Lesson must have quiz questions");
  const quizQ = lessonData.quizQuestions[0];

  // Submit intentionally incorrect answer to test "Replay the Moment" explanation seek
  const quizSubmitRes = await fetch(`${BASE_URL}/api/lessons/${firstLesson.id}/quiz/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: loginCookie,
    },
    body: JSON.stringify({
      answers: {
        [quizQ.id]: 3, // intentional test answer
      },
    }),
  });
  assert.strictEqual(quizSubmitRes.status, 200);
  const quizResult = await quizSubmitRes.json();
  console.log(`✓ Quiz feedback: Score ${quizResult.score}/${quizResult.total}`);
  const missedItem = quizResult.results.find((r: any) => !r.isCorrect);
  assert.ok(missedItem, "Should detect missed question");
  console.log(`✓ Replay the Moment Timestamp: ${missedItem.replayTimestampSeconds}s (Explanation: "${missedItem.explanation.slice(0, 45)}...")`);

  // 7. Test Timestamped Personal Note Saving & Retrieval
  console.log("\n[7/10] Testing Timestamped Note Creation...");
  const createNoteRes = await fetch(`${BASE_URL}/api/lessons/${firstLesson.id}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: loginCookie,
    },
    body: JSON.stringify({
      content: "Important insight on Python scoping rules and runtime variables.",
      timestampSeconds: 42,
    }),
  });
  assert.ok(createNoteRes.status === 200 || createNoteRes.status === 201, "Note creation must succeed");
  const noteData = await createNoteRes.json();
  console.log(`✓ Saved note #${noteData.note.id} at timestamp ${noteData.note.timestampSeconds}s`);

  const allNotesRes = await fetch(`${BASE_URL}/api/notes`, {
    headers: { Cookie: loginCookie },
  });
  const allNotes = await allNotesRes.json();
  assert.ok(allNotes.notes.length > 0, "Should have saved notes");
  console.log(`✓ User has ${allNotes.notes.length} total saved notes across courses`);

  // 8. Test Daily Learning Planner
  console.log("\n[8/10] Testing Daily Learning Planner (Updating to 90 min)...");
  const updatePlannerRes = await fetch(`${BASE_URL}/api/planner`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: loginCookie,
    },
    body: JSON.stringify({ dailyStudyMinutes: 90 }),
  });
  assert.strictEqual(updatePlannerRes.status, 200);
  const plannerData = await updatePlannerRes.json();
  console.log(`✓ Updated daily target: ${plannerData.dailyStudyMinutes}m`);

  // 9. Test Career Roadmaps & Enrollment
  console.log("\n[9/10] Testing Learning Roadmaps...");
  const roadmapsRes = await fetch(`${BASE_URL}/api/roadmaps`);
  assert.strictEqual(roadmapsRes.status, 200);
  const roadmapsData = await roadmapsRes.json();
  console.log(`✓ Found ${roadmapsData.roadmaps.length} curated roadmaps`);
  const fullstackRoadmap = roadmapsData.roadmaps[0];

  const enrollRoadmapRes = await fetch(`${BASE_URL}/api/roadmaps/${fullstackRoadmap.id}/enroll`, {
    method: "POST",
    headers: { Cookie: loginCookie },
  });
  assert.strictEqual(enrollRoadmapRes.status, 200);
  console.log(`✓ Enrolled in roadmap: "${fullstackRoadmap.title}"`);

  // 10. Test Admin Analytics & AI Telemetry
  console.log("\n[10/10] Authenticating Admin & Checking Telemetry...");
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@courseit.xyz",
      password: "adminpassword123",
    }),
  });
  assert.strictEqual(adminLoginRes.status, 200);
  const adminCookie = adminLoginRes.headers.get("set-cookie") || "";

  const metricsRes = await fetch(`${BASE_URL}/api/admin/metrics`, {
    headers: { Cookie: adminCookie },
  });
  assert.strictEqual(metricsRes.status, 200);
  const metrics = await metricsRes.json();
  console.log(`✓ Platform Telemetry: ${metrics.usersCount} users, ${metrics.coursesCount} courses, ${metrics.enrollmentsCount} enrollments, ${metrics.notesCount} notes, ${metrics.quizAttemptsCount} quiz attempts`);

  console.log("\n=======================================================");
  console.log("🎉 ALL 10 CORE MODULES PASSED FULL END-TO-END VERIFICATION!");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
