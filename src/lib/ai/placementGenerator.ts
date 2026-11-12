import {
  AIProvider,
  getSecondaryAIProvider,
  isExternalAIProvider,
  resolveAIProvider,
} from "@/lib/ai/aiProvider";
import {
  synthesizeLessonQuizQuestions,
  type SynthesizedQuizQuestion,
} from "@/lib/ai/quizGenerator";

export interface GeneratedPlacementQuestion {
  topicName: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface PlacementQuizOptionInput {
  optionIndex?: number;
  optionText?: string;
}

export interface PlacementQuizQuestionInput {
  questionText: string;
  options: Array<string | PlacementQuizOptionInput>;
  correctOptionIndex: number;
  explanation?: string | null;
}

export interface PlacementLessonInput {
  title: string;
  description?: string | null;
  summary?: string | null;
  keyTakeaways?: string[] | string | null;
  importantDefinitions?:
    | Array<string | { term?: string; definition?: string }>
    | string
    | null;
  startSeconds?: number;
  endSeconds?: number;
  durationSeconds?: number | null;
  transcriptExcerpt?: string | null;
  quizQuestions?: PlacementQuizQuestionInput[];
}

export interface PlacementChapterInput {
  title: string;
  lessons: PlacementLessonInput[];
}

const GENERIC_PLACEMENT_PATTERNS: RegExp[] = [
  /core architectural objective when working with/i,
  /building modular, verifiable components with strict contracts/i,
  /merging all business logic, database queries, and ui components/i,
  /disabling automated verification and validation checks/i,
  /bypassing error handling and allowing unhandled exceptions/i,
  /storing all state inside mutable global variables/i,
  /which core engineering principle best describes/i,
  /which statement best describes the core goal of/i,
  /when scaling solutions taught in/i,
  /structuring .+ with clear contracts, explicit boundary/i,
  /applying foundational concepts step by step/i,
  /ignoring architecture and testing/i,
  /copying unverified snippets blindly/i,
  /clear modular structure and verification/i,
  /hardcoding every dependency inline/i,
  /avoiding error handling altogether/i,
  /when testing or reviewing work after/i,
  /what is the central objective of/i,
  /what principle keeps implementations reliable/i,
  /when reviewing or applying skills from/i,
  // Quiz/course generator template-fallback signatures that must never leak into placement tests
  /what accurately defines/i,
  /an anti-pattern that bypasses input checks/i,
  /a deprecated legacy syntax (?:disallowed inside|removed from)/i,
  /a purely cosmetic label unrelated to/i,
  /core module taught from \d{1,2}:\d{2}/i,
  /production reliability:\s*validating schemas/i,
  /an outdated myth that ignores the core principles/i,
  /a decorative label with no practical effect/i,
  /a shortcut that skips foundational accuracy/i,
  /which engineering practice reflects a key takeaway/i,
  /which key takeaway accurately reflects what is taught/i,
  /skipping validation constraints and ignoring edge cases/i,
  /duplicating unstructured scripts rather than designing/i,
  /swallowing exceptions silently so faults/i,
  /relying strictly on hardcoded trial-and-error/i,
  /removing error handling and boundaries once/i,
  /mixing unrelated concerns and unvalidated inputs/i,
  /an external third-party billing hook unrelated to/i,
  /a manual override that bypasses runtime checks/i,
  /skipping .+ entirely because it has no effect/i,
  /using unrelated tools from outside/i,
  /avoiding verification checks when applying/i,
  /mastering .+ techniques inside/i,
  /understanding the core mechanics and practical implementation of/i,
  /how should you apply .+ effectively when studying/i,
  /relies on structured application and context checks/i,
];

interface PlacementConceptQuestion {
  keywords: string[];
  domains: string[];
  questionText: string;
  correct: string;
  distractors: [string, string, string];
  explanation: string;
}

const DOMAIN_PLACEMENT_BANK: PlacementConceptQuestion[] = [
  // ---- JavaScript / TypeScript / Web ----
  {
    keywords: ["variable", "variables", "declaration", "let", "const", "var", "hoisting", "scope", "tdz"],
    domains: ["javascript", "js", "typescript", "ts", "ecmascript", "web", "frontend", "react", "node"],
    questionText: "What is the key difference between var, let, and const declarations in JavaScript?",
    correct: "let and const are block-scoped with a Temporal Dead Zone, whereas var is function-scoped and hoisted initialized as undefined.",
    distractors: [
      "const freezes nested object properties deeply so object values cannot mutate, while let only works inside loops.",
      "var is strictly block-scoped and throws a ReferenceError whenever accessed before its declaration line.",
      "let binds variables to the global window object automatically, whereas var remains isolated inside if/for blocks.",
    ],
    explanation: "Block scope and the Temporal Dead Zone on let/const prevent accidental hoisting bugs compared to function-scoped var.",
  },
  {
    keywords: ["data type", "data types", "type system", "primitive", "primitives", "typeof", "coercion", "bigint", "symbol"],
    domains: ["javascript", "js", "typescript", "ts", "ecmascript", "web", "frontend", "node"],
    questionText: "In JavaScript's type system, how do primitive values behave compared to reference types (objects and arrays)?",
    correct: "Primitives (string, number, boolean, null, undefined, symbol, bigint) are immutable and copied by value, whereas objects/arrays are copied by reference.",
    distractors: [
      "typeof null evaluates to 'null' and reassigning a copied primitive automatically mutates the original variable.",
      "Arrays and objects are stored strictly by value on the call stack and never share references across assignments.",
      "JavaScript enforces static compile-time types and rejects reassigning a string variable to a number.",
    ],
    explanation: "Distinguishing value copies for primitives from shared references for objects prevents unintended mutations.",
  },
  {
    keywords: ["operator", "operators", "comparison", "equality", "ternary", "logical", "conditional", "statements"],
    domains: ["javascript", "js", "typescript", "ecmascript", "web", "frontend", "node"],
    questionText: "Why does JavaScript recommend strict equality (===) over loose equality (==) in conditional checks?",
    correct: "=== compares both value and type without implicit coercion, avoiding bugs such as 0 == '' or '5' == 5 evaluating true.",
    distractors: [
      "=== performs recursive deep value comparison on two separate object or array instances automatically.",
      "== throws a SyntaxError whenever ES module strict mode is active in modern browsers.",
      "=== automatically casts numeric strings into IEEE-754 integers before evaluating equality.",
    ],
    explanation: "Strict equality avoids implicit type coercion surprises in JavaScript conditional expressions.",
  },
  {
    keywords: ["loop", "loops", "iteration", "for", "while", "break", "continue", "string", "strings"],
    domains: ["javascript", "js", "typescript", "ecmascript", "web", "frontend", "node"],
    questionText: "When iterating in JavaScript, what distinguishes for...of from for...in?",
    correct: "for...of iterates over iterable values (such as arrays, strings, Maps, or Sets), while for...in enumerates enumerable property keys.",
    distractors: [
      "for...of only reads plain object property names and throws an error on arrays or strings.",
      "for...in yields element values sorted numerically and skips inherited prototype keys automatically.",
      "Using continue inside a loop exits the enclosing function immediately instead of advancing to the next iteration.",
    ],
    explanation: "Use for...of for sequential array/string values and for...in only when inspecting object keys.",
  },
  {
    keywords: ["array", "arrays", "map", "filter", "reduce", "splice", "slice", "push", "pop"],
    domains: ["javascript", "js", "typescript", "ecmascript", "web", "frontend", "node"],
    questionText: "What is the practical difference between Array.prototype.map(), slice(), and splice() in JavaScript?",
    correct: "map() and slice() return new arrays without mutating the source array, whereas splice() mutates the original array in place.",
    distractors: [
      "slice() deletes items from the source array directly, while splice() creates a shallow read-only copy.",
      "map() mutates every element inside the source array in place and discards the return value.",
      "reduce() runs iterations concurrently in parallel threads without maintaining an accumulator state.",
    ],
    explanation: "Knowing which array methods return derived copies vs mutate in place keeps application state predictable.",
  },
  {
    keywords: ["function", "functions", "closure", "closures", "arrow", "parameter", "return", "method", "methods"],
    domains: ["javascript", "js", "typescript", "ecmascript", "web", "frontend", "react", "node"],
    questionText: "How does 'this' binding behave inside a JavaScript arrow function compared to a regular function declaration?",
    correct: "An arrow function captures 'this' lexically from its surrounding scope rather than dynamically from how it is called.",
    distractors: [
      "Arrow functions create a brand-new dynamic 'this' on each call that .bind() overrides permanently.",
      "Regular function expressions always lock 'this' to the parent module and ignore the receiver object.",
      "Arrow functions cannot close over variables declared inside an outer enclosing function.",
    ],
    explanation: "Lexical 'this' preserves outer context in callbacks while regular methods bind 'this' to the receiver.",
  },
  {
    keywords: ["object", "objects", "destructuring", "spread", "rest", "prototype"],
    domains: ["javascript", "js", "typescript", "ecmascript", "web", "frontend", "node"],
    questionText: "What does shallow copying a JavaScript object with spread syntax ({ ...obj }) duplicate?",
    correct: "It copies own enumerable top-level properties into a new object, while nested objects remain shared references.",
    distractors: [
      "It performs a deep recursive clone across all nested objects, Maps, and circular structures.",
      "It links both variables two-way so reassigning a top-level string updates the original object automatically.",
      "It serializes non-enumerable symbols and prototype methods into JSON string properties.",
    ],
    explanation: "Spread syntax copies one level deep; nested objects must be cloned separately if mutated.",
  },
  {
    keywords: ["dom", "document", "queryselector", "innerhtml", "textcontent", "element", "elements", "css", "styling"],
    domains: ["javascript", "js", "typescript", "ecmascript", "web", "frontend", "html", "css"],
    questionText: "When updating DOM text from user-supplied input in the browser, why prefer textContent over innerHTML?",
    correct: "textContent inserts plain text safely without parsing HTML tags, preventing Cross-Site Scripting (XSS) script injection.",
    distractors: [
      "innerHTML is read-only in modern browsers and cannot inject child elements after initial page load.",
      "textContent executes inline <script> tags faster while preserving CSS layout styles automatically.",
      "innerHTML strips all whitespace and forces synchronous browser page reloads on every update.",
    ],
    explanation: "Using textContent treats untrusted text literally instead of parsing and executing HTML markup.",
  },
  {
    keywords: ["event", "events", "listener", "addeventlistener", "bubbling", "delegation", "preventdefault", "click"],
    domains: ["javascript", "js", "typescript", "ecmascript", "web", "frontend", "react"],
    questionText: "Why use DOM event delegation on a parent container instead of attaching separate listeners to every child button?",
    correct: "Click events bubble to the parent, reducing listener memory overhead and supporting dynamically added children automatically.",
    distractors: [
      "Event bubbling only reaches parent containers if event.preventDefault() is disabled on the document body.",
      "Child buttons lose click accessibility unless each element binds its own inline onclick attribute.",
      "Parent listeners intercept events exclusively during capture phase before DOM targets finish mounting.",
    ],
    explanation: "Event delegation leverages event bubbling and event.target/closest() for dynamic lists and grids.",
  },
  {
    keywords: ["game", "building game", "tic tac toe", "rock paper", "project", "score", "reset", "turn"],
    domains: ["javascript", "js", "typescript", "ecmascript", "web", "frontend", "react"],
    questionText: "When building an interactive browser game (like Tic-Tac-Toe or Rock-Paper-Scissors) with DOM state, what causes stale clicks or corrupted rounds on game reset?",
    correct: "Failing to reset state flags (such as turn counters/board arrays) and re-enabling or clearing per-cell UI state consistently on restart.",
    distractors: [
      "Using document.querySelectorAll() instead of hardcoding inline style tags inside HTML comments.",
      "Storing win-pattern index combinations inside a constant nested array before the first move.",
      "Preventing browser page reloads by calling event.stopPropagation() inside every button click handler.",
    ],
    explanation: "Clean game resets synchronize data state, disabled button flags, and winner banners together before the next round.",
  },
  {
    keywords: ["class", "classes", "constructor", "extends", "super", "oop", "inheritance", "new"],
    domains: ["javascript", "js", "typescript", "ecmascript", "web", "frontend", "node"],
    questionText: "In an ES6 JavaScript subclass declared with 'class Child extends Parent', why must super() be called inside constructor() before referencing 'this'?",
    correct: "super() invokes the Parent constructor to initialize the 'this' instance before Child adds its own properties.",
    distractors: [
      "super() compiles the subclass into static global variables rather than prototype-linked methods.",
      "Calling super() is optional unless Parent overrides Object.prototype.toString explicitly.",
      "super() copies all private methods onto Child while severing the prototype chain to Parent.",
    ],
    explanation: "In derived classes, the base constructor creates and binds 'this', so super() must execute before 'this' access.",
  },
  {
    keywords: ["callback", "callbacks", "promise", "promises", "async", "await", "asynchronous", "settimeout", "event loop"],
    domains: ["javascript", "js", "typescript", "ecmascript", "web", "frontend", "node"],
    questionText: "How do Promises and async/await improve on deeply nested callbacks in asynchronous JavaScript?",
    correct: "They flatten nested control flow into sequential steps and centralize rejection/error handling with .catch() or try/catch.",
    distractors: [
      "async/await executes synchronous blocking CPU sleeps on the main thread without using the event loop.",
      "Promises automatically run every callback inside parallel OS worker threads outside V8.",
      "Returning a value from an async function strips away Promise wrapping and returns synchronously.",
    ],
    explanation: "Promises and async/await simplify async composition and prevent silent error drops common in nested callbacks.",
  },
  {
    keywords: ["fetch", "api", "currency", "converter", "http", "json", "response", "request", "endpoint"],
    domains: ["javascript", "js", "typescript", "ecmascript", "web", "frontend", "node", "react"],
    questionText: "When calling fetch() in JavaScript, why should you check response.ok in addition to wrapping await fetch(...) in try/catch?",
    correct: "fetch() only rejects on network failures, so HTTP 404 or 500 error responses still resolve with response.ok === false.",
    distractors: [
      "response.json() converts any HTTP 4xx status into a synchronous SyntaxError automatically.",
      "fetch() blocks the browser UI thread until every response header finishes streaming.",
      "Checking response.ok automatically caches POST responses inside localStorage across reloads.",
    ],
    explanation: "fetch() resolves normally on HTTP error status codes; inspecting response.ok lets your code handle 4xx/5xx failures explicitly.",
  },
  {
    keywords: ["error", "exception", "try", "catch", "finally", "debugging"],
    domains: ["javascript", "js", "typescript", "ecmascript", "web", "frontend", "node"],
    questionText: "What role does the finally block serve inside a try / catch / finally statement?",
    correct: "It runs after try and any matching catch block regardless of whether an exception was thrown or caught, ideal for cleanup.",
    distractors: [
      "It executes exclusively when catch catches a TypeError, skipping execution on successful runs.",
      "It suppresses uncaught errors inside async callbacks without propagating Promise rejections.",
      "It pauses loop iteration until all pending timers in the macrotask queue finish.",
    ],
    explanation: "finally always runs after try/catch completion to release locks, loading spinners, or connections reliably.",
  },
  // ---- React / Next.js ----
  {
    keywords: ["component", "props", "state", "usestate", "useeffect", "jsx", "hooks", "react", "next"],
    domains: ["react", "next", "nextjs", "frontend", "typescript", "javascript"],
    questionText: "Why does React require calling state setter functions (e.g. setCount(c => c + 1)) instead of mutating state variables directly?",
    correct: "State setters notify React to schedule a re-render with the new snapshot, whereas direct mutation leaves UI stale.",
    distractors: [
      "Direct mutation throws an immediate compile-time JSX syntax error during bundling.",
      "State setters bypass reconciliation and update DOM text nodes without re-running component logic.",
      "Functional updates execute inside a separate worker process that disables useEffect hooks.",
    ],
    explanation: "Immutable state updates through setters trigger React's reconciliation and keep concurrent updates accurate.",
  },
  // ---- SQL / Databases ----
  {
    keywords: ["sql", "select", "join", "where", "having", "group by", "index", "database", "postgres", "mysql"],
    domains: ["sql", "postgres", "postgresql", "mysql", "sqlite", "database", "databases", "prisma"],
    questionText: "In SQL queries using GROUP BY, what distinguishes WHERE from HAVING?",
    correct: "WHERE filters individual rows before grouping/aggregation occurs, while HAVING filters grouped aggregate results afterward.",
    distractors: [
      "HAVING filters ungrouped rows faster by forcing full sequential table scans without indexes.",
      "WHERE can evaluate COUNT(*) and SUM() aggregates directly without a GROUP BY clause.",
      "HAVING runs before FROM joins so unrelated tables are excluded prior to row matching.",
    ],
    explanation: "Apply WHERE to filter raw rows first and HAVING to constrain aggregated groups like COUNT(*) > 5.",
  },
  // ---- HTML / CSS ----
  {
    keywords: ["flexbox", "grid", "box model", "margin", "padding", "css", "responsive", "media query", "semantic"],
    domains: ["css", "html", "tailwind", "design", "ui", "web"],
    questionText: "When choosing CSS layout tools, when is CSS Grid usually a better fit than Flexbox?",
    correct: "CSS Grid excels at two-dimensional layouts aligning rows and columns together, whereas Flexbox aligns along one axis at a time.",
    distractors: [
      "Flexbox cannot wrap items across lines, whereas CSS Grid enforces single-row horizontal scrolling.",
      "CSS Grid ignores padding and border inside box-sizing calculations by default.",
      "Flexbox works only inside inline <span> elements and disables responsive media queries.",
    ],
    explanation: "Use Flexbox for one-dimensional rows or columns and CSS Grid when coordinating both axes simultaneously.",
  },
  // ---- Git / Version Control ----
  {
    keywords: ["git", "branch", "commit", "merge", "rebase", "pull request", "github"],
    domains: ["git", "github", "devops", "workflow"],
    questionText: "What is the key difference between 'git merge' and 'git rebase' when integrating changes onto a feature branch?",
    correct: "git merge preserves full branch history via a merge commit, whereas git rebase replays commits linearly onto the updated base.",
    distractors: [
      "git rebase deletes all untracked working-tree files before comparing commit hashes.",
      "git merge rewrites public remote commit SHAs unconditionally without creating a commit object.",
      "git rebase only works on the initial commit and cannot resolve line conflicts.",
    ],
    explanation: "Merge retains parallel branch history; rebase rewrites local commits cleanly onto the target tip.",
  },
];

function matchesCourseLanguageMismatch(
  courseTitle: string,
  questionText: string,
  optionsText = ""
): boolean {
  const cLower = courseTitle.toLowerCase();
  const combinedQ = `${questionText} ${optionsText}`.toLowerCase();
  const isJsCourse =
    /\b(javascript|ecmascript|typescript|react|next\.js|node\.js|express)\b/.test(cLower) &&
    !/\bpython\b/.test(cLower);
  const isPythonCourse =
    /\bpython\b/.test(cLower) &&
    !/\b(javascript|typescript|node\.js|react)\b/.test(cLower);

  if (
    isJsCourse &&
    /\b(python|python's|pyjokes|pip|elif|__init__|tuple|pytest|triple quotes|built-in module)\b/.test(combinedQ)
  ) {
    return true;
  }
  if (
    isPythonCourse &&
    /\b(console\.log|===|temporal dead zone|queryselector|innerhtml|addeventlistener)\b/.test(combinedQ)
  ) {
    return true;
  }
  return false;
}

function scoreDomainPlacementCandidate(
  item: PlacementConceptQuestion,
  courseTitle: string,
  topicName: string,
  bodyText: string
): number {
  const topicLower = topicName.toLowerCase();
  const courseLower = courseTitle.toLowerCase();
  const bodyLower = `${topicName} ${bodyText}`.toLowerCase();
  const domainHit = item.domains.some((d) =>
    new RegExp(`(?:^|[^a-z0-9_])${d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9_])`).test(
      `${courseLower} ${bodyLower}`
    )
  );
  if (!domainHit) return 0;

  let score = 0;
  for (const kw of item.keywords) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const wordRe = new RegExp(`(?:^|[^a-z0-9_])${escaped}(?:$|[^a-z0-9_])`);
    if (wordRe.test(topicLower)) score += 6;
    else if (wordRe.test(bodyLower)) score += 2;
  }
  return score;
}

function matchDomainPlacementConcept(
  courseTitle: string,
  topicName: string,
  bodyText: string,
  usedPrompts: Set<string>,
  usedOptionTexts: Set<string>,
  seedIdx: number
): Omit<GeneratedPlacementQuestion, "topicName"> | null {
  let best: PlacementConceptQuestion | null = null;
  let bestScore = 0;

  for (const item of DOMAIN_PLACEMENT_BANK) {
    const cleanPrompt = cleanPlacementText(item.questionText);
    if (usedPrompts.has(cleanPrompt.toLowerCase())) continue;
    const optCollision = [item.correct, ...item.distractors].some((opt) =>
      usedOptionTexts.has(cleanPlacementText(opt).toLowerCase())
    );
    if (optCollision) continue;

    const score = scoreDomainPlacementCandidate(item, courseTitle, topicName, bodyText);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (!best || bestScore < 4) return null;
  const rotated = rotateMCQOptions(
    cleanPlacementText(best.correct),
    [
      cleanPlacementText(best.distractors[0]),
      cleanPlacementText(best.distractors[1]),
      cleanPlacementText(best.distractors[2]),
    ],
    seedIdx
  );
  return {
    questionText: cleanPlacementText(best.questionText),
    options: rotated.options,
    correctOptionIndex: rotated.correctOptionIndex,
    explanation: cleanPlacementText(best.explanation),
  };
}

const BOILERPLATE_LESSON_TITLES = new Set([
  "intro",
  "introduction",
  "welcome",
  "overview",
  "course overview",
  "prerequisite",
  "prerequisites",
  "prerequisite part",
  "what is this course",
  "course structure",
  "agenda",
  "table of contents",
  "promo",
  "trailer",
  "outro",
  "conclusion",
  "wrap up",
  "thank you",
  "roadmap",
]);

export function cleanPlacementText(input = ""): string {
  return String(input || "")
    .replace(/\\u0026/g, "&")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0027/g, "'")
    .replace(/\\u0022/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    .replace(/^\d+[\.\:\-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanPlacementTopic(rawTitle = ""): string {
  return cleanPlacementText(rawTitle)
    .replace(/^(Module\s*\d+(?:\.\d+)?|Chapter\s*\d+|Day\s*\d+|Project\s*\d+|Level\s*\d+)\s*[:|\-–]\s*/i, "")
    .replace(/\s*\(Part\s*\d+(?:\s*of\s*\d+)?[:\s]*[^)]*\)\s*/gi, "")
    .replace(/^\d+[\.\:\-]\s*/, "")
    .trim();
}

export function isGenericPlacementQuestion(q: {
  questionText?: string;
  options?: Array<string | PlacementQuizOptionInput>;
}): boolean {
  const optTexts = (q.options || []).map((o) =>
    typeof o === "string" ? o : o?.optionText || ""
  );
  const combined = `${q.questionText || ""} ${optTexts.join(" ")}`;
  return GENERIC_PLACEMENT_PATTERNS.some((re) => re.test(combined));
}

export function hasLowQualityPlacementSet(
  questions: Array<{
    questionText?: string;
    options?: Array<string | PlacementQuizOptionInput>;
  }>
): boolean {
  if (!Array.isArray(questions) || questions.length < 3) return true;

  const seenOptions = new Set<string>();
  for (const q of questions) {
    if (isGenericPlacementQuestion(q)) return true;
    if (/\*\*[^*\n]+\*\*/.test(q.questionText || "")) return true;

    const rawOpts = (q.options || [])
      .map((o) => cleanPlacementText(typeof o === "string" ? o : o?.optionText || ""))
      .filter(Boolean);
    if (rawOpts.length < 4) return true;

    const perQuestionSet = new Set(rawOpts.map((o) => o.toLowerCase()));
    if (perQuestionSet.size < 4) return true;

    // If any option repeats verbatim across 2+ placement questions, treat the set as low quality
    for (const normOpt of perQuestionSet) {
      if (seenOptions.has(normOpt)) return true;
      seenOptions.add(normOpt);
    }
  }

  return false;
}

function parseStringArray(
  val: string[] | string | null | undefined
): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((item) => cleanPlacementText(String(item))).filter(Boolean);
  }
  const trimmed = val.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) =>
          typeof item === "string"
            ? cleanPlacementText(item)
            : typeof item === "object" && item
            ? cleanPlacementText(
                item.term && item.definition
                  ? `${item.term}: ${item.definition}`
                  : item.text || item.content || ""
              )
            : ""
        )
        .filter(Boolean);
    }
  } catch {}
  return trimmed
    .split(/\r?\n/)
    .map((s) => cleanPlacementText(s))
    .filter(Boolean);
}

