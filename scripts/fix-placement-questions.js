require("dotenv").config();
const { Client } = require("pg");

function cleanString(str) {
  if (!str) return "";
  return str
    .replace(/\\u0026/g, "&")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0027/g, "'")
    .replace(/\\u0022/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/^\d+[\.\:\-]\s*/, "")
    .trim();
}

function generatePlacementForLessons(lessons) {
  const selected = [];
  if (lessons.length <= 6) {
    selected.push(...lessons);
  } else {
    const step = lessons.length / 6;
    for (let i = 0; i < 6; i++) {
      const idx = Math.min(lessons.length - 1, Math.floor(i * step));
      selected.push(lessons[idx]);
    }
  }

  return selected.map((les, idx) => {
    const cleanTopic = cleanString(les.title);
    const lower = cleanTopic.toLowerCase();

    let questionText = "";
    let correctOption = "";
    let wrong1 = "";
    let wrong2 = "";
    let wrong3 = "";
    let explanation = "";

    if (lower.includes("roadmap") || lower.includes("career") || lower.includes("overview") || lower.includes("intro")) {
      questionText = `What is the recommended core technical foundation before building production-grade ${cleanTopic}?`;
      correctOption = "Mastering foundational programming, data structures, and asynchronous API interactions.";
      wrong1 = "Deploying unverified machine learning models directly into production without unit testing.";
      wrong2 = "Skipping code version control (Git) and manually sharing binary executable files.";
      wrong3 = "Disabling authentication checks to maximize network transmission speed.";
      explanation = "A solid grasp of programming fundamentals and system design is essential before engineering advanced architectures.";
    } else if (lower.includes("token") || lower.includes("llm") || lower.includes("genai") || lower.includes("foundational")) {
      questionText = `In modern Large Language Models (LLMs), what is a 'token' and how does the model process it?`;
      correctOption = "A sub-word textual chunk converted into high-dimensional numerical embeddings for transformer processing.";
      wrong1 = "A temporary security password stored in the browser's HTTP-only session cookie.";
      wrong2 = "A hardware register inside the GPU that stores raw uncompressed video frames.";
      wrong3 = "A physical network packet sent over ethernet without TCP headers.";
      explanation = "LLMs tokenize text into sub-words (using algorithms like Byte-Pair Encoding) and represent them as dense vector embeddings.";
    } else if (lower.includes("prompt") || lower.includes("zero-shot") || lower.includes("chain-of-thought") || lower.includes("few-shot")) {
      questionText = `What is the fundamental mechanism that makes Chain-of-Thought (CoT) prompting effective for complex tasks?`;
      correctOption = "It instructs the model to articulate intermediate reasoning steps before arriving at the conclusion.";
      wrong1 = "It executes the same prompt multiple times in parallel and returns the fastest response.";
      wrong2 = "It modifies the internal weight matrices of the model in real time using gradient descent.";
      wrong3 = "It restricts the output to a single yes/no binary boolean response.";
      explanation = "Chain-of-Thought prompting directs the LLM to decompose complicated problems into logical deduction steps, significantly reducing errors.";
    } else if (lower.includes("rag") || lower.includes("vector") || lower.includes("database") || lower.includes("retrieval")) {
      questionText = `In a Retrieval-Augmented Generation (RAG) pipeline, what is the primary purpose of semantic vector search?`;
      correctOption = "To locate and retrieve contextually relevant knowledge chunks based on mathematical cosine similarity.";
      wrong1 = "To compress relational SQL tables into static CSV files for cold archive storage.";
      wrong2 = "To automatically compile dynamic Python scripts into compiled C++ binary libraries.";
      wrong3 = "To bypass rate limits by randomly scattering API requests across multiple IP addresses.";
      explanation = "Vector search matches the user's query vector against document chunk vectors to feed the most semantically relevant context to the prompt.";
    } else if (lower.includes("agent") || lower.includes("langgraph") || lower.includes("langchain") || lower.includes("mcp")) {
      questionText = `What architectural feature fundamentally differentiates an autonomous AI Agent from a standard LLM completion?`;
      correctOption = "An iterative reasoning loop that invokes external tools, inspects feedback, and updates persistent state.";
      wrong1 = "The ability to run exclusively on local microcontroller hardware without an internet connection.";
      wrong2 = "Strictly restricting output generation to static pre-compiled template strings.";
      wrong3 = "Disabling memory persistence so every tool call is completely forgotten immediately.";
      explanation = "Autonomous agents combine reasoning (such as ReAct loops), external tool invocation, and state management to achieve multi-step goals.";
    } else if (lower.includes("openai") || lower.includes("gemini") || lower.includes("claude") || lower.includes("api")) {
      questionText = `When architecting a production application with multi-provider LLM APIs (e.g., OpenAI, Gemini, Claude), what is a key architectural best practice?`;
      correctOption = "Decoupling API calls behind an abstraction interface and enforcing Structured Outputs with strict JSON schemas.";
      wrong1 = "Embedding private secret API keys directly inside public client-side JavaScript bundles.";
      wrong2 = "Assuming every API provider uses identical pricing tiers and latency SLAs.";
      wrong3 = "Disabling retry logic and exponential backoff on HTTP 429 rate limit responses.";
      explanation = "Using provider abstraction layers and schema validation (e.g. Zod or Pydantic) ensures resilient, type-safe multi-model integration.";
    } else if (lower.includes("python") || lower.includes("syntax") || lower.includes("programming")) {
      questionText = `In modern Python engineering, which feature provides type safety and runtime data validation for incoming API payloads?`;
      correctOption = "Type annotations combined with data parsing libraries like Pydantic or dataclasses.";
      wrong1 = "Using raw untyped global variables across all module namespaces.";
      wrong2 = "Converting all numeric inputs into base64 strings before execution.";
      wrong3 = "Suppressing all runtime exceptions with bare except: pass blocks.";
      explanation = "Type hints and validation schemas (e.g., Pydantic) detect malformed payloads early and ensure reliable contract enforcement.";
    } else {
      questionText = `In practical software development, what is the core architectural objective when working with ${cleanTopic}?`;
      correctOption = `To build modular, maintainable, and verifiable components that fulfill ${cleanTopic} requirements.`;
      wrong1 = `To merge all business logic, database queries, and UI components into a single unmaintainable file.`;
      wrong2 = `To disable all automated testing and continuous integration checks to speed up releases.`;
      wrong3 = `To bypass error handling and allow unhandled exceptions to crash the application runtime.`;
      explanation = `Engineering best practices emphasize modularity, separation of concerns, and automated test coverage.`;
    }

    const targetCorrectIdx = idx % 4;
    const rawOptions = [correctOption, wrong1, wrong2, wrong3];
    const options = [];
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

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  console.log("Connected to Supabase PostgreSQL.");

  // Get all courses
  const coursesRes = await client.query('SELECT id, title, slug FROM "Course"');
  console.log(`Found ${coursesRes.rows.length} courses.`);

  for (const course of coursesRes.rows) {
    console.log(`\nProcessing course: ${course.title} (${course.id})`);

    // Get lessons for this course
    const lessonsRes = await client.query(
      `
      SELECT l.id, l.title, l."startSeconds", l."endSeconds"
      FROM "Lesson" l
      JOIN "Chapter" ch ON ch.id = l."chapterId"
      WHERE ch."courseId" = $1
      ORDER BY l."orderIndex" ASC
    `,
      [course.id]
    );

    if (lessonsRes.rows.length === 0) {
      console.log("  No lessons found, skipping.");
      continue;
    }

    console.log(`  Found ${lessonsRes.rows.length} lessons.`);
    const placementQs = generatePlacementForLessons(lessonsRes.rows);

    // Delete existing placement questions for this course
    await client.query('DELETE FROM "PlacementQuestion" WHERE "courseId" = $1', [course.id]);

    // Insert new placement questions
    for (let pIdx = 0; pIdx < placementQs.length; pIdx++) {
      const q = placementQs[pIdx];
      const qId = `pq_${course.id.slice(-6)}_${pIdx}_${Date.now()}`;

      await client.query(
        `
        INSERT INTO "PlacementQuestion" (id, "courseId", "orderIndex", "topicName", "questionText", "correctOptionIndex", explanation, "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `,
        [qId, course.id, pIdx, q.topicName, q.questionText, q.correctOptionIndex, q.explanation]
      );

      for (let optIdx = 0; optIdx < q.options.length; optIdx++) {
        const optId = `po_${qId.slice(-10)}_${optIdx}`;
        await client.query(
          `
          INSERT INTO "PlacementOption" (id, "questionId", "optionIndex", "optionText")
          VALUES ($1, $2, $3, $4)
        `,
          [optId, qId, optIdx, q.options[optIdx]]
        );
      }
    }

    console.log(`  ✅ Added ${placementQs.length} authentic placement questions.`);
  }

  await client.end();
  console.log("\nFinished updating all placement questions!");
}

main().catch(console.error);
