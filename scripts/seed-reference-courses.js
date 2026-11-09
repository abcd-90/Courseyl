const Database = require('better-sqlite3');
const db = new Database('./dev.db');

const adminUser = db.prepare("SELECT id FROM User WHERE email = 'admin@courseit.xyz'").get();
const creatorId = adminUser ? adminUser.id : 'cmw7ty0nk0000ygu21ma73asd';

function uid(prefix = 'c') {
  return prefix + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

const now = new Date().toISOString();

// Prepare Statements
const insertCourse = db.prepare(`
  INSERT INTO Course (id, creatorId, title, slug, description, targetAudience, difficulty, thumbnailUrl, totalDurationSeconds, estimatedStudyMinutes, status, isPublic, enrollmentCount, createdAt, updatedAt)
  VALUES (@id, @creatorId, @title, @slug, @description, @targetAudience, @difficulty, @thumbnailUrl, @totalDurationSeconds, @estimatedStudyMinutes, 'READY', 1, @enrollmentCount, @now, @now)
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title,
    description = excluded.description,
    thumbnailUrl = excluded.thumbnailUrl,
    totalDurationSeconds = excluded.totalDurationSeconds,
    estimatedStudyMinutes = excluded.estimatedStudyMinutes,
    status = 'READY',
    isPublic = 1
`);

const insertSource = db.prepare(`
  INSERT INTO CourseSource (id, courseId, sourceType, sourceUrl, youtubeId, channelTitle)
  VALUES (@id, @courseId, 'YOUTUBE_VIDEO', @sourceUrl, @youtubeId, @channelTitle)
  ON CONFLICT(courseId) DO UPDATE SET
    youtubeId = excluded.youtubeId,
    channelTitle = excluded.channelTitle
`);

const deleteChapters = db.prepare(`DELETE FROM Chapter WHERE courseId = ?`);
const deletePlacement = db.prepare(`DELETE FROM PlacementQuestion WHERE courseId = ?`);

const insertChapter = db.prepare(`
  INSERT INTO Chapter (id, courseId, orderIndex, title, description, createdAt)
  VALUES (@id, @courseId, @orderIndex, @title, @description, @now)
`);

const insertLesson = db.prepare(`
  INSERT INTO Lesson (id, chapterId, orderIndex, title, description, youtubeVideoId, startSeconds, endSeconds, durationSeconds, summary, keyTakeaways, importantDefinitions, status, createdAt, updatedAt)
  VALUES (@id, @chapterId, @orderIndex, @title, @description, @youtubeVideoId, @startSeconds, @endSeconds, @durationSeconds, @summary, @keyTakeaways, @importantDefinitions, 'READY', @now, @now)
`);

const insertQuizQ = db.prepare(`
  INSERT INTO QuizQuestion (id, lessonId, orderIndex, questionText, correctOptionIndex, explanation, replayTimestampSeconds, createdAt)
  VALUES (@id, @lessonId, @orderIndex, @questionText, @correctOptionIndex, @explanation, @replayTimestampSeconds, @now)
`);

const insertQuizOpt = db.prepare(`
  INSERT INTO QuizOption (id, questionId, optionIndex, optionText)
  VALUES (@id, @questionId, @optionIndex, @optionText)
`);

const insertPlacementQ = db.prepare(`
  INSERT INTO PlacementQuestion (id, courseId, orderIndex, topicName, questionText, correctOptionIndex, explanation, createdAt)
  VALUES (@id, @courseId, @orderIndex, @topicName, @questionText, @correctOptionIndex, @explanation, @now)
`);

const insertPlacementOpt = db.prepare(`
  INSERT INTO PlacementOption (id, questionId, optionIndex, optionText)
  VALUES (@id, @questionId, @optionIndex, @optionText)
`);

// Course 1: Complete Agentic AI Course In 10 Hours (Krish Naik) - Exact from screenshot
const agenticAiLessonsByDay = [
  {
    dayTitle: "Day 1",
    dayDesc: "5 lessons · 1h 40m",
    lessons: [
      {
        title: "Environment Setup with UV Package Manager",
        desc: "Create a virtual environment, install dependencies (LangChain, LangGraph, Tavily, etc.), and manage API keys...",
        duration: 1200,
        startSeconds: 0,
        endSeconds: 1200,
      },
      {
        title: "LangChain v1: Agents, Tools & Messages",
        desc: "Build basic agents with create_agent, bind tools via @tool decorator, understand tool-calling loops, and work with...",
        duration: 1380,
        startSeconds: 1200,
        endSeconds: 2580,
      },
      {
        title: "LangChain v1: Model Integration (init_chat_model, ChatGroq, ChatOpenAI, ChatGoog",
        desc: "Integrate multiple LLM providers (Groq, OpenAI, Google Gemini) using init_chat_model and provider-specific cha...",
        duration: 780,
        startSeconds: 2580,
        endSeconds: 3360,
      },
      {
        title: "LangChain v1: Streaming, Batch & Structured Output",
        desc: "Stream token-by-token output with model.stream, run parallel requests with model.batch, and enforce response...",
        duration: 1260,
        startSeconds: 3360,
        endSeconds: 4620,
      },
      {
        title: "LangChain v1: Middleware (Summarization, Human-in-the-Loop, Fallbacks)",
        desc: "Apply built-in middleware for conversation summarization (by message count or token fraction), human approval...",
        duration: 1440,
        startSeconds: 4620,
        endSeconds: 6060,
      },
    ]
  },
  {
    dayTitle: "Day 2",
    dayDesc: "4 lessons · 1h 25m",
    lessons: [
      {
        title: "LangGraph Core: StateGraph Architecture",
        desc: "Define custom TypedDict state schemas, state reducers with Annotated operator.add, and build multi-node workflows...",
        duration: 1260,
        startSeconds: 6060,
        endSeconds: 7320,
      },
      {
        title: "Nodes, Edges & Conditional Routing in LangGraph",
        desc: "Implement conditional branching using should_continue functions and router edges to dynamic tool nodes...",
        duration: 1320,
        startSeconds: 7320,
        endSeconds: 8640,
      },
      {
        title: "State Reducers & Message History Management",
        desc: "Prevent infinite state loops and merge system prompts, chat history, and intermediate execution artifacts cleanly...",
        duration: 1140,
        startSeconds: 8640,
        endSeconds: 9780,
      },
      {
        title: "Building Multi-Agent Supervisor Workflows",
        desc: "Create hierarchical multi-agent architectures where a central coordinator delegates tasks to researcher and coder agents...",
        duration: 1380,
        startSeconds: 9780,
        endSeconds: 11160,
      },
    ]
  },
  {
    dayTitle: "Day 3",
    dayDesc: "4 lessons · 1h 30m",
    lessons: [
      {
        title: "Persistence & Checkpointers with SqliteSaver",
        desc: "Save graph checkpoints across multi-turn sessions, resume interrupted workflows, and inspect state history...",
        duration: 1380,
        startSeconds: 11160,
        endSeconds: 12540,
      },
      {
        title: "Human-in-the-Loop: Interrupting & Editing State",
        desc: "Configure interrupt_before and interrupt_after hooks for human review of sensitive tool operations...",
        duration: 1440,
        startSeconds: 12540,
        endSeconds: 13980,
      },
      {
        title: "Time Travel: State Forking & Replaying Nodes",
        desc: "Travel back in graph execution history to amend bad tool inputs and replay from an earlier checkpoint...",
        duration: 1200,
        startSeconds: 13980,
        endSeconds: 15180,
      },
      {
        title: "Streaming Graph Events with astream_events",
        desc: "Stream real-time tokens and node transition milestones directly to UI frontend clients...",
        duration: 1380,
        startSeconds: 15180,
        endSeconds: 16560,
      },
    ]
  },
  {
    dayTitle: "Day 4",
    dayDesc: "4 lessons · 1h 20m",
    lessons: [
      {
        title: "RAG Foundations: Vector Embeddings & Similarity",
        desc: "Understand dense vector representations, cosine distance vs L2 norm, and embedding models...",
        duration: 1200,
        startSeconds: 16560,
        endSeconds: 17760,
      },
      {
        title: "Document Loaders & Recursive Character Chunking",
        desc: "Load PDFs, markdown docs, and codebases with optimized chunk size and overlap to preserve semantic context...",
        duration: 1260,
        startSeconds: 17760,
        endSeconds: 19020,
      },
      {
        title: "Vector Databases: ChromaDB & FAISS in Practice",
        desc: "Index high-dimensional embeddings, run k-NN similarity queries, and filter by structured metadata tags...",
        duration: 1140,
        startSeconds: 19020,
        endSeconds: 20160,
      },
      {
        title: "Building an End-to-End Retrieval Chain",
        desc: "Combine retriever components with prompt templates and LLMs using LCEL (LangChain Expression Language)...",
        duration: 1200,
        startSeconds: 20160,
        endSeconds: 21360,
      },
    ]
  },
  {
    dayTitle: "Day 5",
    dayDesc: "4 lessons · 1h 35m",
    lessons: [
      {
        title: "Hybrid Search: Combining BM25 Keyword & Dense Vectors",
        desc: "Fuse traditional sparse keyword search with dense semantic retrieval using Reciprocal Rank Fusion (RRF)...",
        duration: 1440,
        startSeconds: 21360,
        endSeconds: 22800,
      },
      {
        title: "Re-ranking Retrieved Chunks with Cohere Rerank",
        desc: "Score and re-order the top retrieved context chunks using cross-encoder models for 40%+ relevance boost...",
        duration: 1380,
        startSeconds: 22800,
        endSeconds: 24180,
      },
      {
        title: "Contextual Compression & Document Filtering",
        desc: "Extract only the most salient sentences from retrieved documents before passing them to the generator model...",
        duration: 1440,
        startSeconds: 24180,
        endSeconds: 25620,
      },
      {
        title: "Multi-Query & Sub-Query Decomposition",
        desc: "Transform ambiguous user questions into multiple targeted queries executed in parallel against the retriever...",
        duration: 1440,
        startSeconds: 25620,
        endSeconds: 27060,
      },
    ]
  },
  {
    dayTitle: "Day 6",
    dayDesc: "3 lessons · 1h 15m",
    lessons: [
      {
        title: "Vectorless RAG: SQL & Tabular Knowledge Bases",
        desc: "Query relational databases with dynamic Text-to-SQL, schema validation, and SQL generation sanity checks...",
        duration: 1500,
        startSeconds: 27060,
        endSeconds: 28560,
      },
      {
        title: "Graph RAG: Entity Extraction & Neo4j Integration",
        desc: "Extract nodes, relationships, and triplets from unstructured text to build queryable knowledge graphs...",
        duration: 1560,
        startSeconds: 28560,
        endSeconds: 30120,
      },
      {
        title: "Hybrid Knowledge Graph & Vector Traversal",
        desc: "Traverse graph edges to find deep contextual relationships that traditional vector cosine search misses...",
        duration: 1440,
        startSeconds: 30120,
        endSeconds: 31560,
      },
    ]
  },
  {
    dayTitle: "Day 7",
    dayDesc: "4 lessons · 1h 28m",
    lessons: [
      {
        title: "LLM Security & Guardrails Architecture",
        desc: "Defend against prompt injections, jailbreaks, data leakage, and toxic outputs in automated production systems...",
        duration: 1320,
        startSeconds: 31560,
        endSeconds: 32880,
      },
      {
        title: "NeMo Guardrails: Defining Input & Output Rails with Colang",
        desc: "Use NVIDIA Colang syntax to enforce dialogue policies, restrict off-topic discussions, and sanitize outputs...",
        duration: 1440,
        startSeconds: 32880,
        endSeconds: 34320,
      },
      {
        title: "Self-Check Rails & Real-Time Hallucination Detection",
        desc: "Verify factual consistency between model outputs and retrieved context before returning responses...",
        duration: 1260,
        startSeconds: 34320,
        endSeconds: 35580,
      },
      {
        title: "PII Masking & Safe Tool Calling Policies",
        desc: "Detect and mask sensitive entities (emails, credit cards, SSNs) and restrict destructive tool execution...",
        duration: 1260,
        startSeconds: 35580,
        endSeconds: 36840,
      },
    ]
  },
  {
    dayTitle: "Day 8",
    dayDesc: "3 lessons · 1h 01m",
    lessons: [
      {
        title: "Evaluating RAG with Ragas & DeepEval",
        desc: "Benchmark faithfulness, answer relevancy, context recall, and hallucination scores on golden evaluation datasets...",
        duration: 1200,
        startSeconds: 36840,
        endSeconds: 38040,
      },
      {
        title: "Tracing & Observability with LangSmith",
        desc: "Track latency, cost, token usage, and intermediate tool inputs/outputs across full production agent trajectories...",
        duration: 1260,
        startSeconds: 38040,
        endSeconds: 39300,
      },
      {
        title: "Deploying Production Agent APIs with FastAPI & Docker",
        desc: "Containerize your LangGraph agent, configure streaming SSE endpoints with FastAPI, and deploy with zero downtime...",
        duration: 1080,
        startSeconds: 39300,
        endSeconds: 40380,
      },
    ]
  }
];

const referenceCourses = [
  {
    slug: "complete-agentic-ai-course-in-10-hours",
    title: "Complete Agentic AI Course In 10 Hours- Langchain, Langgraph, RAG,Vectorless RAG, Guardrails,Evals",
    author: "Krish Naik",
    durationStr: "11h 13m",
    totalSeconds: 40380,
    addedBy: "Bhanuranjan",
    learningCount: 29,
    thumbnail: "https://i.ytimg.com/vi/rV3HJ4LEZ7k/maxresdefault.jpg",
    youtubeId: "rV3HJ4LEZ7k",
    difficulty: "INTERMEDIATE",
    description: "Build production autonomous AI agents from scratch with LangChain v1, LangGraph, Advanced RAG, Graph RAG, NeMo Guardrails, and LangSmith observability.",
    plan: agenticAiLessonsByDay,
    placementQuestions: [
      {
        topic: "Environment & Dependencies",
        question: "Which command with the UV package manager creates an isolated virtual environment and locks dependencies?",
        options: ["uv venv && uv sync", "pip freeze > reqs.txt", "npm install agentic-ai", "conda create env"],
        correct: 0,
        explanation: "uv venv creates the virtual environment and uv sync deterministically resolves and installs locked dependencies."
      },
      {
        topic: "LangGraph StateGraph",
        question: "In LangGraph, how do you prevent new messages from overwriting the existing chat history in a State schema?",
        options: [
          "Use Annotated[list[BaseMessage], operator.add]",
          "Set history = None on every node execution",
          "Hardcode a max_tokens limit in the LLM call",
          "Pass a static string instead of a message list"
        ],
        correct: 0,
        explanation: "Annotated[list[BaseMessage], operator.add] provides a reducer function that appends new messages rather than replacing the list."
      },
      {
        topic: "RAG Re-ranking",
        question: "Why should a cross-encoder re-ranker like Cohere Rerank be applied after an initial vector search?",
        options: [
          "It jointly attends over query and document pairs to dramatically improve contextual precision",
          "It converts text into images for faster OCR processing",
          "It deletes irrelevant files from your hard drive",
          "It replaces the vector database entirely"
        ],
        correct: 0,
        explanation: "Cross-encoders evaluate the query and document together, achieving higher accuracy than initial bi-encoder vector similarity alone."
      }
    ]
  },
  {
    slug: "python-for-ai-full-beginner-course",
    title: "Python for AI - Full Beginner Course",
    author: "Dave Ebbelaar",
    durationStr: "5h 16m",
    totalSeconds: 18960,
    addedBy: "ABHISHEK",
    learningCount: 54,
    thumbnail: "https://i.ytimg.com/vi/ygXn5nV5qFc/maxresdefault.jpg",
    youtubeId: "ygXn5nV5qFc",
    difficulty: "BEGINNER",
    description: "The complete zero-to-hero Python course designed specifically for artificial intelligence, machine learning, and data engineering.",
    plan: [
      {
        dayTitle: "Day 1",
        dayDesc: "4 lessons · 1h 15m",
        lessons: [
          { title: "Python Basics: Types, Variables & Expressions", desc: "Understand primitive data types, type casting, dynamic typing, and operator precedence in modern Python 3.12...", duration: 1100, startSeconds: 0, endSeconds: 1100 },
          { title: "Control Flow: Conditionals, Match Statements & Loops", desc: "Master if-elif-else branching, pattern matching with match/case, while loops, and for-range iterations...", duration: 1200, startSeconds: 1100, endSeconds: 2300 },
          { title: "Data Structures: Lists, Tuples & Slicing", desc: "Manipulate sequential arrays, list comprehensions, immutability of tuples, and multi-dimensional index slicing...", duration: 1100, startSeconds: 2300, endSeconds: 3400 },
          { title: "Dictionaries, Sets & Hash Tables", desc: "Fast O(1) key lookups, hashable types, set union/intersections, and dictionary comprehension patterns...", duration: 1100, startSeconds: 3400, endSeconds: 4500 }
        ]
      },
      {
        dayTitle: "Day 2",
        dayDesc: "4 lessons · 1h 20m",
        lessons: [
          { title: "Functions, Type Hints & Docstrings", desc: "Define modular functions, enforce static type checking with typing modules, and write Google-style docstrings...", duration: 1200, startSeconds: 4500, endSeconds: 5700 },
          { title: "Object-Oriented Python: Classes, Dataclasses & Pydantic", desc: "Model domain concepts with classes, methods, inheritance, @dataclass, and Pydantic BaseModel validation...", duration: 1250, startSeconds: 5700, endSeconds: 6950 },
          { title: "Exception Handling & Defensive Programming", desc: "Gracefully catch exceptions with try/except/finally, define custom exception classes, and use assert statements...", duration: 1150, startSeconds: 6950, endSeconds: 8100 },
          { title: "File I/O & Working with JSON and CSV Data", desc: "Safely open and read/write structured text files, stream large datasets with context managers, and serialize objects...", duration: 1200, startSeconds: 8100, endSeconds: 9300 }
        ]
      },
      {
        dayTitle: "Day 3",
        dayDesc: "4 lessons · 1h 25m",
        lessons: [
          { title: "NumPy Fundamentals: N-Dimensional Arrays", desc: "Create high-performance numpy arrays, master vectorization, broadcasting rules, and mathematical aggregations...", duration: 1300, startSeconds: 9300, endSeconds: 10600 },
          { title: "Matrix Algebra & Vector Operations for AI", desc: "Perform dot products, matrix multiplication, norms, and transpose operations required for neural networks...", duration: 1250, startSeconds: 10600, endSeconds: 11850 },
          { title: "Pandas DataFrames: Cleaning & Filtering Data", desc: "Inspect tabular datasets, handle missing NaN values, filter rows with Boolean masks, and compute summary stats...", duration: 1250, startSeconds: 11850, endSeconds: 13100 },
          { title: "Data Transformation with GroupBy & Apply", desc: "Aggregate metrics across categories, merge disparate DataFrames, and reshape data using pivot tables...", duration: 1300, startSeconds: 13100, endSeconds: 14400 }
        ]
      },
      {
        dayTitle: "Day 4",
        dayDesc: "3 lessons · 1h 16m",
        lessons: [
          { title: "Working with OpenAI & Open-Source LLM APIs", desc: "Make HTTP calls to chat completion endpoints, pass system messages, and tune temperature parameters...", duration: 1500, startSeconds: 14400, endSeconds: 15900 },
          { title: "Building a Production CLI AI Assistant", desc: "Assemble argparse arguments, stream LLM responses in real-time, and store persistent chat session logs...", duration: 1560, startSeconds: 15900, endSeconds: 17460 },
          { title: "Packaging & Distributing Python AI Projects", desc: "Configure pyproject.toml, manage virtual environments with UV, and publish clean packages...", duration: 1500, startSeconds: 17460, endSeconds: 18960 }
        ]
      }
    ],
    placementQuestions: [
      {
        topic: "Python Data Structures",
        question: "What is the key difference between a Python list and a tuple?",
        options: ["Lists are mutable while tuples are immutable", "Tuples cannot store integers", "Lists can only have 10 elements", "There is no difference"],
        correct: 0,
        explanation: "Lists can be modified in-place after creation (mutable), whereas tuples cannot have their elements altered (immutable)."
      }
    ]
  },
  {
    slug: "full-stack-ai-engineering-course",
    title: "Full-Stack AI Engineering Course (FastAPI, LLMs, Docker...)",
    author: "Dave Ebbelaar",
    durationStr: "3h 10m",
    totalSeconds: 11400,
    addedBy: "Manish",
    learningCount: 26,
    thumbnail: "https://i.ytimg.com/vi/XzjSx7u9mGw/maxresdefault.jpg",
    youtubeId: "XzjSx7u9mGw",
    difficulty: "INTERMEDIATE",
    description: "Learn to build, ship, and scale production AI applications with FastAPI backends, asynchronous queues, Docker containers, and Next.js frontends.",
    plan: [
      {
        dayTitle: "Day 1",
        dayDesc: "3 lessons · 1h 05m",
        lessons: [
          { title: "Modern FastAPI: Routing, Pydantic & Async Endpoints", desc: "Build high-throughput REST APIs with automatic OpenAPI docs, dependency injection, and asynchronous async/await...", duration: 1300, startSeconds: 0, endSeconds: 1300 },
          { title: "Streaming LLM Responses with Server-Sent Events (SSE)", desc: "Stream tokens in real-time to client interfaces using StreamingResponse and async generator functions...", duration: 1300, startSeconds: 1300, endSeconds: 2600 },
          { title: "Authentication & Rate Limiting for AI Endpoints", desc: "Protect your API tokens with JWT bearer verification and implement sliding-window rate limiting...", duration: 1300, startSeconds: 2600, endSeconds: 3900 }
        ]
      },
      {
        dayTitle: "Day 2",
        dayDesc: "4 lessons · 1h 10m",
        lessons: [
          { title: "Background Tasks & Asynchronous Job Queues", desc: "Offload long-running model generations to Celery / Redis task workers with status polling webhooks...", duration: 1050, startSeconds: 3900, endSeconds: 4950 },
          { title: "Database Architecture with PostgreSQL & pgvector", desc: "Store conversation transcripts, user credits, and vector embeddings in a single resilient PostgreSQL database...", duration: 1050, startSeconds: 4950, endSeconds: 6000 },
          { title: "Connecting Next.js 15 UI to FastAPI", desc: "Build an interactive chat and course generation interface using React 19 Server Components and optimistic UI updates...", duration: 1050, startSeconds: 6000, endSeconds: 7050 },
          { title: "Error Handling, Retries & Fallback Providers", desc: "Implement circuit breaker patterns and fallback from OpenAI to Anthropic or Groq when rate limits strike...", duration: 1050, startSeconds: 7050, endSeconds: 8100 }
        ]
      },
      {
        dayTitle: "Day 3",
        dayDesc: "3 lessons · 55m",
        lessons: [
          { title: "Multi-Stage Docker Containers for AI Services", desc: "Write lean production Dockerfiles with non-root security, virtual environment caching, and minimal footprint...", duration: 1100, startSeconds: 8100, endSeconds: 9200 },
          { title: "Docker Compose for Local Development", desc: "Orchestrate your FastAPI backend, PostgreSQL database, Redis queue, and Next.js frontend in one click...", duration: 1100, startSeconds: 9200, endSeconds: 10300 },
          { title: "Cloud Deployment & Production Monitoring", desc: "Deploy your containerized AI stack to cloud infrastructure with automated health checks and cost alarms...", duration: 1100, startSeconds: 10300, endSeconds: 11400 }
        ]
      }
    ],
    placementQuestions: [
      {
        topic: "FastAPI Streaming",
        question: "Which response class in FastAPI allows streaming LLM tokens incrementally to the client?",
        options: ["StreamingResponse", "JsonResponse", "HTMLResponse", "StaticResponse"],
        correct: 0,
        explanation: "StreamingResponse consumes an async generator and yields chunks over Server-Sent Events (SSE) or chunked transfer encoding."
      }
    ]
  },
  {
    slug: "python-full-course-for-beginners-mosh",
    title: "Python Full Course for Beginners",
    author: "Programming with Mosh",
    durationStr: "2h 02m",
    totalSeconds: 7320,
    addedBy: "twotakesonly",
    learningCount: 11,
    thumbnail: "https://i.ytimg.com/vi/kqtD5dpn9C8/maxresdefault.jpg",
    youtubeId: "kqtD5dpn9C8",
    difficulty: "BEGINNER",
    description: "Learn Python programming from scratch with Mosh. Covers syntax, strings, arithmetic, logical operators, lists, and practical project exercises.",
    plan: [
      {
        dayTitle: "Day 1",
        dayDesc: "4 lessons · 1h 00m",
        lessons: [
          { title: "Getting Started with Python & VS Code", desc: "Install Python 3, configure VS Code with the official Python extension, and write your first Hello World script...", duration: 900, startSeconds: 0, endSeconds: 900 },
          { title: "Variables, Input & Type Conversion", desc: "Collect user input via input(), parse string values into integers and floats, and compute calculations...", duration: 900, startSeconds: 900, endSeconds: 1800 },
          { title: "Strings & String Methods", desc: "Use formatted f-strings, multiline strings, string slicing, and utility methods like upper(), lower(), and replace()...", duration: 900, startSeconds: 1800, endSeconds: 2700 },
          { title: "Arithmetic Operations & Operator Precedence", desc: "Master basic arithmetic (+, -, *, /), floor division (//), exponentiation (**), and augmented assignment operators...", duration: 900, startSeconds: 2700, endSeconds: 3600 }
        ]
      },
      {
        dayTitle: "Day 2",
        dayDesc: "4 lessons · 1h 02m",
        lessons: [
          { title: "If Statements & Comparison Operators", desc: "Evaluate Boolean expressions, logical and/or/not operators, and structure clear decision trees...", duration: 930, startSeconds: 3600, endSeconds: 4530 },
          { title: "While Loops & Building a Car Game", desc: "Control iterative program execution with while loops and build an interactive terminal car driving game...", duration: 930, startSeconds: 4530, endSeconds: 5460 },
          { title: "For Loops & Nested Iteration", desc: "Iterate across lists, ranges, calculate shopping cart totals, and render 2D geometric patterns...", duration: 930, startSeconds: 5460, endSeconds: 6390 },
          { title: "Lists & 2D Matrices Project", desc: "Find the largest number in a list, remove duplicates in-place, and work with multi-dimensional coordinates...", duration: 930, startSeconds: 6390, endSeconds: 7320 }
        ]
      }
    ],
    placementQuestions: [
      {
        topic: "Python String Operations",
        question: "How do you embed a variable inside a string using modern Python formatting?",
        options: ["f'Hello {name}'", "'Hello %s' % name", "'Hello ' + name", "string.format(name)"],
        correct: 0,
        explanation: "f-strings (f'Hello {name}') provide the cleanest, fastest, and most readable string interpolation syntax in Python."
      }
    ]
  },
  {
    slug: "python-full-course-for-free-bro-code",
    title: "Python Full Course for free 🐍",
    author: "Bro Code",
    durationStr: "12h 00m",
    totalSeconds: 43200,
    addedBy: "Prince",
    learningCount: 8,
    thumbnail: "https://i.ytimg.com/vi/ix9cRaBkVe0/maxresdefault.jpg",
    youtubeId: "ix9cRaBkVe0",
    difficulty: "BEGINNER",
    description: "The ultimate 12-hour comprehensive Python bootcamp covering everything from syntax fundamentals to GUI programming with Tkinter and OOP.",
    plan: [
      {
        dayTitle: "Day 1",
        dayDesc: "4 lessons · 1h 30m",
        lessons: [
          { title: "Variables, Data Types & Typecasting", desc: "Master integers, floats, strings, booleans, and explicit type conversion functions in Python...", duration: 1350, startSeconds: 0, endSeconds: 1350 },
          { title: "User Input, Math Functions & Operators", desc: "Import the math module, compute exponents, square roots, rounding, and construct interactive CLI calculators...", duration: 1350, startSeconds: 1350, endSeconds: 2700 },
          { title: "If Statements, Boolean Logic & Logical Operators", desc: "Chain conditional tests with and, or, and not operators to validate credentials and user permissions...", duration: 1350, startSeconds: 2700, endSeconds: 4050 },
          { title: "String Methods & String Slicing", desc: "Format text with capitalize(), find(), count(), and slice strings using [start:stop:step] syntax...", duration: 1350, startSeconds: 4050, endSeconds: 5400 }
        ]
      },
      {
        dayTitle: "Day 2",
        dayDesc: "4 lessons · 1h 30m",
        lessons: [
          { title: "While Loops & Countdown Timers", desc: "Build automated loop logic, prevent infinite loops, and construct terminal countdown timers...", duration: 1350, startSeconds: 5400, endSeconds: 6750 },
          { title: "For Loops, Iterables & Nested Loops", desc: "Iterate across sequences, count through range intervals, and render matrix shapes with nested loops...", duration: 1350, startSeconds: 6750, endSeconds: 8100 },
          { title: "Collections: Lists, Sets & Tuples", desc: "Compare mutable lists, unique unordered sets, and immutable ordered tuples for data collection...", duration: 1350, startSeconds: 8100, endSeconds: 9450 },
          { title: "Shopping Cart Program Project", desc: "Build a real-world shopping cart terminal application tracking items, quantities, and running totals...", duration: 1350, startSeconds: 9450, endSeconds: 10800 }
        ]
      }
    ],
    placementQuestions: [
      {
        topic: "Python Loops",
        question: "Which statement terminates a loop immediately and transfers execution to the code following the loop?",
        options: ["break", "continue", "pass", "exit"],
        correct: 0,
        explanation: "The break statement abruptly exits the innermost enclosing loop."
      }
    ]
  },
  {
    slug: "harvard-cs50-introduction-to-programming-with-python",
    title: "Harvard CS50's Introduction to Programming with Python ...",
    author: "freeCodeCamp.org",
    durationStr: "15h 58m",
    totalSeconds: 57480,
    addedBy: "Durvesh",
    learningCount: 7,
    thumbnail: "https://i.ytimg.com/vi/nLRL_NcnK-4/maxresdefault.jpg",
    youtubeId: "nLRL_NcnK-4",
    difficulty: "BEGINNER",
    description: "An introduction to programming using Python, taught by David J. Malan. Covers computational thinking, algorithms, regular expressions, unit testing, and OOP.",
    plan: [
      {
        dayTitle: "Day 1",
        dayDesc: "4 lessons · 1h 40m",
        lessons: [
          { title: "CS50P: Functions, Variables & Scope", desc: "David J. Malan introduces computational thinking, return values, variable scope, and clean function decomposition...", duration: 1500, startSeconds: 0, endSeconds: 1500 },
          { title: "Conditionals, Booleans & Match Statements", desc: "Evaluate truthiness, simplify complex branching logic, and implement structural pattern matching...", duration: 1500, startSeconds: 1500, endSeconds: 3000 },
          { title: "Loops, Lists & Dictionaries", desc: "Construct robust iteration routines, store key-value associations, and handle structured student data...", duration: 1500, startSeconds: 3000, endSeconds: 4500 },
          { title: "Exceptions, Input Validation & Defensive Code", desc: "Handle ValueError and ZeroDivisionError exceptions, validate user inputs, and implement retry prompts...", duration: 1500, startSeconds: 4500, endSeconds: 6000 }
        ]
      },
      {
        dayTitle: "Day 2",
        dayDesc: "4 lessons · 1h 35m",
        lessons: [
          { title: "Libraries, Modules & PyPI Packages", desc: "Import random, sys.argv command line arguments, and install third-party packages from PyPI with pip...", duration: 1425, startSeconds: 6000, endSeconds: 7425 },
          { title: "Unit Testing with pytest", desc: "Write automated unit tests with assert statements, test edge cases, and run pytest test suites...", duration: 1425, startSeconds: 7425, endSeconds: 8850 },
          { title: "File I/O, CSV Reading & Writing", desc: "Persist data across runs using with open(), sort data from CSV files, and use the csv.DictWriter class...", duration: 1425, startSeconds: 8850, endSeconds: 10275 },
          { title: "Regular Expressions: Pattern Matching & Validation", desc: "Validate email formats, extract twitter usernames, and sanitize input using the re module and regex tokens...", duration: 1425, startSeconds: 10275, endSeconds: 11700 }
        ]
      }
    ],
    placementQuestions: [
      {
        topic: "CS50 Testing",
        question: "What tool does CS50P use to automate testing of Python functions via simple assert statements?",
        options: ["pytest", "selenium", "postman", "jest"],
        correct: 0,
        explanation: "pytest allows writing concise test functions that verify expected outputs with standard assert statements."
      }
    ]
  }
];

// Seed execution
const seed = db.transaction(() => {
  for (const c of referenceCourses) {
    const courseId = uid('crs_');
    insertCourse.run({
      id: courseId,
      creatorId,
      title: c.title,
      slug: c.slug,
      description: c.description,
      targetAudience: "Learners & Developers",
      difficulty: c.difficulty,
      thumbnailUrl: c.thumbnail,
      totalDurationSeconds: c.totalSeconds,
      estimatedStudyMinutes: Math.round(c.totalSeconds / 60),
      enrollmentCount: c.learningCount || 10,
      now
    });

    // Lookup inserted or existing id
    const existingCourse = db.prepare("SELECT id FROM Course WHERE slug = ?").get(c.slug);
    const actualCourseId = existingCourse ? existingCourse.id : courseId;

    // CourseSource
    insertSource.run({
      id: uid('src_'),
      courseId: actualCourseId,
      sourceUrl: `https://www.youtube.com/watch?v=${c.youtubeId}`,
      youtubeId: c.youtubeId,
      channelTitle: c.author
    });

    // Clean existing chapters & placement questions to ensure fresh sync
    deleteChapters.run(actualCourseId);
    deletePlacement.run(actualCourseId);

    // Insert Chapters and Lessons
    let totalLessonCounter = 0;
    c.plan.forEach((chapter, chIdx) => {
      const chapterId = uid('chp_');
      insertChapter.run({
        id: chapterId,
        courseId: actualCourseId,
        orderIndex: chIdx + 1,
        title: chapter.dayTitle,
        description: chapter.dayDesc,
        now
      });

      chapter.lessons.forEach((l, lIdx) => {
        totalLessonCounter++;
        const lessonId = uid('lsn_');
        insertLesson.run({
          id: lessonId,
          chapterId,
          orderIndex: lIdx + 1,
          title: l.title,
          description: l.desc,
          youtubeVideoId: c.youtubeId,
          startSeconds: l.startSeconds || 0,
          endSeconds: l.endSeconds || l.duration,
          durationSeconds: l.duration,
          summary: `Comprehensive study breakdown of ${l.title}. Covers practical execution, syntax patterns, and real-world architectures.`,
          keyTakeaways: JSON.stringify([
            `Core principles behind ${l.title}`,
            "Practical implementation and error avoidance",
            "Production trade-offs and performance tuning"
          ]),
          importantDefinitions: JSON.stringify([
            { term: l.title.split(":")[0], definition: l.desc }
          ]),
          now
        });

        // Insert Quiz Question for this lesson
        const qId = uid('qz_');
        insertQuizQ.run({
          id: qId,
          lessonId,
          orderIndex: 1,
          questionText: `What is the key takeaway when implementing ${l.title}?`,
          correctOptionIndex: 0,
          explanation: `In ${l.title}, understanding the fundamental concepts and best practices ensures deterministic execution.`,
          replayTimestampSeconds: l.startSeconds || 30,
          now
        });

        insertQuizOpt.run({ id: uid('opt_'), questionId: qId, optionIndex: 0, optionText: `Apply the core best practices explained in ${l.title}` });
        insertQuizOpt.run({ id: uid('opt_'), questionId: qId, optionIndex: 1, optionText: "Skip dependency management entirely" });
        insertQuizOpt.run({ id: uid('opt_'), questionId: qId, optionIndex: 2, optionText: "Execute without validation or error handling" });
      });
    });

    // Insert Placement Questions
    if (c.placementQuestions) {
      c.placementQuestions.forEach((pq, pIdx) => {
        const pqId = uid('pq_');
        insertPlacementQ.run({
          id: pqId,
          courseId: actualCourseId,
          orderIndex: pIdx + 1,
          topicName: pq.topic,
          questionText: pq.question,
          correctOptionIndex: pq.correct,
          explanation: pq.explanation,
          now
        });

        pq.options.forEach((optText, oIdx) => {
          insertPlacementOpt.run({
            id: uid('popt_'),
            questionId: pqId,
            optionIndex: oIdx,
            optionText: optText
          });
        });
      });
    }

    console.log(`Seeded course: "${c.title}" with ${totalLessonCounter} lessons across ${c.plan.length} days.`);
  }
});

seed();
console.log('Reference courses seeded successfully!');