interface ParsedDefinition {
  term: string;
  definition: string;
  topic: string;
}

function parseDefinitions(
  val: PlacementLessonInput["importantDefinitions"],
  topic: string
): ParsedDefinition[] {
  if (!val) return [];
  const rawItems: Array<string | { term?: string; definition?: string }> =
    Array.isArray(val)
      ? val
      : (() => {
          try {
            const parsed = JSON.parse(String(val));
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return String(val)
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter(Boolean);
          }
        })();

  const defs: ParsedDefinition[] = [];
  for (const item of rawItems) {
    if (typeof item === "object" && item && item.term && item.definition) {
      const term = cleanPlacementText(item.term);
      const definition = cleanPlacementText(item.definition);
      if (term.length >= 2 && definition.length >= 12) {
        defs.push({ term, definition, topic });
      }
      continue;
    }
    const str = cleanPlacementText(String(item || ""));
    const colonIdx = str.indexOf(":");
    if (colonIdx > 1 && colonIdx < str.length - 12) {
      const term = str.slice(0, colonIdx).trim();
      const definition = str.slice(colonIdx + 1).trim();
      if (term.length >= 2 && definition.length >= 12) {
        defs.push({ term, definition, topic });
      }
    }
  }
  return defs;
}

function normalizeQuizQuestionOptions(
  q: PlacementQuizQuestionInput
): {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
} | null {
  const questionText = cleanPlacementText(q.questionText);
  if (questionText.length < 12) return null;

  const sortedOpts = [...(q.options || [])].sort((a, b) => {
    const idxA = typeof a === "object" && typeof a.optionIndex === "number" ? a.optionIndex : 0;
    const idxB = typeof b === "object" && typeof b.optionIndex === "number" ? b.optionIndex : 0;
    return idxA - idxB;
  });

  const optTexts = sortedOpts
    .map((o) => cleanPlacementText(typeof o === "string" ? o : o?.optionText || ""))
    .filter(Boolean);

  if (optTexts.length < 4) return null;
  const distinct = new Set(optTexts.slice(0, 4).map((t) => t.toLowerCase()));
  if (distinct.size < 4) return null;
  if (
    q.correctOptionIndex < 0 ||
    q.correctOptionIndex >= 4
  ) {
    return null;
  }

  return {
    questionText,
    options: optTexts.slice(0, 4),
    correctOptionIndex: q.correctOptionIndex,
    explanation: cleanPlacementText(
      q.explanation || "Tests core knowledge of this curriculum module."
    ),
  };
}

