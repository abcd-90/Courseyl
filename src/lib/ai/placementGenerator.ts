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
];

interface PlacementConceptQuestion {
  keywords: string[];
  languages?: string[];
  questionText: string;
  correct: string;
  distractors: [string, string, string];
  explanation: string;
}

const JAVASCRIPT_CONCEPT_BANK: PlacementConceptQuestion[] = [
  {
    keywords: ["variable", "variables", "declaration", "let", "const", "var", "hoisting", "scope"],
    languages: ["javascript", "js", "typescript", "frontend", "web"],
    questionText: "What is the key difference between `var`, `let`, and `const` declarations in JavaScript?",
    correct: "`let` and `const` are block-scoped with a Temporal Dead Zone, whereas `var` is function-scoped and hoisted initialized as `undefined`.",
    distractors: [
      "`const` prevents object properties from ever mutating, while `let` only works inside loops.",
      "`var` is strictly block-scoped and throws a ReferenceError if accessed anywhere above its line.",
      "`let` creates global immutable constants attached to `window`, whereas `var` stays local to `{}` blocks.",
    ],
    explanation: "Understanding block scope vs function scope and the Temporal Dead Zone avoids accidental leaks and ReferenceErrors.",
  },
  {
    keywords: ["data type", "data types", "type system", "primitive", "primitives", "typeof", "coercion"],
    languages: ["javascript", "js", "typescript", "web"],
    questionText: "In JavaScript's type system, how do primitive values behave compared to reference types (objects/arrays)?",
    correct: "Primitives (string, number, boolean, null, undefined, symbol, bigint) are copied by value and immutable, whereas objects are copied by reference.",
    distractors: [
      "`typeof null` evaluates to `'null'` and mutating a copied primitive updates the original variable too.",
      "Arrays and objects are stored by value on the call stack and cannot share mutable references.",
      "JavaScript enforces static compile-time types and throws a syntax error if a variable changes type.",
    ],
    explanation: "Distinguishing value semantics for primitives from reference semantics for objects prevents unexpected side-effect mutations.",
  },
  {
    keywords: ["operator", "operators", "comparison", "equality", "ternary", "logical"],
    languages: ["javascript", "js", "typescript", "web"],
    questionText: "Why does JavaScript recommend strict equality (`===`) over loose equality (`==`) in conditional logic?",
    correct: "`===` checks both value and type without implicit type coercion, preventing surprises like `0 == ''` or `'5' == 5`.",
    distractors: [
      "`===` performs deep structural equality on two separate object references automatically.",
      "`==` is deprecated syntax that throws a TypeError in modern ES6+ strict mode.",
      "`===` converts strings to numbers before comparing so numeric strings match numbers safely.",
    ],
    explanation: "Strict equality avoids JavaScript's implicit coercion rules that lead to subtle truthiness bugs.",
  },
  {
    keywords: ["loop", "loops", "iteration", "for", "while", "break", "continue"],
    languages: ["javascript", "js", "typescript", "web"],
    questionText: "When iterating in JavaScript, what distinguishes `for...of` from `for...in` and `while` loops?",
    correct: "`for...of` iterates directly over iterable values (arrays, strings, Maps/Sets), while `for...in` enumerates enumerable object keys.",
    distractors: [
      "`for...of` only iterates plain object keys and cannot run on arrays or strings.",
      "`continue` exits the entire enclosing function immediately rather than skipping the current iteration.",
      "`for...in` guarantees numeric array index types instead of string property keys.",
    ],
    explanation: "Using `for...of` for array values and `for...in` only for object keys prevents inherited-property and string-index bugs.",
  },
  {
    keywords: ["function", "functions", "closure", "closures", "arrow", "callback", "parameter"],
    languages: ["javascript", "js", "typescript", "web"],
    questionText: "How does lexical `this` binding work in a JavaScript arrow function compared to a regular `function`?",
    correct: "Arrow functions inherit `this` lexically from their enclosing scope instead of rebinding `this` dynamically based on the caller.",
    distractors: [
      "Arrow functions always bind `this` to `undefined` unless `.call()` overrides them.",
      "Regular functions capture lexical `this` permanently and ignore `.bind()` calls.",
      "Arrow functions cannot form closures over outer variables when returned from another function.",
    ],
    explanation: "Lexical `this` makes arrow functions ideal for callbacks inside methods while unsuitable as dynamic object methods.",
  },
  {
    keywords: ["array", "arrays", "map", "filter", "reduce", "splice", "slice"],
    languages: ["javascript", "js", "typescript", "web"],
    questionText: "What is the practical difference between `Array.prototype.map()`, `slice()`, and `splice()` in JavaScript?",
    correct: "`map()` and `slice()` return new arrays without mutating the original array, whereas `splice()` modifies the original array in place.",
    distractors: [
      "`slice()` mutates the original array and returns removed items, while `splice()` leaves it untouched.",
      "`map()` filters out falsy values automatically and alters the source array in place.",
      "`reduce()` executes callbacks in parallel across multiple threads without an accumulator.",
    ],
    explanation: "Knowing which array methods return new copies vs mutate in place prevents state bugs in JS apps.",
  },
  {
    keywords: ["object", "objects", "destructuring", "spread", "rest", "prototype"],
    languages: ["javascript", "js", "typescript", "web"],
    questionText: "What does shallow copying an object with the spread syntax (`{ ...obj }`) actually duplicate?",
    correct: "It creates a new top-level object with copied own enumerable properties, while nested objects remain shared references.",
    distractors: [
      "It performs a full deep clone recursively across every nested object and Map.",
      "It binds both objects bidirectionally so top-level key additions synchronize automatically.",
      "It copies prototype chain methods as own enumerable JSON properties.",
    ],
    explanation: "Spread syntax only clones one level deep; nested objects still reference the original nested objects.",
  },
  {
    keywords: ["dom", "event", "events", "bubbling", "listener", "queryselector", "async", "promise", "fetch"],
    languages: ["javascript", "js", "typescript", "web"],
    questionText: "Why use DOM event delegation (attaching one listener to a parent container) instead of separate listeners on every child item?",
    correct: "Events bubble up to the parent, lowering memory overhead and automatically handling dynamically added child elements.",
    distractors: [
      "Event bubbling only works when `event.preventDefault()` is disabled on child nodes.",
      "Parent listeners intercept events exclusively during capture phase before targets exist.",
      "Adding individual child listeners disables `fetch()` and async Promise resolution in the browser.",
    ],
    explanation: "Event delegation leverages DOM bubbling via `event.target` to keep dynamic UIs fast and clean.",
  },
];

function matchesCourseLanguageMismatch(
  courseTitle: string,
  questionText: string
): boolean {
  const cLower = courseTitle.toLowerCase();
  const qLower = questionText.toLowerCase();
  const isJsCourse =
    /\b(javascript|ecmascript|typescript|react|next\.js|node\.js|express)\b/.test(cLower) &&
    !/\bpython\b/.test(cLower);
  const isPythonCourse =
    /\bpython\b/.test(cLower) &&
    !/\b(javascript|typescript|node\.js|react)\b/.test(cLower);

  if (isJsCourse && /\b(python|python's|elif|__init__|tuple|pytest)\b/.test(qLower)) {
    return true;
  }
  if (isPythonCourse && /\b(console\.log|===|temporal dead zone|queryselector)\b/.test(qLower)) {
    return true;
  }
  return false;
}

function matchJavaScriptPlacementConcept(
  courseTitle: string,
  topicName: string,
  bodyText: string,
  usedPrompts: Set<string>,
  seedIdx: number
): Omit<GeneratedPlacementQuestion, "topicName"> | null {
  const combined = `${courseTitle} ${topicName} ${bodyText}`.toLowerCase();
  if (!/\b(javascript|js|typescript|frontend|web|dom|react|node)\b/.test(combined)) {
    return null;
  }

  let best: PlacementConceptQuestion | null = null;
  let bestScore = 0;

  for (const item of JAVASCRIPT_CONCEPT_BANK) {
    if (usedPrompts.has(item.questionText.toLowerCase())) continue;
    let score = 0;
    for (const kw of item.keywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const wordRe = new RegExp(`(?:^|[^a-z0-9_])${escaped}(?:$|[^a-z0-9_])`);
      if (wordRe.test(topicName.toLowerCase())) score += 6;
      else if (wordRe.test(combined)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (!best || bestScore < 4) return null;
  const rotated = rotateMCQOptions(best.correct, best.distractors, seedIdx);
  return {
    questionText: best.questionText,
    options: rotated.options,
    correctOptionIndex: rotated.correctOptionIndex,
    explanation: best.explanation,
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
  return questions.some((q) => isGenericPlacementQuestion(q));
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

  // Course-wide definition & takeaway pools for authentic same-course distractors
  const courseDefinitions: ParsedDefinition[] = [];
  const courseTakeaways: { text: string; topic: string }[] = [];

  for (const ch of chapters) {
    for (const les of ch.lessons || []) {
      const topic = cleanPlacementTopic(les.title) || les.title;
      courseDefinitions.push(...parseDefinitions(les.importantDefinitions, topic));
      for (const tk of parseStringArray(les.keyTakeaways)) {
        if (tk.length >= 25 && tk.length <= 180) {
          courseTakeaways.push({ text: tk, topic });
        }
      }
    }
  }

  const usedPrompts = new Set<string>();
  const results: GeneratedPlacementQuestion[] = [];

  for (let i = 0; i < sampled.length; i++) {
    const { chapterTitle, lesson, lessonIndex, topicName } = sampled[i];
    const takeaways = parseStringArray(lesson.keyTakeaways);
    const definitions = parseDefinitions(lesson.importantDefinitions, topicName);

    let chosen: Omit<GeneratedPlacementQuestion, "topicName"> | null = null;

    // Tier 1: Strong pre-existing lesson quiz question (domain-specific, non-boilerplate)
    if (Array.isArray(lesson.quizQuestions) && lesson.quizQuestions.length > 0) {
      for (const rawQ of lesson.quizQuestions) {
        const norm = normalizeQuizQuestionOptions(rawQ);
        if (!norm) continue;
        if (usedPrompts.has(norm.questionText.toLowerCase())) continue;
        if (isGenericPlacementQuestion(norm)) continue;
        if (isTimestampOrSegmentReferential(norm.questionText)) continue;
        if (matchesCourseLanguageMismatch(courseTitle, norm.questionText)) continue;
        chosen = norm;
        break;
      }
    }

    // Tier 2A: Synthesize via quizGenerator (matches technical banks + takeaways + definitions)
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
        if (!norm) continue;
        if (usedPrompts.has(norm.questionText.toLowerCase())) continue;
        if (isGenericPlacementQuestion(norm)) continue;
        if (isTimestampOrSegmentReferential(norm.questionText)) continue;
        if (matchesCourseLanguageMismatch(courseTitle, norm.questionText)) continue;
        chosen = norm;
        break;
      }
    }

    // Tier 2B: JavaScript / Web concept bank when course is JS/Frontend-focused
    if (!chosen) {
      chosen = matchJavaScriptPlacementConcept(
        courseTitle,
        topicName,
        `${lesson.summary || ""} ${lesson.description || ""} ${takeaways.join(" ")}`,
        usedPrompts,
        i + lessonIndex
      );
    }

    // Tier 3: Course-grounded Definition or Takeaway question using real sibling-concept distractors
    if (!chosen && definitions.length > 0) {
      const targetDef = definitions[0];
      const prompt = `In ${courseTitle}, what does "${targetDef.term}" (covered in ${topicName}) refer to?`;
      if (!usedPrompts.has(prompt.toLowerCase())) {
        const otherDefs = courseDefinitions
          .filter(
            (d) =>
              d.term.toLowerCase() !== targetDef.term.toLowerCase() &&
              d.definition.toLowerCase() !== targetDef.definition.toLowerCase()
          )
          .map((d) => d.definition);
        const uniqueOthers = Array.from(new Set(otherDefs)).slice(0, 3);
        while (uniqueOthers.length < 3) {
          const fallbackDistractors = [
            `A deprecated legacy syntax removed from modern ${courseTitle} workflows`,
            `An external third-party billing hook unrelated to ${topicName}`,
            `A manual override that bypasses runtime checks in ${chapterTitle || topicName}`,
          ];
          const candidate = fallbackDistractors[uniqueOthers.length];
          if (!uniqueOthers.includes(candidate)) {
            uniqueOthers.push(candidate);
          }
        }
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

    if (!chosen) {
      const summarySentences = extractSummarySentences(
        `${lesson.summary || ""} ${lesson.description || ""}`
      );
      const coreFact =
        takeaways.find((t) => t.length >= 25 && !GENERIC_PLACEMENT_PATTERNS.some((re) => re.test(t))) ||
        summarySentences[0] ||
        `Mastering ${topicName} techniques inside ${chapterTitle || courseTitle}`;

      const siblingDistractors = courseTakeaways
        .filter(
          (t) =>
            t.topic.toLowerCase() !== topicName.toLowerCase() &&
            t.text.toLowerCase() !== coreFact.toLowerCase()
        )
        .map((t) => t.text);
      const uniqueDistractors = Array.from(new Set(siblingDistractors)).slice(0, 3);

      const fallbackBank: [string, string, string] = [
        `Skipping ${topicName} entirely because it has no effect on downstream topics in ${courseTitle}`,
        `Using unrelated tools from outside ${chapterTitle || courseTitle} instead of ${topicName}`,
        `Avoiding verification checks when applying ${topicName}`,
      ];
      while (uniqueDistractors.length < 3) {
        uniqueDistractors.push(fallbackBank[uniqueDistractors.length]);
      }

      const rotated = rotateMCQOptions(
        coreFact,
        [uniqueDistractors[0], uniqueDistractors[1], uniqueDistractors[2]],
        i + lessonIndex
      );
      chosen = {
        questionText: `Which statement best reflects a core concept taught in "${topicName}" (${chapterTitle || courseTitle})?`,
        options: rotated.options,
        correctOptionIndex: rotated.correctOptionIndex,
        explanation: coreFact,
      };
    }

    usedPrompts.add(chosen.questionText.toLowerCase());
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

          seenPrompts.add(norm.questionText.toLowerCase());
          valid.push({
            topicName: cleanPlacementTopic(q.topicName) || q.topicName.trim(),
            questionText: norm.questionText,
            options: norm.options,
            correctOptionIndex: norm.correctOptionIndex,
            explanation: norm.explanation,
          });
        }

        if (valid.length >= 3) {
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