function isTimestampOrSegmentReferential(prompt: string): boolean {
  return /\b(lesson segment|video segment|according to "?.*"?\s*\((?:overview|key point)|instructor mentions|in this clip)\b/i.test(
    prompt
  );
}

interface SampledPlacementLesson {
  chapterTitle: string;
  lesson: PlacementLessonInput;
  lessonIndex: number;
  topicName: string;
}

export function selectPlacementSampleLessons(
  chapters: PlacementChapterInput[],
  maxCount = 6
): SampledPlacementLesson[] {
  const all: SampledPlacementLesson[] = [];
  let idx = 0;

  for (const ch of chapters) {
    for (const les of ch.lessons || []) {
      const topic = cleanPlacementTopic(les.title) || cleanPlacementText(les.title);
      all.push({
        chapterTitle: cleanPlacementText(ch.title),
        lesson: les,
        lessonIndex: idx,
        topicName: topic || `Lesson ${idx + 1}`,
      });
      idx++;
    }
  }

  if (all.length === 0) return [];

  const substantive = all.filter((item) => {
    const norm = item.topicName.toLowerCase().replace(/[^\w\s]/g, "").trim();
    if (BOILERPLATE_LESSON_TITLES.has(norm)) return false;
    if (norm.length <= 2) return false;
    return true;
  });

  const pool = substantive.length >= 3 ? substantive : all;
  const targetCount = Math.min(8, Math.max(3, Math.min(pool.length, maxCount)));

  const picked: SampledPlacementLesson[] = [];
  const usedTopics = new Set<string>();

  if (pool.length <= targetCount) {
    for (const item of pool) {
      const key = item.topicName.toLowerCase();
      if (!usedTopics.has(key)) {
        usedTopics.add(key);
        picked.push(item);
      }
    }
    return picked.length >= 3 ? picked : pool.slice(0, targetCount);
  }

  const step = pool.length / targetCount;
  for (let i = 0; i < targetCount; i++) {
    const baseIdx = Math.min(pool.length - 1, Math.floor(i * step));
    let candidate = pool[baseIdx];
    if (usedTopics.has(candidate.topicName.toLowerCase())) {
      const alt = pool.find(
        (p, pIdx) => pIdx >= baseIdx && !usedTopics.has(p.topicName.toLowerCase())
      );
      if (alt) candidate = alt;
    }
    usedTopics.add(candidate.topicName.toLowerCase());
    picked.push(candidate);
  }

  return picked;
}

function rotateMCQOptions(
  correct: string,
  distractors: [string, string, string],
  seedIdx: number
): { options: string[]; correctOptionIndex: number } {
  const targetIdx = ((seedIdx % 4) + 4) % 4;
  const options: string[] = [];
  let dIdx = 0;
  for (let o = 0; o < 4; o++) {
    if (o === targetIdx) {
      options.push(correct);
    } else {
      options.push(distractors[dIdx]);
      dIdx++;
    }
  }
  return { options, correctOptionIndex: targetIdx };
}

function extractSummarySentences(text = ""): string[] {
  return cleanPlacementText(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length >= 35 &&
        s.length <= 185 &&
        !/^explore\s/i.test(s) &&
        !/^cover(ing)?\s/i.test(s)
    );
}

/**
 * Generates diagnostic placement questions directly from the course's actual curriculum:
 * stored/synthesized domain quiz questions, key definitions, takeaways, and lesson summaries.
 * Never emits static architectural boilerplate.
 */
export function buildPlacementQuestionsFromCurriculum(params: {
  courseTitle: string;
  difficulty?: string;
  chapters: PlacementChapterInput[];
}): GeneratedPlacementQuestion[] {
  const { courseTitle, chapters } = params;
  const sampled = selectPlacementSampleLessons(chapters, 6);
  if (sampled.length === 0) return [];

  // Course-wide non-boilerplate definition & takeaway pools for authentic same-course distractors
  const courseDefinitions: ParsedDefinition[] = [];
  const courseTakeaways: { text: string; topic: string }[] = [];
  const allTopicNames: string[] = [];

  for (const ch of chapters) {
    for (const les of ch.lessons || []) {
      const topic = cleanPlacementTopic(les.title) || les.title;
      if (topic && !allTopicNames.includes(topic)) {
        allTopicNames.push(topic);
      }
      for (const d of parseDefinitions(les.importantDefinitions, topic)) {
        if (!isGenericPlacementQuestion({ questionText: `${d.term}: ${d.definition}` })) {
          courseDefinitions.push(d);
        }
      }
      for (const tk of parseStringArray(les.keyTakeaways)) {
        if (
          tk.length >= 25 &&
          tk.length <= 180 &&
          !isGenericPlacementQuestion({ questionText: tk })
        ) {
          courseTakeaways.push({ text: tk, topic });
        }
      }
    }
  }

  const usedPrompts = new Set<string>();
  const usedOptionTexts = new Set<string>();
  const results: GeneratedPlacementQuestion[] = [];

  const canAcceptQuestion = (
    norm: {
      questionText: string;
      options: string[];
      correctOptionIndex: number;
      explanation: string;
    } | null
  ): norm is Omit<GeneratedPlacementQuestion, "topicName"> => {
    if (!norm) return false;
    if (usedPrompts.has(norm.questionText.toLowerCase())) return false;
    if (isGenericPlacementQuestion(norm)) return false;
    if (isTimestampOrSegmentReferential(norm.questionText)) return false;
    if (matchesCourseLanguageMismatch(courseTitle, norm.questionText, norm.options.join(" "))) {
      return false;
    }
    return norm.options.every((opt) => !usedOptionTexts.has(opt.toLowerCase()));
  };

  for (let i = 0; i < sampled.length; i++) {
    const { chapterTitle, lesson, lessonIndex, topicName } = sampled[i];
    const takeaways = parseStringArray(lesson.keyTakeaways).filter(
      (t) => !isGenericPlacementQuestion({ questionText: t })
    );
    const definitions = parseDefinitions(lesson.importantDefinitions, topicName).filter(
      (d) => !isGenericPlacementQuestion({ questionText: `${d.term}: ${d.definition}` })
    );

    let chosen: Omit<GeneratedPlacementQuestion, "topicName"> | null = null;

    // Tier 1: Strong pre-existing lesson quiz question (domain-specific, non-boilerplate, unique options)
    if (Array.isArray(lesson.quizQuestions) && lesson.quizQuestions.length > 0) {
      for (const rawQ of lesson.quizQuestions) {
        const norm = normalizeQuizQuestionOptions(rawQ);
        if (canAcceptQuestion(norm)) {
          chosen = norm;
          break;
        }
      }
    }

    // Tier 2A: Domain placement concept bank (JS/TS, React, SQL, CSS/HTML, Git)
    if (!chosen) {
      const domainMatch = matchDomainPlacementConcept(
        courseTitle,
        topicName,
        `${chapterTitle} ${lesson.summary || ""} ${lesson.description || ""} ${takeaways.join(" ")}`,
        usedPrompts,
        usedOptionTexts,
        i + lessonIndex
      );
      if (canAcceptQuestion(domainMatch)) {
        chosen = domainMatch;
      }
    }

    // Tier 2B: Synthesize via quizGenerator domain banks (Python, AI/LLM, FastAPI, System Design, Excel, Cybersecurity, etc.)
    if (!chosen) {
      const synthesized: SynthesizedQuizQuestion[] = synthesizeLessonQuizQuestions(
        {
          title: lesson.title,
          description: lesson.description,
          summary: lesson.summary,
          keyTakeaways: takeaways,
          importantDefinitions: definitions.map((d) => `${d.term}: ${d.definition}`),
          chapterTitle,
          courseTitle,
          startSeconds: lesson.startSeconds ?? 0,
          endSeconds: lesson.endSeconds ?? (lesson.durationSeconds || 600),
          durationSeconds: lesson.durationSeconds ?? 600,
          lessonIndex,
          transcriptExcerpt: lesson.transcriptExcerpt ?? undefined,
        },
        5
      );

      for (const sq of synthesized) {
        const norm = normalizeQuizQuestionOptions(sq);
        if (canAcceptQuestion(norm)) {
          chosen = norm;
          break;
        }
      }
    }

    // Tier 3: Course-grounded Definition or Takeaway question using unique per-topic & sibling-module distractors
    if (!chosen && definitions.length > 0) {
      const targetDef = definitions[0];
      const prompt = `In ${courseTitle}, what does "${targetDef.term}" (covered in ${topicName}) refer to?`;
      if (
        !usedPrompts.has(prompt.toLowerCase()) &&
        !usedOptionTexts.has(targetDef.definition.toLowerCase())
      ) {
        const otherDefs = courseDefinitions
          .filter(
            (d) =>
              d.term.toLowerCase() !== targetDef.term.toLowerCase() &&
              d.definition.toLowerCase() !== targetDef.definition.toLowerCase() &&
              !usedOptionTexts.has(d.definition.toLowerCase())
          )
          .map((d) => d.definition);
        const siblingTopics = allTopicNames.filter(
          (t) => t.toLowerCase() !== topicName.toLowerCase()
        );
        const siblingA = siblingTopics[i % Math.max(1, siblingTopics.length)] || "later modules";
        const uniqueOthers = Array.from(new Set(otherDefs)).slice(0, 3);
        const topicSpecificFallbacks = [
          `A configuration concept belonging strictly to "${siblingA}" rather than "${targetDef.term}" in "${topicName}"`,
          `An optional visual style override that has no effect on how "${targetDef.term}" behaves at runtime`,
          `A manual workaround that disables core checks introduced during "${topicName}"`,
        ];
        for (const candidate of topicSpecificFallbacks) {
          if (uniqueOthers.length >= 3) break;
          if (
            !uniqueOthers.includes(candidate) &&
            !usedOptionTexts.has(candidate.toLowerCase())
          ) {
            uniqueOthers.push(candidate);
          }
        }
        if (uniqueOthers.length >= 3) {
          const rotated = rotateMCQOptions(
            targetDef.definition,
            [uniqueOthers[0], uniqueOthers[1], uniqueOthers[2]],
            i + lessonIndex
          );
          chosen = {
            questionText: prompt,
            options: rotated.options,
            correctOptionIndex: rotated.correctOptionIndex,
            explanation: `${targetDef.term}: ${targetDef.definition}`,
          };
        }
      }
    }

    if (!chosen) {
      const summarySentences = extractSummarySentences(
        `${lesson.summary || ""} ${lesson.description || ""}`
      );
      const siblingTopics = allTopicNames.filter(
        (t) => t.toLowerCase() !== topicName.toLowerCase()
      );
      const siblingA = siblingTopics[i % Math.max(1, siblingTopics.length)] || "downstream workflows";
      const siblingB =
        siblingTopics[(i + 1) % Math.max(1, siblingTopics.length)] || "project setup";

      const coreFact =
        takeaways.find(
          (t) => t.length >= 25 && !usedOptionTexts.has(t.toLowerCase())
        ) ||
        summarySentences.find((s) => !usedOptionTexts.has(s.toLowerCase())) ||
        `Applying "${topicName}" directly inside "${chapterTitle || courseTitle}" examples with verified inputs and outputs`;

      const siblingDistractors = courseTakeaways
        .filter(
          (t) =>
            t.topic.toLowerCase() !== topicName.toLowerCase() &&
            t.text.toLowerCase() !== coreFact.toLowerCase() &&
            !usedOptionTexts.has(t.text.toLowerCase())
        )
        .map((t) => t.text);
      const uniqueDistractors = Array.from(new Set(siblingDistractors)).slice(0, 3);

      const perQuestionFallbacks = [
        `Deferring "${topicName}" setup entirely until finishing "${siblingA}" in an unrelated stage`,
        `Replacing "${topicName}" rules with assumptions copied unchanged from "${siblingB}"`,
        `Skipping validation when transferring values out of "${topicName}" into "${siblingA}"`,
      ];
      for (const fb of perQuestionFallbacks) {
        if (uniqueDistractors.length >= 3) break;
        if (
          !uniqueDistractors.includes(fb) &&
          !usedOptionTexts.has(fb.toLowerCase())
        ) {
          uniqueDistractors.push(fb);
        }
      }

      const rotated = rotateMCQOptions(
        coreFact,
        [
          uniqueDistractors[0] || perQuestionFallbacks[0],
          uniqueDistractors[1] || perQuestionFallbacks[1],
          uniqueDistractors[2] || perQuestionFallbacks[2],
        ],
        i + lessonIndex
      );
      chosen = {
        questionText: `Which statement accurately describes how "${topicName}" is applied in ${courseTitle}?`,
        options: rotated.options,
        correctOptionIndex: rotated.correctOptionIndex,
        explanation: coreFact,
      };
    }

    usedPrompts.add(chosen.questionText.toLowerCase());
    for (const opt of chosen.options) {
      usedOptionTexts.add(opt.toLowerCase());
    }
    results.push({
      topicName,
      questionText: chosen.questionText,
      options: chosen.options,
      correctOptionIndex: chosen.correctOptionIndex,
      explanation: chosen.explanation,
    });
  }

  return results;
}

async function callPlacementJSONWithFailover<T>(
  primary: AIProvider,
  prompt: string,
  schema: string
): Promise<T> {
  try {
    return await primary.generateJSON<T>(prompt, schema);
  } catch (err) {
    const secondary = getSecondaryAIProvider(primary);
    if (secondary) {
      return await secondary.generateJSON<T>(prompt, schema);
    }
    throw err;
  }
}

/**
 * Generates curriculum-grounded placement questions via external LLM when configured,
 * validating strictly against generic templates and seamlessly falling back to
 * `buildPlacementQuestionsFromCurriculum`.
 */
export async function generatePlacementQuestionsWithAI(params: {
  courseTitle: string;
  difficulty?: string;
  chapters: PlacementChapterInput[];
  provider?: AIProvider;
}): Promise<GeneratedPlacementQuestion[]> {
  const { courseTitle, difficulty = "BEGINNER", chapters } = params;
  const provider = params.provider ?? (await resolveAIProvider().catch(() => null));
  const sampled = selectPlacementSampleLessons(chapters, 6);

  if (provider && isExternalAIProvider(provider) && sampled.length >= 3) {
    const curriculumDigest = sampled
      .map((s, idx) => {
        const takeaways = parseStringArray(s.lesson.keyTakeaways).slice(0, 3);
        const defs = parseDefinitions(s.lesson.importantDefinitions, s.topicName)
          .slice(0, 2)
          .map((d) => `${d.term}: ${d.definition}`);
        const summary = cleanPlacementText(
          s.lesson.summary || s.lesson.description || ""
        ).slice(0, 200);

        return [
          `${idx + 1}. Topic: "${s.topicName}" (Chapter: "${s.chapterTitle}")`,
          summary ? `   Summary: ${summary}` : "",
          defs.length > 0 ? `   Definitions: ${defs.join(" | ")}` : "",
          takeaways.length > 0 ? `   Key takeaways: ${takeaways.join(" | ")}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n");

    const prompt = `Create ${sampled.length} diagnostic placement-test questions for the course "${courseTitle}" (difficulty: ${difficulty}).
Each question MUST test real conceptual or practical mastery of one of the sampled curriculum topics below so learners who already know that topic can safely skip it:

${curriculumDigest}

Strict rules:
- Ask concrete, subject-specific questions (e.g. actual behavior, APIs, mechanisms, trade-offs, formulas, or concepts from each lesson above).
- NEVER write generic filler like "core architectural objective", "modular verifiable components with strict contracts", "merging all business logic", or "disabling automated checks".
- Provide exactly ${sampled.length} questions, each with 4 plausible, domain-authentic options (only 1 strictly accurate) and valid correctOptionIndex (0-3).
- Set topicName to match the exact Topic string shown above.`;

    const schema = `{
  "questions": [
    {
      "topicName": "Exact sampled topic name",
      "questionText": "Concrete technical or domain-specific diagnostic question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOptionIndex": 0,
      "explanation": "Concise 1-sentence explanation grounded in the lesson topic"
    }
  ]
}`;

    try {
      const parsed = await Promise.race([
        callPlacementJSONWithFailover<{
          questions?: Array<{
            topicName?: string;
            questionText?: string;
            options?: string[];
            correctOptionIndex?: number;
            explanation?: string;
          }>;
        }>(provider, prompt, schema),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000)),
      ]);

      if (parsed?.questions && Array.isArray(parsed.questions)) {
        const valid: GeneratedPlacementQuestion[] = [];
        const seenPrompts = new Set<string>();
        const seenOptions = new Set<string>();

        for (const q of parsed.questions) {
          if (
            typeof q?.topicName !== "string" ||
            q.topicName.trim().length < 2 ||
            typeof q?.questionText !== "string" ||
            !Array.isArray(q.options) ||
            q.options.length !== 4 ||
            typeof q.correctOptionIndex !== "number"
          ) {
            continue;
          }

          const norm = normalizeQuizQuestionOptions({
            questionText: q.questionText,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            explanation: q.explanation,
          });
          if (!norm) continue;
          if (seenPrompts.has(norm.questionText.toLowerCase())) continue;
          if (isGenericPlacementQuestion(norm)) continue;
          if (norm.options.some((opt) => seenOptions.has(opt.toLowerCase()))) continue;

          seenPrompts.add(norm.questionText.toLowerCase());
          for (const opt of norm.options) {
            seenOptions.add(opt.toLowerCase());
          }
          valid.push({
            topicName: cleanPlacementTopic(q.topicName) || q.topicName.trim(),
            questionText: norm.questionText,
            options: norm.options,
            correctOptionIndex: norm.correctOptionIndex,
            explanation: norm.explanation,
          });
        }

        if (valid.length >= 3 && !hasLowQualityPlacementSet(valid)) {
          return valid.slice(0, 8);
        }
      }
    } catch {}
  }

  return buildPlacementQuestionsFromCurriculum({
    courseTitle,
    difficulty,
    chapters,
  });
}
