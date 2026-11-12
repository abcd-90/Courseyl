import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { isExternalAIProvider, resolveAIProvider } from "@/lib/ai/aiProvider";

export interface SynthesizedQuizQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  replayTimestampSeconds: number;
}

export interface LessonQuizContext {
  lessonId?: string;
  title: string;
  description?: string | null;
  summary?: string | null;
  keyTakeaways?: string[];
  importantDefinitions?: string[];
  chapterTitle?: string | null;
  courseTitle?: string | null;
  startSeconds?: number;
  endSeconds?: number;
  durationSeconds?: number | null;
  lessonIndex?: number;
  transcriptExcerpt?: string | null;
}

interface RawTopicMCQ {
  prompt: string;
  correct: string;
  distractors: [string, string, string];
  explanation: string;
  subtopic?: string;
  keywords?: string[];
}

interface TopicQuestionBank {
  id: string;
  priorityPhrases?: string[];
  keywords: string[];
  questions: RawTopicMCQ[];
}

const WRAPPER_SUBTOPIC_STOPWORDS = new Set([
  "overview",
  "core concepts",
  "foundations",
  "setup",
  "introduction",
  "intro",
  "syntax",
  "execution",
  "execution flow",
  "architecture",
  "workflow",
  "workflows",
  "walkthrough",
  "implementation",
  "hands-on",
  "hands on",
  "practice set",
  "practice questions",
  "methods",
  "operations",
  "properties",
  "complete",
  "beginners",
  "python",
  "in python",
  "guide",
  "tutorial",
  "review",
  "testing",
  "deployment",
  "integration",
  "integrations",
  "logic",
  "business logic",
  "rules",
  "part 1",
  "part 2",
  "part 3",
  "part 4",
]);

const regexCache = new Map<string, RegExp>();

function containsKeyword(textLower: string, rawKw: string): boolean {
  const kw = rawKw.trim().toLowerCase();
  if (!kw) return false;
  if (/^[a-z0-9_]+$/.test(kw) && kw.length <= 6) {
    let re = regexCache.get(kw);
    if (!re) {
      re = new RegExp(`(?:^|[^a-z0-9_])${kw}(?:$|[^a-z0-9_])`);
      regexCache.set(kw, re);
    }
    return re.test(textLower);
  }
  return textLower.includes(kw);
}

function normalizeTopicText(raw = ""): string {
  return raw
    .replace(/^(Module\s*\d+(\.\d+)?|Chapter\s*\d+|Day\s*\d+|Project\s*\d+|Level\s*\d+)\s*[:|\-–]\s*/i, "")
    .replace(/\(\s*Part\s*\d+[^)]*\)/gi, "")
    .replace(/^\d+[\.\:\-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPartOffset(rawTitle = ""): number {
  const m = rawTitle.match(/Part\s*(\d+)/i) || rawTitle.match(/Module\s*(\d+)\.(\d+)/i);
  if (!m) return 0;
  return Number.parseInt(m[m.length - 1] || "1", 10) || 0;
}

/**
 * Extracts concrete technical topics / methods / tools taught inside a specific lesson
 * from its title and description.
 */
export function extractLessonSubtopics(ctx: LessonQuizContext): string[] {
  const cleanTitle = normalizeTopicText(ctx.title);
  const titleAgenda = cleanTitle
    .replace(/^Chapter\s+\d+\s+Practice Set\s*:\s*/i, "")
    .replace(/^Build Your Own\s+/i, "")
    .replace(/^Build\s+/i, "");

  const rawChunks = titleAgenda
    .split(/\s*[:|,\/&+–—]\s*|\s+(?:and|vs\.?|with|using)\s+/i)
    .map((s) => s.replace(/[()]/g, " ").replace(/\s+/g, " ").trim().toLowerCase())
    .filter((s) => s.length >= 2 && s.length <= 48);

  const meaningful: string[] = [];
  const seen = new Set<string>();

  for (const chunk of rawChunks) {
    if (WRAPPER_SUBTOPIC_STOPWORDS.has(chunk)) continue;
    if (/^\d+$/.test(chunk)) continue;
    if (!seen.has(chunk)) {
      seen.add(chunk);
      meaningful.push(chunk);
    }
  }

  // Also capture backticked / inline API identifiers inside description/summary, e.g. keys(), values(), items(), update(), get()
  const descMatches = (ctx.description || "").match(/\b[a-zA-Z_][a-zA-Z0-9_]{1,18}\(\)/g) || [];
  for (const fnToken of descMatches) {
    const k = fnToken.toLowerCase();
    if (!seen.has(k) && !seen.has(k.replace(/\(\)$/, ""))) {
      seen.add(k);
      meaningful.push(k);
    }
  }

  if (meaningful.length === 0 && cleanTitle) {
    meaningful.push(cleanTitle.toLowerCase());
  }

  return meaningful;
}

/**
 * Computes content-proportional quiz question count (3 to 12 questions) based on lesson
 * duration, distinct sub-topics covered, practice/project depth, and structured content richness.
 */
export function computeRecommendedQuizCount(ctx: LessonQuizContext): number {
  const startSec = Math.max(0, Number(ctx.startSeconds ?? 0));
  const endSec = Math.max(startSec + 60, Number(ctx.endSeconds ?? startSec + 600));
  const durationSec = Math.max(60, Number(ctx.durationSeconds ?? endSec - startSec));
  const durMin = Math.max(1, Math.round(durationSec / 60));

  const subtopics = extractLessonSubtopics(ctx);
  const takeawaysCount = (ctx.keyTakeaways || []).filter((t) => typeof t === "string" && t.trim().length > 10).length;
  const defsCount = (ctx.importantDefinitions || []).filter((d) => typeof d === "string" && d.trim().length > 10).length;
  const bodyLen = [ctx.description || "", ctx.summary || "", ctx.transcriptExcerpt || ""].join(" ").trim().length;

  let score = 3;
  if (durMin <= 4) score = 3;
  else if (durMin <= 8) score = 3;
  else if (durMin <= 11) score = 4;
  else if (durMin <= 15) score = 5;
  else if (durMin <= 22) score = 6;
  else if (durMin <= 32) score = 7;
  else if (durMin <= 44) score = 8;
  else if (durMin <= 58) score = 9;
  else if (durMin <= 85) score = 10;
  else if (durMin <= 115) score = 11;
  else score = 12;

  if (subtopics.length >= 7) score += 3;
  else if (subtopics.length >= 5) score += 2;
  else if (subtopics.length >= 4 && durMin >= 10) score += 1;
  else if (subtopics.length <= 2 && durMin <= 8) score = Math.min(score, 3);

  if (takeawaysCount + defsCount >= 5 && durMin >= 12) score += 1;
  if (bodyLen >= 420 && durMin >= 16) score += 1;
  if (/\b(practice set|practice questions|capstone|end-to-end|project)\b/i.test(ctx.title) && durMin >= 12) {
    score += 1;
  }

  const normalizedHead = normalizeTopicText(ctx.title).toLowerCase();
  if (/^(intro|in this video|final thoughts|recap|python wrap-up)/i.test(normalizedHead) && durMin <= 5) {
    score = 3;
  }

  return Math.max(3, Math.min(12, score));
}

function buildRotatedMCQ(
  raw: RawTopicMCQ,
  seed: number,
  qIndex: number,
  totalCount: number,
  startSeconds: number,
  endSeconds: number
): SynthesizedQuizQuestion {
  const span = Math.max(30, endSeconds - startSeconds);
  const ratio =
    totalCount <= 1
      ? 0.5
      : 0.12 + (qIndex / Math.max(1, totalCount - 1)) * 0.8;
  const targetIdx = Math.abs(seed + qIndex * 3) % 4;
  const options: string[] = [];
  let wrongIdx = 0;

  for (let i = 0; i < 4; i++) {
    if (i === targetIdx) {
      options.push(raw.correct);
    } else {
      options.push(raw.distractors[wrongIdx++]);
    }
  }

  return {
    questionText: raw.prompt,
    options,
    correctOptionIndex: targetIdx,
    explanation: raw.explanation,
    replayTimestampSeconds: Math.max(0, Math.floor(startSeconds + span * ratio)),
  };
}

/**
 * Granular multi-domain curriculum question banks where each question is tagged to specific
 * sub-topics and keywords so ALL concepts taught inside a lesson get covered proportionally.
 */
const TOPIC_QUESTION_BANKS: TopicQuestionBank[] = [
  {
    id: "python_intro_setup",
    priorityPhrases: [
      "course introduction & python setup",
      "modules, pip & pyjokes",
      "python setup & pip",
      "input function & string concatenation",
      "installing python",
      "running python in terminal",
      "what is python",
      "key features of python",
      "why do we need programming",
      "poems, tables & modules",
      "python modules (math",
    ],
    keywords: [
      "pip",
      "pyjokes",
      "idle",
      "repl",
      "interpreter",
      "input(",
      "python setup",
      "installing python",
      "concatenation",
      "pyttsx3",
      "modules",
    ],
    questions: [
      {
        subtopic: "python setup",
        keywords: ["python", "interpreted", "setup", "what is python", "features", "programming"],
        prompt: "Why is Python classified as an **interpreted**, high-level general-purpose language?",
        correct: "Its bytecode executes instruction-by-instruction via the Python VM without manual machine-code compilation or raw memory pointer management.",
        distractors: [
          "It runs only inside static HTML stylesheets inside web browsers",
          "It requires writing x86 assembly headers for every variable declaration",
          "It disables runtime libraries so all programs run offline without imports",
        ],
        explanation: "Python prioritizes readability and dynamic execution through an interpreter rather than manual low-level memory compilation.",
      },
      {
        subtopic: "pip",
        keywords: ["pip", "install", "package", "external module"],
        prompt: "What is `pip` used for in a Python development workflow?",
        correct: "Installing, upgrading, and managing external third-party packages (such as `pyjokes` or `pandas`) from PyPI.",
        distractors: [
          "Converting `.py` scripts directly into native iOS `.ipa` binaries",
          "Formatting Python indentation automatically on file save",
          "Clearing RAM allocations after every `print()` call",
        ],
        explanation: "`pip` is Python's standard package installer for fetching and managing third-party libraries.",
      },
      {
        subtopic: "modules",
        keywords: ["module", "import", "pyjokes", "math", "pyttsx3"],
        prompt: "What is the key difference between a **built-in module** (like `math` or `os`) and an **external module** (like `pyjokes`)?",
        correct: "Built-in modules ship with the Python standard library and import immediately, whereas external modules must be installed via `pip` first.",
        distractors: [
          "External modules run twice as fast because they ignore syntax rules",
          "Built-in modules can only be imported inside `while` loops",
          "External modules do not require an `import` statement before use",
        ],
        explanation: "The standard library is bundled with Python, while community packages require `pip install` before importing.",
      },
      {
        subtopic: "comments & repl",
        keywords: ["comment", "repl", "table", "poem", "idle", "terminal"],
        prompt: "How do you write single-line comments versus multi-line strings (often used for multi-line poems/blocks) in Python?",
        correct: "`#` begins a single-line comment ignored by the interpreter, while triple quotes (`'''...'''` or `\"\"\"...\"\"\"`) preserve multi-line text blocks.",
        distractors: [
          "`//` creates single-line comments and `/* ... */` prints multi-line text directly",
          "`<!-- -->` comments out Python functions at runtime",
          "`--` disables entire Python modules cleanly",
        ],
        explanation: "Python uses `#` for comments and triple-quoted string literals to span multiple lines cleanly in `print()`.",
      },
      {
        subtopic: "input()",
        keywords: ["input(", "input function", "user input", "concatenation"],
        prompt: "What data type does Python's built-in `input()` function ALWAYS return, regardless of what the user types?",
        correct: "A string (`str`), which must be explicitly cast (e.g., `int(input())`) before arithmetic operations.",
        distractors: [
          "Automatically converts numeric text like `'42'` into an `int`",
          "Returns a `tuple` containing raw keystrokes",
          "Returns `None` unless stored in a global constant",
        ],
        explanation: "`input()` always captures user input as a `str`; arithmetic requires converting it with `int()` or `float()`.",
      },
      {
        subtopic: "string concatenation",
        keywords: ["concatenation", "+", "input(", "string"],
        prompt: "What happens in Python when you evaluate `input(\"First: \") + input(\"Second: \")` after entering `5` and `7`?",
        correct: "String concatenation occurs, producing `'57'` instead of `12`, because both `input()` values are strings.",
        distractors: [
          "Python automatically parses digits and outputs integer `12`",
          "Python raises a `SyntaxError` whenever `+` touches variables",
          "The second value overwrites the first value inside memory",
        ],
        explanation: "Since `input()` returns strings, `+` joins text characters (`'5' + '7' == '57'`) unless converted to numbers first.",
      },
      {
        subtopic: "add to path / setup",
        keywords: ["path", "install", "terminal", "idle", "anaconda", "jupyter"],
        prompt: "Why is checking **Add Python to PATH** important when installing Python on your system?",
        correct: "It lets your OS terminal resolve `python` and `pip` commands globally from any folder without typing full installation paths.",
        distractors: [
          "It automatically writes unit tests inside every folder on your drive",
          "It enables multi-threading inside `print()` statements",
          "It forces Python to bypass syntax checking in IDLE",
        ],
        explanation: "Adding Python to PATH registers executables cleanly so `python` and `pip` work across any terminal directory.",
      },
      {
        subtopic: "comments & syntax errors",
        keywords: ["syntax", "runtime", "error", "identifier", "naming"],
        prompt: "What is the key difference between a **SyntaxError** and a **Runtime Exception** (e.g., `ZeroDivisionError`) in Python?",
        correct: "A `SyntaxError` is detected during code parsing before execution starts, while a runtime exception happens mid-execution on a valid-syntax line.",
        distractors: [
          "Syntax errors can always be caught and silenced by `if/else` statements",
          "Runtime exceptions only happen when importing built-in modules",
          "Syntax errors occur only in Jupyter Notebooks, never `.py` scripts",
        ],
        explanation: "Python parses syntax before executing; malformed grammar stops startup immediately, whereas runtime logic fails dynamically.",
      },
    ],
  },
  {
    id: "python_variables_types",
    priorityPhrases: [
      "variables, data types & type conversion",
      "type conversion",
      "type casting",
      "variable scope",
      "identifiers & naming",
    ],
    keywords: [
      "variable",
      "data type",
      "type(",
      "int(",
      "float(",
      "str(",
      "bool",
      "complex",
      "casting",
      "conversion",
      "identifier",
      "local",
      "global",
    ],
    questions: [
      {
        subtopic: "data types",
        keywords: ["data type", "int", "float", "str", "bool", "none"],
        prompt: "Which set lists Python's five primary foundational scalar/literal data types (`int`, `float`, `str`, `bool`, `NoneType`) accurately?",
        correct: "Whole numbers (`42`), decimals (`3.14`), text (`'hi'`), booleans (`True`/`False`), and null absence (`None`).",
        distractors: [
          "Characters (`char`), 16-bit pointers (`ptr`), floats (`f32`), null (`void`), and structs",
          "Only strings and integers exist until importing `numpy`",
          "Booleans are lowercase `true`/`false` keywords distinct from `bool`",
        ],
        explanation: "Python natively represents integers, floating-point numbers, strings, capitalized `True`/`False` booleans, and `None`.",
      },
      {
        subtopic: "type conversion",
        keywords: ["conversion", "casting", "int(", "float(", "str(", "explicit", "implicit"],
        prompt: "What happens if you call `int(\"31.5\")` directly versus `int(float(\"31.5\"))` in Python?",
        correct: "`int(\"31.5\")` raises `ValueError` because the string contains a decimal point, while `int(float(\"31.5\"))` succeeds and truncates to `31`.",
        distractors: [
          "Both return `32` rounded up automatically",
          "`int(\"31.5\")` silently rounds down to `31` while `float()` raises `TypeError`",
          "Python returns `'31.5'` unchanged as a string",
        ],
        explanation: "`int()` parses integer strings cleanly, but decimal strings require parsing via `float()` first before truncating to `int`.",
      },
      {
        subtopic: "implicit vs explicit",
        keywords: ["implicit", "explicit", "conversion", "float"],
        prompt: "What distinguishes **implicit type conversion** from **explicit type casting** in Python?",
        correct: "Python automatically widens compatible numeric expressions (e.g., `5 + 2.0 -> 7.0`) implicitly, whereas `int('5')` is manual explicit casting.",
        distractors: [
          "Explicit casting converts strings into integers automatically inside `print()`",
          "Implicit conversion merges mismatched types like `'5' + 2` into `7`",
          "Python never performs implicit conversion under any arithmetic operator",
        ],
        explanation: "Numeric widening (`int` + `float` -> `float`) happens automatically, while cross-category conversion (`str` -> `int`) must be explicit.",
      },
      {
        subtopic: "type()",
        keywords: ["type(", "inspect", "dynamic"],
        prompt: "What does `type(x)` return in Python when `x = \"31\"` vs `x = 31`?",
        correct: "`<class 'str'>` for `\"31\"` and `<class 'int'>` for `31`, reflecting Python's dynamic runtime typing on objects.",
        distractors: [
          "`type()` converts a string into an integer automatically",
          "`type(\"31\")` returns `<class 'int'>` whenever characters are digits",
          "`type()` throws a syntax error unless a type hint `: int` is written first",
        ],
        explanation: "`type()` inspects the runtime class of the object a variable currently references.",
      },
      {
        subtopic: "identifiers & naming",
        keywords: ["identifier", "naming", "variable", "rule"],
        prompt: "Which variable identifier violates Python's naming rules and raises a `SyntaxError`?",
        correct: "`2_user_score` or `my@var`, because identifiers cannot start with a digit or include `@` (only letters, digits after char 1, and `_`).",
        distractors: [
          "`_private_count` (starts with underscore)",
          "`user2_score` (contains a digit after letters)",
          "`snake_case_total` (uses underscores)",
        ],
        explanation: "Python identifiers must start with a letter or underscore `_` and may contain only letters, digits, and `_`.",
      },
      {
        subtopic: "scope",
        keywords: ["scope", "local", "global", "function"],
        prompt: "What happens when a variable is assigned inside a Python function with the same name as a global variable (without the `global` keyword)?",
        correct: "Python creates a separate **local variable** scoped to that function call without mutating the outer global binding.",
        distractors: [
          "It automatically overwrites the global variable for the rest of the module",
          "Python forbids local variables from reusing any existing global name",
          "The variable permanently locks in read-only mode everywhere",
        ],
        explanation: "Assignments inside a function bind locally unless `global name` is explicitly declared.",
      },
      {
        subtopic: "booleans & complex",
        keywords: ["bool", "complex", "float", "integer", "data type"],
        prompt: "Which statement accurately describes `bool` (`True`/`False`) and `float` arithmetic edge behavior in Python?",
        correct: "`bool` is a subclass of `int` (`True == 1`, `False == 0`), and `float` uses IEEE 754 binary approximation (e.g., `0.1 + 0.2 != 0.3`).",
        distractors: [
          "`True + True` raises a `TypeError` because booleans cannot convert to numbers",
          "Python `float` represents all base-10 decimals with infinite exactness",
          "`complex` literals use `i` (`3 + 4i`) rather than `j` (`3 + 4j`)",
        ],
        explanation: "In Python `bool` inherits from `int`, binary floats have finite precision rounding, and complex literals use `j`.",
      },
    ],
  },
  {
    id: "python_operators",
    priorityPhrases: [
      "operators: arithmetic, assignment, comparison, logical",
      "relational & logical operators",
      "arithmetic operators",
      "relational operators",
      "logical operators",
      "assignment operators",
      "operator precedence",
      "identity operators",
    ],
    keywords: [
      "arithmetic",
      "assignment",
      "comparison",
      "relational",
      "logical",
      "precedence",
      "associativity",
      "modulo",
      "floor division",
      "//",
      "**",
    ],
    questions: [
      {
        subtopic: "arithmetic",
        keywords: ["arithmetic", "//", "/", "%", "**", "floor division", "modulo"],
        prompt: "What is the key difference between standard division `/`, floor division `//`, and modulo `%` in Python 3?",
        correct: "`/` always produces a `float` (e.g., `7/2 == 3.5`), `//` floors toward negative infinity (`7//2 == 3`), and `%` yields the remainder (`7%2 == 1`).",
        distractors: [
          "`/` truncates fractions when both inputs are integers (`7/2 == 3`)",
          "`//` computes exponents while `%` calculates percentage multipliers (`x / 100`)",
          "`/` and `//` return identical integers unless one input is negative",
        ],
        explanation: "Python 3 separates true float division `/` from integer/floor division `//` and remainder `%`.",
      },
      {
        subtopic: "assignment",
        keywords: ["assignment", "+=", "-=", "*=", "/=", "="],
        prompt: "What is the difference between `=` and compound assignment operators like `+=` or `*=`?",
        correct: "`=` assigns/rebinds a value to a variable name, while `x += 3` evaluates `x + 3` and updates the target variable (`=` is NOT comparison).",
        distractors: [
          "`=` compares two values for equality, while `+=` always defines an immutable constant",
          "`x += 3` increments `x` inside the condition of an `if` statement without rebinding",
          "`+=` only works on floats and throws `TypeError` on integers or strings",
        ],
        explanation: "Single `=` performs binding, `+=`/`-=` apply arithmetic in-place rebinding, and `==` performs equality checks.",
      },
      {
        subtopic: "comparison",
        keywords: ["comparison", "relational", "==", "!=", ">=", "<="],
        prompt: "What do comparison (relational) operators (`==`, `!=`, `>`, `<`, `>=`, `<=`) evaluate to in Python, and can they chain?",
        correct: "They evaluate to a `bool` (`True` or `False`), and Python natively supports chained comparisons like `10 <= age <= 60`.",
        distractors: [
          "They return `-1`, `0`, or `1` integers like C strcmp",
          "Chaining `10 <= age <= 60` causes a `TypeError` comparing a bool with an integer",
          "`!=` checks variable memory addresses while `=` checks value equality",
        ],
        explanation: "Relational operators yield booleans and chain cleanly (`a < b < c` means `a < b and b < c`).",
      },
      {
        subtopic: "logical",
        keywords: ["logical", "and", "or", "not", "short-circuit"],
        prompt: "How do Python's logical operators `and`, `or`, and `not` behave with boolean expressions and short-circuiting?",
        correct: "`and` requires both sides truthy (stops if left is falsy), `or` succeeds if either side is truthy (stops if left is truthy), and `not` flips truthiness.",
        distractors: [
          "Python uses `&&`, `||`, and `!` tokens exclusively for boolean logic",
          "`and` always forces evaluation of both operands even when the left side is `False`",
          "`or` evaluates to `True` only if exactly one of its operands is True (XOR)",
        ],
        explanation: "Python's `and` and `or` use English keywords and short-circuit left-to-right.",
      },
      {
        subtopic: "precedence",
        keywords: ["precedence", "associativity", "**", "exponent", "priority"],
        prompt: "In Python operator precedence (`2 + 3 * 4 ** 2`), which order are operations evaluated?",
        correct: "Exponentiation `**` runs first (`4**2 = 16`), multiplication `*` second (`3*16 = 48`), and addition `+` last (`2+48 = 50`).",
        distractors: [
          "Strictly left-to-right (`(2+3) * 4 = 20`, then `20**2 = 400`)",
          "Addition `+` always binds tighter than multiplication `*`",
          "`**` runs last after all comparison operators",
        ],
        explanation: "Parentheses > `**` > `* / // %` > `+ -` > comparisons > `not` > `and` > `or`.",
      },
      {
        subtopic: "identity vs equality",
        keywords: ["is", "==", "identity", "equality", "none"],
        prompt: "When does `a == b` return `True` while `a is b` returns `False`?",
        correct: "When two distinct objects hold equal values (e.g., two separate lists `[1, 2]` and `[1, 2]`) at different memory locations.",
        distractors: [
          "`is` and `==` are exact synonyms for every Python object",
          "`a == b` compares memory IDs while `a is b` compares element lengths",
          "`a is b` works only on strings under 4 characters",
        ],
        explanation: "`==` checks value equality, whereas `is` verifies exact object identity (`id(a) == id(b)`).",
      },
      {
        subtopic: "boolean algebra & truth table",
        keywords: ["not", "and", "or", "truth", "logical"],
        prompt: "What does `not (True and False) or False` evaluate to?",
        correct: "`True`, because `True and False` is `False`, `not False` is `True`, and `True or False` is `True`.",
        distractors: [
          "`False`, because `or False` overrides preceding `True` expressions",
          "`False`, because `not` applies only after `or` completes",
          "`None`, because boolean expressions do not yield values directly",
        ],
        explanation: "Parentheses evaluate first (`False`), `not` flips it to `True`, and `True or False` yields `True`.",
      },
      {
        subtopic: "exponent & division combo",
        keywords: ["**", "//", "%", "arithmetic", "negative"],
        prompt: "What value does `10 % 3` return vs `2 ** 3`?",
        correct: "`10 % 3` gives remainder `1`, and `2 ** 3` computes `2` raised to power `3` (`8`).",
        distractors: [
          "`10 % 3` returns `3.33` and `2 ** 3` computes bitwise XOR",
          "`10 % 3` returns `3` and `2 ** 3` multiplies `2 * 3` (`6`)",
          "`%` raises a warning on odd denominators",
        ],
        explanation: "`%` returns the division remainder and `**` performs exponentiation.",
      },
    ],
  },
  {
    id: "python_strings",
    priorityPhrases: [
      "strings: indexing, slicing & methods",
      "string formatting & escape sequences",
      "strings & operations",
      "strings revisited",
      "slicing with step value",
      "string slicing",
      "negative indexing",
      "python f-strings",
      "string formatting",
      "string methods",
    ],
    keywords: [
      "string",
      "slicing",
      "slice",
      "string indexing",
      "character index",
      "negative index",
      "escape sequence",
      "f-string",
      "\\n",
      "\\t",
      "ord(",
      "chr(",
    ],
    questions: [
      {
        subtopic: "indexing",
        keywords: ["indexing", "negative indexing", "index"],
        prompt: "Given `word = \"Python\"`, what characters do `word[0]` and `word[-1]` access?",
        correct: "`word[0]` returns `'P'` (first character) and `word[-1]` returns `'n'` (last character using reverse indexing).",
        distractors: [
          "`word[0]` raises `IndexError` because Python strings start at index `1`",
          "`word[-1]` reverses the entire string `'nohtyP'` automatically",
          "`word[-1]` accesses `'y'` from the start",
        ],
        explanation: "Python indexing is 0-based from the start and -1-based counting backward from the end.",
      },
      {
        subtopic: "slicing",
        keywords: ["slicing", "slice", "step"],
        prompt: "In Python string slicing `text[start:stop:step]`, is the `stop` index included and what does `text[::-1]` produce?",
        correct: "`stop` is **exclusive** (elements stop at `stop - 1`), and `text[::-1]` returns a reversed copy of `text`.",
        distractors: [
          "Both `start` and `stop` indices are always included, and `::-1` deletes the last character",
          "Omitting `start` and `stop` triggers a `ValueError` unless length is even",
          "`text[1:4]` slices characters `1, 2, 3, 4` inclusively",
        ],
        explanation: "Slice bounds are half-open `[start, stop)`, and a `-1` step traverses the sequence backward.",
      },
      {
        subtopic: "immutability",
        keywords: ["immutab", "strings", "replace", "modify"],
        prompt: "What happens if you execute `s = \"hello\"; s[0] = \"H\"` in Python?",
        correct: "Python raises a `TypeError` because strings are **immutable**; methods like `.replace()` return a new string.",
        distractors: [
          "`s` updates cleanly in place to `\"Hello\"`",
          "`s[0]` appends `'H'` to the start of the existing buffer",
          "Python silently converts `s` into a mutable list of characters",
        ],
        explanation: "Strings cannot be modified character-by-character; transformations construct new string objects.",
      },
      {
        subtopic: "methods",
        keywords: ["method", "find", "replace", "upper", "lower", "strip", "split", "capitalize"],
        prompt: "How does `text.find(\"x\")` differ from `text.replace(\"a\", \"b\")` on a Python string?",
        correct: "`.find()` returns the lowest starting index (or `-1` if missing) without crashing, whereas `.replace()` returns a brand-new string with substitutions applied.",
        distractors: [
          "`.find()` raises a `ValueError` when absent, while `.replace()` mutates `text` in place",
          "`.find()` deletes matching characters directly from the source string",
          "`.replace()` only updates the very last character of a string",
        ],
        explanation: "`.find()` safely returns `-1` when not found; `.replace()` returns a newly constructed string.",
      },
      {
        subtopic: "escape sequences",
        keywords: ["escape", "\\n", "\\t", "\\\"", "backslash"],
        prompt: "Inside Python string literals, what do `\\n`, `\\t`, and `\\\\` represent?",
        correct: "A newline character (`\\n`), a horizontal tab (`\\t`), and a literal backslash character (`\\\\`).",
        distractors: [
          "Syntax comments that disable text output in `print()`",
          "Bitwise shifts applied to ASCII character codes",
          "Placeholders that only compile inside `dict` keys",
        ],
        explanation: "Backslash escape sequences encode control characters (`\\n`, `\\t`) and escaped quotes/backslashes inside strings.",
      },
      {
        subtopic: "f-strings",
        keywords: ["f-string", "formatting", "f\"", "interpolation"],
        prompt: "Why are **f-strings** (`f\"Hi {name}, score={val:.1f}\"`) preferred over manual `+` concatenation for output formatting?",
        correct: "They evaluate variables/expressions inline, convert non-strings cleanly, and support concise format specifiers like `:.1f`.",
        distractors: [
          "Because `+` works only with integers and never strings",
          "F-strings automatically write formatted strings straight to disk",
          "F-strings bypass variable scope rules across separate files",
        ],
        explanation: "Formatted string literals (`f\"...\"`) avoid clunky `str()` casts and improve readability.",
      },
      {
        subtopic: "ord & chr",
        keywords: ["ord(", "chr(", "ascii", "unicode"],
        prompt: "What do Python's built-in `ord('A')` and `chr(65)` functions convert between?",
        correct: "`ord('A')` returns its integer Unicode/ASCII code point (`65`), while `chr(65)` maps that integer back to `'A'`.",
        distractors: [
          "`ord()` sorts list items alphabetically and `chr()` hashes passwords",
          "`ord()` counts string length while `chr()` capitalizes text",
          "`ord('A')` raises `ValueError` unless lowercase `'a'` is passed",
        ],
        explanation: "`ord()` and `chr()` are inverse helpers converting between single characters and integer Unicode code points.",
      },
      {
        subtopic: "concatenation & repetition",
        keywords: ["concatenation", "repetition", "len(", "*"],
        prompt: "In Python, what do `\"Py\" + \"thon\"` and `\"ha\" * 3` evaluate to?",
        correct: "`\"Python\"` (concatenation) and `\"hahaha\"` (repetition), with `len()` counting total characters.",
        distractors: [
          "`\"ha\" * 3` raises a `TypeError` in every Python version",
          "`\"Py\" + \"thon\"` returns an ASCII sum integer",
          "`\"ha\" * 3` returns `\"ha3\"`",
        ],
        explanation: "`+` joins strings and `*` repeats strings an integer number of times.",
      },
    ],
  },
  {
    id: "python_lists",
    priorityPhrases: [
      "lists in python",
      "list methods",
      "list operations",
      "built-in list functions",
      "copying lists",
      "list comprehension",
      "lists & tuples",
    ],
    keywords: [
      "list",
      "append",
      "sort",
      "reverse",
      "insert",
      "pop",
      "remove",
      "extend",
      "mutability",
      "copy",
      "comprehension",
    ],
    questions: [
      {
        subtopic: "mutability",
        keywords: ["mutab", "list", "creation", "indexing"],
        prompt: "What defines a Python `list` compared to immutable types like `str` or `tuple`?",
        correct: "Lists are ordered, dynamically sized **mutable** collections that can hold mixed data types and change elements in place.",
        distractors: [
          "Lists must contain strictly homogeneous data types fixed at creation time",
          "Lists cannot be indexed using `[0]` or sliced with `[:]`",
          "Lists automatically discard duplicate values like sets",
        ],
        explanation: "Unlike strings and tuples, lists allow in-place element assignment, insertion, and deletion.",
      },
      {
        subtopic: "append vs extend",
        keywords: ["append", "extend"],
        prompt: "What happens when you call `nums.append([4, 5])` vs `nums.extend([4, 5])` on `nums = [1, 2, 3]`?",
        correct: "`.append([4, 5])` nests `[4, 5]` as ONE single item at the end (`[1, 2, 3, [4, 5]]`), while `.extend([4, 5])` unpacks both elements (`[1, 2, 3, 4, 5]`).",
        distractors: [
          "`.append()` inserts at index `0` and `.extend()` always sorts values first",
          "Both produce `[1, 2, 3, 4, 5]` identically",
          "`.extend()` returns a brand-new list without modifying `nums`",
        ],
        explanation: "`.append()` adds one object as a single element; `.extend()` iterates and appends each item.",
      },
      {
        subtopic: "insert",
        keywords: ["insert"],
        prompt: "How does `items.insert(2, \"new\")` modify a Python list?",
        correct: "It inserts `\"new\"` at index `2` and shifts existing elements from index `2` onward one position to the right without overwriting.",
        distractors: [
          "It overwrites and deletes the item previously stored at index `2`",
          "It always appends `\"new\"` at the very end regardless of the index argument",
          "It returns the deleted element without modifying `items`",
        ],
        explanation: "`.insert(idx, val)` inserts before index `idx`, preserving and shifting existing items.",
      },
      {
        subtopic: "sort vs sorted & reverse",
        keywords: ["sort", "reverse", "sorted"],
        prompt: "Why does writing `result = nums.sort()` or `result = nums.reverse()` leave `result` equal to `None`?",
        correct: "Because `.sort()` and `.reverse()` mutate the list **in place** and intentionally return `None` (unlike `sorted(nums)` which returns a new list).",
        distractors: [
          "Because `.sort()` only returns a list when elements are strings",
          "Because `.sort()` throws away items that were already in order",
          "Because `nums` becomes a tuple after calling `.reverse()`",
        ],
        explanation: "In Python, in-place mutating list methods return `None` to signal the list itself was altered.",
      },
      {
        subtopic: "pop vs remove",
        keywords: ["pop", "remove"],
        prompt: "How do `lst.pop(idx)` and `lst.remove(val)` differ when deleting items from a Python list?",
        correct: "`.pop(idx)` removes by **index** (default last) and **returns** the popped element, while `.remove(val)` deletes the first matching **value** and returns `None`.",
        distractors: [
          "`.pop()` removes all matching values across the list while `.remove()` takes only an index",
          "`.remove()` deletes duplicates everywhere in the list and returns how many were dropped",
          "`.pop(0)` raises `TypeError` because only negative indices work",
        ],
        explanation: "`.pop(index)` works by position and returns the item; `.remove(value)` deletes the first occurrence of that value.",
      },
      {
        subtopic: "copying lists",
        keywords: ["copy", "alias", "shallow"],
        prompt: "Why does `b = a; b.append(99)` also change `a`, and how do you avoid that aliasing bug?",
        correct: "`b = a` only copies the reference to the same list object; use `a.copy()`, `a[:]`, or `list(a)` to create an independent copy.",
        distractors: [
          "`=` always deep-clones lists, so `a` stays unchanged automatically",
          "`b = a` converts `a` into an immutable tuple",
          "Using `b = a + 1` safely clones `a`",
        ],
        explanation: "Assignment copies references, whereas `.copy()` or slicing `[:]` allocates a distinct shallow list.",
      },
      {
        subtopic: "list comprehension",
        keywords: ["comprehension", "filter", "square"],
        prompt: "What does `[n * n for n in range(4) if n % 2 == 0]` evaluate to in Python?",
        correct: "`[0, 4]` — squaring only the even numbers (`0` and `2`) produced by `range(4)` concisely.",
        distractors: [
          "`[0, 1, 4, 9]` ignoring the trailing `if` filter",
          "A syntax error because `if` cannot appear inside `[...]`",
          "`[0, 4, 16]` including `4` in `range(4)`",
        ],
        explanation: "List comprehensions combine mapping and optional filtering inside a compact `[expr for var in iter if cond]` expression.",
      },
    ],
  },
  {
    id: "python_tuples",
    priorityPhrases: ["tuples in python", "tuple methods", "count & index"],
    keywords: ["tuple", "immutability", "count", "index", "unpacking", "single element tuple"],
    questions: [
      {
        subtopic: "immutability",
        keywords: ["immutability", "tuple", "syntax"],
        prompt: "What is the defining constraint of a Python `tuple` compared to a `list`?",
        correct: "Tuples are **immutable** ordered sequences — once created, elements cannot be reassigned, appended, or popped.",
        distractors: [
          "Tuples cannot store duplicate values or negative numbers",
          "Tuples are unordered and cannot be indexed with `[0]`",
          "Tuples can hold at most 2 values",
        ],
        explanation: "Immutability protects fixed records from accidental modification and enables safe hashing.",
      },
      {
        subtopic: "single element tuple",
        keywords: ["single", "syntax", "trailing comma", "empty tuple"],
        prompt: "Why does `t = (5)` create an `int` instead of a 1-element tuple, and how is a 1-element tuple written?",
        correct: "Parentheses alone act as grouping; a trailing comma is required — `t = (5,)` creates a true 1-element `tuple`.",
        distractors: [
          "Python forbids 1-element tuples entirely",
          "You must wrap single values in curly braces `{5}` to make a tuple",
          "Only `tuple[5]` creates a 1-element tuple",
        ],
        explanation: "A comma — not the parentheses alone — defines a single-element tuple in Python (`(5,)`).",
      },
      {
        subtopic: "count",
        keywords: ["count", "tuple methods"],
        prompt: "What does `t.count(2)` return for `t = (2, 7, 2, 9, 2)`?",
        correct: "`3`, counting how many times value `2` appears in the tuple without modifying `t`.",
        distractors: [
          "Index `0`, where `2` appears for the first time",
          "Total length `5` of the entire tuple",
          "A new tuple `(2, 2, 2)`",
        ],
        explanation: "`.count(value)` returns the occurrence count of `value` across the tuple.",
      },
      {
        subtopic: "index",
        keywords: ["index", "tuple methods"],
        prompt: "What does `t.index(9)` return on `t = (2, 7, 9, 9)`, and what happens if the searched value is absent?",
        correct: "It returns `2` (the **first** index where `9` occurs) and raises a `ValueError` if the value is not in `t`.",
        distractors: [
          "It returns `-1` silently when absent, just like `str.find()`",
          "It returns `[2, 3]`, listing every occurrence index",
          "It sorts the tuple first before returning the index",
        ],
        explanation: "`.index(x)` locates the first match of `x` and raises `ValueError` when absent.",
      },
      {
        subtopic: "unpacking & dict keys",
        keywords: ["unpack", "dict key", "hashable", "tuple"],
        prompt: "Why can tuples containing immutable values be used as dictionary keys or inside sets, whereas lists cannot?",
        correct: "Because immutable tuples have a stable hash (`hash()`), whereas mutable lists are unhashable (`TypeError`).",
        distractors: [
          "Because lists consume too much CPU for string comparison",
          "Because dictionaries compress tuples automatically into JSON strings",
          "Because Python deletes duplicate list keys silently without hashing",
        ],
        explanation: "Hash-based containers (`dict`, `set`) require hashable, immutable keys.",
      },
    ],
  },
  {
    id: "python_dicts_sets",
    priorityPhrases: [
      "dictionaries in python",
      "dictionary methods",
      "sets in python",
      "set operations",
      "dictionaries & sets",
      "dictionary operations & methods",
      "dictionary merge",
    ],
    keywords: [
      "dictionary",
      "dictionaries",
      "key-value",
      "keys()",
      "values()",
      "items()",
      "update()",
      ".get(",
      "empty set",
      "set(",
      "union",
      "intersection",
      "difference",
    ],
    questions: [
      {
        subtopic: "keys()",
        keywords: ["keys()", "dictionary methods", "keys"],
        prompt: "What does `d.keys()` return on a Python dictionary `d`?",
        correct: "A dynamic view object containing all dictionary keys (`dict_keys([...])`) that reflects updates to `d` and iterates cleanly.",
        distractors: [
          "A sorted list of dictionary values only",
          "A single boolean indicating whether `d` is empty",
          "Keys and values merged into concatenated strings",
        ],
        explanation: "`d.keys()` yields a live view of every key stored in dictionary `d`.",
      },
      {
        subtopic: "values()",
        keywords: ["values()", "dictionary methods", "values"],
        prompt: "How does `d.values()` differ from `d.keys()` when inspecting a Python dictionary?",
        correct: "`d.values()` returns a view of all **values** (which may contain duplicates), whereas `d.keys()` returns only unique keys.",
        distractors: [
          "`d.values()` deletes duplicate values automatically like a `set`",
          "`d.values()` raises `KeyError` unless every value is an integer",
          "`d.values()` returns `(key, value)` pairs",
        ],
        explanation: "Dictionaries allow duplicate values across distinct keys; `.values()` exposes a view over values alone.",
      },
      {
        subtopic: "items()",
        keywords: ["items()", "dictionary methods", "items"],
        prompt: "What structure does `d.items()` yield when iterating `for k, v in d.items():`?",
        correct: "A view of `(key, value)` 2-element tuples ready for direct tuple unpacking inside loops.",
        distractors: [
          "Only the string keys without their corresponding values",
          "Nested dictionaries keyed by index `0, 1, 2...`",
          "A flattened list alternating keys and values `[k1, v1, k2, v2]`",
        ],
        explanation: "`.items()` produces `(key, value)` pairs ideal for iterating over entries together.",
      },
      {
        subtopic: "update()",
        keywords: ["update()", "dictionary merge", "update"],
        prompt: "When you call `d.update({\"a\": 99, \"c\": 3})` on `d = {\"a\": 1, \"b\": 2}`, what happens to key `\"a\"` and key `\"c\"`?",
        correct: "Existing key `\"a\"` is updated/overwritten to `99`, and missing key `\"c\": 3` is inserted cleanly.",
        distractors: [
          "Key `\"a\"` throws a `KeyError` duplicate conflict",
          "All untouched keys like `\"b\"` are wiped from `d`",
          "`.update()` creates a new dictionary without modifying `d`",
        ],
        explanation: "`.update()` mutates `d` in place by inserting new entries and overwriting values for colliding keys.",
      },
      {
        subtopic: "get() vs []",
        keywords: [".get(", "get()", "keyerror", "dict["],
        prompt: "Why is `user.get(\"phone\")` safer than `user[\"phone\"]` when a key might not exist in the dictionary?",
        correct: "`user.get(\"phone\")` returns `None` (or a specified default) on a missing key, whereas `user[\"phone\"]` raises `KeyError`.",
        distractors: [
          "`user[\"phone\"]` returns `False` while `.get()` deletes the entry",
          "`user.get()` works only on integer keys",
          "`user.get(\"phone\")` automatically inserts `'phone': ''` into the dictionary",
        ],
        explanation: "`.get(key, default)` handles absent keys gracefully without crashing via `KeyError`.",
      },
      {
        subtopic: "properties",
        keywords: ["properties", "key-value", "hashable", "duplicate keys"],
        prompt: "What happens if a Python dictionary literal assigns the same key twice (`{\"a\": 1, \"a\": 2}`)?",
        correct: "Keys are unique; the later assignment overwrites the earlier value so `\"a\"` maps to `2` (and keys remain hashable/O(1) average lookup).",
        distractors: [
          "Python stores `[1, 2]` as a list automatically",
          "A `DuplicateKeyError` crashes at compile time",
          "Dictionaries index elements sequentially like lists via `d[0]`",
        ],
        explanation: "Hash-table backed dictionaries maintain unique keys and O(1) average lookup.",
      },
      {
        subtopic: "empty set",
        keywords: ["empty set", "sets in python", "set(", "{}"],
        prompt: "In Python, why does `s = {}` create a `dict` instead of an empty `set`, and how do you create an empty set?",
        correct: "Empty `{}` historically denotes an empty dictionary literal; you must call `s = set()` to construct an empty set.",
        distractors: [
          "`s = []` creates an empty set",
          "`s = (set)` converts parentheses into a set",
          "`{}` creates a set until a colon `:` is added on line 10",
        ],
        explanation: "`{}` is always an empty `dict`, while `set()` creates an empty set.",
      },
      {
        subtopic: "set uniqueness",
        keywords: ["uniqueness", "sets", "unindexed", "duplicate"],
        prompt: "What happens when you initialize `nums = {1, 2, 2, 3, 1}` as a Python `set`?",
        correct: "Duplicates are automatically discarded, leaving `{1, 2, 3}`, which is unordered/unindexed (`nums[0]` raises `TypeError`).",
        distractors: [
          "All 5 entries stay preserved in insertion order (`len == 5`)",
          "Duplicate elements raise a `ValueError` during creation",
          "`nums[0]` returns `1` just like a list",
        ],
        explanation: "Sets store distinct hashable elements with no duplicate entries and no positional indexing.",
      },
      {
        subtopic: "union intersection difference",
        keywords: ["union", "intersection", "difference", "set operations"],
        prompt: "For `a = {1, 2, 3}` and `b = {3, 4}`, what do `a.union(b)` (`|`), `a.intersection(b)` (`&`), and `a.difference(b)` (`-`) yield?",
        correct: "Union -> `{1, 2, 3, 4}`, intersection -> `{3}`, and difference `a - b` -> `{1, 2}`.",
        distractors: [
          "Intersection yields `{1, 2, 4}` and union repeats `3` twice",
          "`a - b` mutates `b` in place and returns `None`",
          "Set operations require sorting inputs manually first",
        ],
        explanation: "Union merges distinct items (`|`), intersection finds shared items (`&`), and difference keeps items in `a` not in `b` (`-`).",
      },
      {
        subtopic: "remove vs discard & add",
        keywords: ["remove", "discard", "add", "set"],
        prompt: "What is the safety difference between `s.remove(x)` and `s.discard(x)` on a Python `set`?",
        correct: "`s.remove(x)` raises a `KeyError` if `x` is missing, whereas `s.discard(x)` removes `x` if present and does nothing cleanly if absent.",
        distractors: [
          "`s.discard()` deletes the entire set while `s.remove()` clears one random item",
          "`s.remove()` works on indexes while `s.discard()` clears values",
          "`s.discard()` raises `ValueError` unless the set has at least 2 items",
        ],
        explanation: "Use `.discard()` when an element might already be missing to avoid unhandled `KeyError` exceptions.",
      },
    ],
  },
  {
    id: "python_conditionals",
    priorityPhrases: [
      "if, elif, else",
      "conditional statements",
      "if-elif-else",
      "conditionals & spam",
      "conditionals & exceptions",
      "decision control & if",
      "elif ladder",
      "if-else statement",
      "nested if statements",
      "conditionals: practice questions",
      "in & is operators",
    ],
    keywords: [
      "if",
      "elif",
      "else",
      "conditional",
      "branching",
      "spam detector",
      "decision control",
      "in operator",
      "is operator",
      "nested if",
      "truthiness",
    ],
    questions: [
      {
        subtopic: "if-elif-else",
        keywords: ["if", "elif", "else", "ladder", "execution flow"],
        prompt: "In an `if / elif / else` ladder in Python, how many branches execute for a single evaluation?",
        correct: "Only the first branch whose condition evaluates to `True` (or `else` if all prior conditions are `False`).",
        distractors: [
          "Every `elif` branch whose condition is `True` executes sequentially",
          "Both `if` and `else` execute whenever the condition evaluates to `False`",
          "Python executes branches from bottom (`else`) to top (`if`)",
        ],
        explanation: "Python short-circuits an `if / elif / else` chain immediately after running the first matching block.",
      },
      {
        subtopic: "syntax & indentation",
        keywords: ["syntax", "indentation", "colon", "block"],
        prompt: "How does Python determine which statements belong inside an `if`, `elif`, or `else` block?",
        correct: "By consistent indentation (standard 4 spaces) immediately following a trailing colon `:` on the header line.",
        distractors: [
          "By wrapping the conditional statements inside curly braces `{ }`",
          "By ending every conditional block with an explicit `endif;` keyword",
          "By indenting only the final statement inside the conditional",
        ],
        explanation: "Colons `:` open suites and uniform whitespace indentation defines lexical block scope in Python.",
      },
      {
        subtopic: "multiple if vs elif",
        keywords: ["execution flow", "multiple if", "elif"],
        prompt: "What happens if you write three independent `if` statements in a row instead of `if / elif / elif`?",
        correct: "Every `if` condition is tested independently, so multiple blocks can execute in the same pass.",
        distractors: [
          "Python raises a `SyntaxError` unless `elif` separates adjacent `if` lines",
          "Only the final `if` statement is evaluated by the interpreter",
          "All standalone `if` blocks share the final `else` fallback automatically",
        ],
        explanation: "Separate `if` blocks represent independent checks, whereas `elif` chains mutually exclusive alternatives.",
      },
      {
        subtopic: "else fallback",
        keywords: ["else", "fallback", "spam"],
        prompt: "In decision logic (like rejecting non-spam or handling default choices), what is the exact role of the trailing `else:` clause?",
        correct: "It takes **no condition** of its own and acts as the fallback branch only when every preceding `if` and `elif` evaluated to `False`.",
        distractors: [
          "It requires its own parenthesized boolean condition after `else`",
          "It executes before `if` to pre-validate input variables",
          "It runs only if an earlier branch raised an unhandled exception",
        ],
        explanation: "`else:` catches remaining unmatched inputs cleanly without declaring an expression.",
      },
      {
        subtopic: "spam detector & in",
        keywords: ["in operator", "membership", "spam detector", "substring"],
        prompt: "When building a spam detector like `\"buy now\" in comment.lower()`, why use `.lower()` alongside `in`?",
        correct: "The `in` operator is case-sensitive on strings, so `.lower()` ensures capitalized variants like `\"BUY NOW\"` still trigger the rule.",
        distractors: [
          "`in` automatically strips all uppercase letters without `.lower()`",
          "`in` checks identity (`id()`) rather than substring membership",
          "`.lower()` removes punctuation from tuples automatically",
        ],
        explanation: "String membership `sub in text` checks exact casing; normalizing case prevents trivial filter bypasses.",
      },
      {
        subtopic: "is vs == in conditionals",
        keywords: ["is operator", "none", "identity"],
        prompt: "In Python conditional expressions, when should you write `if value is None:` vs `if score == 100:`?",
        correct: "Use `is` / `is not` when comparing object identity (especially against the `None` singleton), and `==` for numeric/value equality.",
        distractors: [
          "Always use `is` for big integers and strings across user inputs",
          "`is` performs faster numeric addition inside `if` headers",
          "`== None` raises a `SyntaxError` in Python 3",
        ],
        explanation: "`None` is a unique singleton (`is None`), while values like numbers and strings are compared with `==`.",
      },
      {
        subtopic: "nested if & truthiness",
        keywords: ["nested if", "truthiness", "and", "empty"],
        prompt: "Which Python values evaluate to **Falsy** when placed directly inside `if value:`?",
        correct: "`False`, `None`, numeric `0`/`0.0`, and empty containers (`\"\"`, `[]`, `()`, `{}`).",
        distractors: [
          "All negative integers (`-1`, `-5`) evaluate to `False`",
          "Only `False` and `None` are falsy; `\"\"` and `0` are truthy",
          "Non-empty lists `[0]` evaluate to `False` because they contain `0`",
        ],
        explanation: "Python treats zero values and empty collections as falsy, while non-empty containers (even `[0]`) are truthy.",
      },
    ],
  },
  {
    id: "python_loops_control",
    priorityPhrases: [
      "while loops",
      "for loops",
      "range function",
      "for loop with else",
      "break statement",
      "continue statement",
      "pass statement",
      "nested loops",
      "star pattern printing",
      "loops & multiplication",
      "loops & iterations",
      "conditionals & loops",
      "while loop",
      "for loop",
    ],
    keywords: [
      "while loop",
      "for loop",
      "range(",
      "break",
      "continue",
      "pass",
      "star pattern",
      "nested loop",
      "loop termination",
      "multiplication table",
      "iteration",
    ],
    questions: [
      {
        subtopic: "while loop",
        keywords: ["while loop", "infinite loop", "while"],
        prompt: "What must be true inside a `while` loop body to avoid an unintended **infinite loop**?",
        correct: "A state variable used inside the `while` condition must update toward making the condition `False` (or trigger an explicit `break`).",
        distractors: [
          "Python automatically halts every `while` loop after 1,000 cycles",
          "`while` loops require declaring a fixed `range()` step on line 1",
          "Indented `print()` statements decrement loop counters automatically",
        ],
        explanation: "Without updating the loop guard or hitting `break`, a `True` condition repeats indefinitely.",
      },
      {
        subtopic: "for loop iteration",
        keywords: ["for loop", "iterating", "list", "tuple", "string"],
        prompt: "How does Python's `for item in sequence:` loop work compared to traditional index counters?",
        correct: "It directly iterates item-by-item over any iterable (`list`, `tuple`, `str`, `dict`, `range`) without manual index incrementing.",
        distractors: [
          "`for` loops only work with integer ranges and crash on strings",
          "`for` reverses the collection automatically on every pass",
          "Modifying `item = 0` inside the loop deletes items from the underlying tuple",
        ],
        explanation: "Python `for` loops follow the iterator protocol directly over iterable containers.",
      },
      {
        subtopic: "range()",
        keywords: ["range(", "start, stop & step", "range"],
        prompt: "What exact sequence of integers does `list(range(1, 10, 2))` generate?",
        correct: "`[1, 3, 5, 7, 9]` — starting at `1`, stepping by `2`, and stopping **before** `10` (`stop` is exclusive).",
        distractors: [
          "`[1, 3, 5, 7, 9, 10]` including `stop` cleanly",
          "`[0, 2, 4, 6, 8]` because step resets `start` to `0`",
          "`[1, 2, 10]` treating parameters as literal elements",
        ],
        explanation: "`range(start, stop, step)` starts inclusively at `start`, increments by `step`, and stops strictly before `stop`.",
      },
      {
        subtopic: "break",
        keywords: ["break", "premature loop exit"],
        prompt: "What is the exact effect of executing a `break` statement inside a loop?",
        correct: "It immediately terminates the innermost enclosing loop and resumes execution at the first statement after the loop.",
        distractors: [
          "It skips only the remaining lines of the current cycle and stays in the loop",
          "It terminates the entire Python process regardless of nesting",
          "It restarts the loop counter back to `0`",
        ],
        explanation: "`break` exits the enclosing loop immediately, skipping any remaining iterations (and skipping any loop `else:` block).",
      },
      {
        subtopic: "continue",
        keywords: ["continue", "skipping current iteration"],
        prompt: "How does `continue` differ from `break` when reached during a loop iteration?",
        correct: "`continue` skips the rest of the **current iteration** and jumps directly to the next loop check/element without exiting the loop.",
        distractors: [
          "`continue` shuts down the loop permanently just like `break`",
          "`continue` acts as an empty placeholder and runs lines directly below it",
          "`continue` skips two iterations ahead by default",
        ],
        explanation: "Use `continue` to bypass the remainder of one pass while continuing subsequent iterations.",
      },
      {
        subtopic: "pass",
        keywords: ["pass", "null operation", "placeholder"],
        prompt: "Why do developers write `pass` inside a loop, function, or class stub in Python?",
        correct: "It serves as a legal **null no-op statement** where syntax requires an indented body that you plan to implement later.",
        distractors: [
          "It prints `'skip'` and advances the outer `for` loop immediately",
          "It automatically marks unit tests as passing in `pytest`",
          "It freezes variable values inside `while` conditions",
        ],
        explanation: "`pass` prevents `IndentationError` on intentionally empty blocks without performing any runtime action.",
      },
      {
        subtopic: "for-else",
        keywords: ["for loop with else", "else", "termination", "break"],
        prompt: "When does the `else:` block attached to a `for` or `while` loop execute in Python?",
        correct: "Only when the loop finishes naturally without hitting a `break` statement.",
        distractors: [
          "Only when a `break` statement triggers early inside the loop",
          "Always after every single iteration completes",
          "Only when the iterable passed to `for` raises a `TypeError`",
        ],
        explanation: "Loop `else:` acts as a 'no-break completed cleanly' clause, useful for search loops.",
      },
      {
        subtopic: "nested loops & star patterns",
        keywords: ["nested loop", "star pattern", "multiplication table", "end="],
        prompt: "When printing a triangle star pattern (`*`, `**`, `***`) with nested loops, why use `print(\"*\", end=\"\")` in the inner loop?",
        correct: "Passing `end=\"\"` prevents automatic newlines after each star so stars stay on one row until the outer loop calls `print()`.",
        distractors: [
          "`end=\"\"` doubles the number of inner loop iterations automatically",
          "Without `end=\"\"`, Python refuses to execute two nested loops together",
          "`end=\"\"` clears previously printed lines above the cursor",
        ],
        explanation: "Nested loops match outer rows to inner columns, and `end=\"\"` prints inline columns before breaking to the next line.",
      },
    ],
  },
  {
    id: "python_functions_recursion",
    priorityPhrases: [
      "functions in python",
      "function arguments",
      "return statement",
      "recursion in python",
      "functions & recursion",
      "functions: core concepts",
      "defining your own function",
      "return vs void",
      "lambda functions",
      "functions as first-class",
      "default arguments",
      "positional arguments",
      "keyword arguments",
      "variable-length arguments",
      "map() function",
      "filter() function",
      "reduce() function",
    ],
    keywords: [
      "def ",
      "function",
      "argument",
      "parameter",
      "default parameter",
      "positional",
      "keyword argument",
      "return",
      "recursion",
      "recursive",
      "base case",
      "lambda",
      "*args",
      "**kwargs",
      "map(",
      "filter(",
      "reduce(",
    ],
    questions: [
      {
        subtopic: "def & reusability",
        keywords: ["def ", "reusability", "call", "defining"],
        prompt: "What happens when Python evaluates `def greet(): ...` vs actually invoking `greet()`?",
        correct: "`def` compiles and binds the reusable function object without running its body until `greet()` is called with parentheses.",
        distractors: [
          "`def` immediately executes all indented lines inside the function at load time",
          "Omitting parentheses (`greet`) still runs the function body and discards the return value",
          "Functions in Python can only be called once per program run",
        ],
        explanation: "Definition binds code cleanly under a callable identifier; parentheses invoke execution.",
      },
      {
        subtopic: "return vs print",
        keywords: ["return", "print(", "void", "none"],
        prompt: "Why is `return result` inside a Python function fundamentally different from `print(result)`?",
        correct: "`return` hands the computed value back to the caller so variables/expressions can reuse it, whereas `print()` only displays text and returns `None`.",
        distractors: [
          "`print()` returns the value to the caller while `return` displays it in the terminal",
          "A function with `return` cannot accept any parameters",
          "`return` repeats the function call automatically three times",
        ],
        explanation: "`return` terminates the call and passes data back to callers; functions without `return` yield `None`.",
      },
      {
        subtopic: "positional & default arguments",
        keywords: ["positional", "default", "keyword", "argument", "parameter"],
        prompt: "In a Python function signature like `def power(base, exp=2):`, which parameter ordering rule is enforced?",
        correct: "Positional/non-default parameters (`base`) must always come **before** parameters with default values (`exp=2`).",
        distractors: [
          "Default parameters (`exp=2`) must appear first before positional arguments",
          "Callers are forbidden from overriding default parameter values cleanly",
          "Default values only accept integer literals, never strings or `None`",
        ],
        explanation: "Syntax requires non-default parameters before defaulted ones so positional bindings stay unambiguous.",
      },
      {
        subtopic: "*args & **kwargs",
        keywords: ["*args", "**kwargs", "variable-length", "keyword arguments"],
        prompt: "Inside `def summarize(*args, **kwargs):`, what data structures do `args` and `kwargs` receive?",
        correct: "`args` collects extra positional arguments into a `tuple`, while `kwargs` collects extra keyword arguments into a `dict`.",
        distractors: [
          "Both `args` and `kwargs` receive sorted sets",
          "`args` receives a dictionary and `kwargs` receives a single concatenated string",
          "`*args` limits a function to a maximum of 2 arguments",
        ],
        explanation: "`*` packs arbitrary positional arguments into a tuple; `**` packs named `key=val` extras into a dict.",
      },
      {
        subtopic: "recursion & base case",
        keywords: ["recursion", "recursive", "base case", "stack"],
        prompt: "What is the mandatory role of a **base case** inside a recursive Python function (e.g., factorial or Fibonacci)?",
        correct: "It stops recursion cleanly when the simplest condition is met; without it, calls recurse endlessly until hitting `RecursionError`.",
        distractors: [
          "It compiles recursive functions into flat SQL loops automatically",
          "It doubles the stack depth limit dynamically inside Python",
          "It ensures recursive calls execute without returning any values",
        ],
        explanation: "Every valid recursive function requires progress toward a terminating base case to prevent stack overflow.",
      },
      {
        subtopic: "lambda",
        keywords: ["lambda", "anonymous", "first-class"],
        prompt: "When is a `lambda` expression (e.g., `lambda x: x * 2`) valid and practical in Python?",
        correct: "For short inline anonymous functions restricted to a single expression, often passed as `key=` or callbacks to `sorted()`, `map()`, or `filter()`.",
        distractors: [
          "When writing multi-statement `try/except` blocks spanning 20 lines",
          "Because `lambda` executes twice as fast by skipping garbage collection",
          "Only inside Python `class` inheritance declarations",
        ],
        explanation: "`lambda` creates concise single-expression callables usable directly as higher-order function arguments.",
      },
      {
        subtopic: "map, filter & reduce",
        keywords: ["map(", "filter(", "reduce(", "first-class", "functools"],
        prompt: "How do Python's higher-order functions `map()`, `filter()`, and `functools.reduce()` differ?",
        correct: "`map()` transforms every element, `filter()` retains items matching a boolean predicate, and `reduce()` folds an iterable cumulatively into one value.",
        distractors: [
          "`map()` creates hash dictionaries exclusively while `filter()` deletes files",
          "`reduce()` runs automatically as a built-in keyword without importing `functools`",
          "`map()` and `filter()` execute mutations directly inside the original tuple",
        ],
        explanation: "`map` transforms 1-to-1, `filter` selects matching subsets, and `functools.reduce` aggregates sequentially.",
      },
    ],
  },
  {
    id: "python_file_io",
    priorityPhrases: [
      "file i/o",
      "file writing & appending",
      "with statement",
      "high score tracker",
      "opening, reading & closing",
      "multiple with",
    ],
    keywords: ["file i/o", "open(", "with open", "context manager", "'w'", "'a'", "readline", "file handling", "close()"],
    questions: [
      {
        subtopic: "open modes",
        keywords: ["'w'", "'a'", "writing", "appending", "truncate"],
        prompt: "What critical difference separates mode `'w'` from mode `'a'` when calling `open(\"log.txt\", mode)`?",
        correct: "`'w'` **truncates/overwrites** existing file contents from zero, whereas `'a'` preserves existing text and **appends** at the end.",
        distractors: [
          "`'w'` reads files securely while `'a'` throws `FileNotFoundError` if missing",
          "Both `'w'` and `'a'` insert new text strictly at the very top (line 1)",
          "`'a'` deletes the file on exit after writing",
        ],
        explanation: "Use `'a'` for logs/append workflows and `'w'` only when intentionally replacing the entire file.",
      },
      {
        subtopic: "context manager (with)",
        keywords: ["with statement", "context manager", "with open", "close"],
        prompt: "Why is `with open(\"notes.txt\", \"r\") as f:` strongly preferred over calling `f = open(...); f.close()` manually?",
        correct: "The `with` context manager guarantees the file handle closes automatically upon exiting the block, even if an exception occurs.",
        distractors: [
          "`with` compresses `.txt` files into `.zip` format automatically",
          "`with` allows opening files without specifying a path string",
          "Calling `open()` without `with` works only for `.py` files",
        ],
        explanation: "Context managers invoke `__exit__()` deterministically so OS file descriptors never leak on errors.",
      },
      {
        subtopic: "read vs readline vs readlines",
        keywords: ["read", "readline", "readlines", "opening"],
        prompt: "How do `f.read()`, `f.readline()`, and `f.readlines()` behave differently when reading a text file?",
        correct: "`read()` returns the entire remaining text as one string, `readline()` reads a single line, and `readlines()` returns a list of lines.",
        distractors: [
          "`readline()` wipes each line after printing it",
          "`readlines()` returns only the line count as an integer",
          "`read()` parses CSV headers into dictionaries automatically",
        ],
        explanation: "Pick `read()` for small whole files, `readline()` or iteration `for line in f:` for streaming large files safely.",
      },
      {
        subtopic: "high score persistence",
        keywords: ["high score", "file i/o", "practice set"],
        prompt: "In a file-backed **High Score Tracker**, what safeguard prevents crashes the very first time or when the file is empty?",
        correct: "Handling an empty string (`content.strip() == \"\"`) or catching `FileNotFoundError` to default the previous high score to `0` before comparing.",
        distractors: [
          "Opening the file in `'r+'` mode without creating it first",
          "Writing strings with `int()` directly without encoding text",
          "Always calling `os.remove()` before checking the score",
        ],
        explanation: "Defensive file handling prevents crashes when reading blank or first-run score files.",
      },
    ],
  },
  {
    id: "python_oop_inheritance",
    priorityPhrases: [
      "object oriented programming",
      "object-oriented programming",
      "__init__() constructor",
      "self parameter",
      "inheritance in python",
      "super() method",
      "class methods",
      "static methods",
      "property decorators",
      "operator overloading",
      "railway booking system",
      "2d/3d vectors",
    ],
    keywords: [
      "oop",
      "class",
      "object",
      "__init__",
      "self",
      "inheritance",
      "super()",
      "@classmethod",
      "@staticmethod",
      "@property",
      "dunder",
      "overloading",
      "getter",
      "setter",
    ],
    questions: [
      {
        subtopic: "class vs object & attributes",
        keywords: ["classes", "objects", "attributes", "oop"],
        prompt: "In Python OOP, how do a **Class Attribute** and an **Instance Attribute** differ during attribute lookup?",
        correct: "A class attribute is shared on the class blueprint across instances unless shadowed by an instance attribute (`self.x`) stored on that specific object.",
        distractors: [
          "Instance attributes affect all objects created from that class simultaneously",
          "Class attributes cannot be accessed through `self` inside methods",
          "Python forbids creating attributes inside instances after construction",
        ],
        explanation: "Lookup checks the instance dictionary (`self.__dict__`) first before falling back to class attributes.",
      },
      {
        subtopic: "__init__ & self",
        keywords: ["__init__", "self parameter", "constructor", "instance methods"],
        prompt: "What are the exact roles of `self` and `__init__(self, ...)` in a Python class?",
        correct: "`self` explicitly references the calling object instance, and `__init__` runs automatically on instantiation to initialize instance attributes.",
        distractors: [
          "`self` is a reserved keyword referring to the parent superclass exclusively",
          "`__init__` destroys unused instances when garbage collection runs",
          "`self` can be omitted on instance methods without breaking `obj.method()`",
        ],
        explanation: "Python implicitly passes the instance as the first argument (`self`) into instance methods and `__init__`.",
      },
      {
        subtopic: "inheritance & super()",
        keywords: ["inheritance", "super()", "single", "multiple", "multilevel", "parent class"],
        prompt: "Why call `super().__init__(...)` inside a subclass's constructor during inheritance?",
        correct: "It cleanly delegates initialization to the parent (or next MRO) class without hardcoding the parent class name, supporting multilevel & multiple inheritance.",
        distractors: [
          "Because subclasses cannot access any inherited methods otherwise",
          "Because `super()` prevents child classes from adding new attributes",
          "`super()` automatically creates multiple background instances of every parent",
        ],
        explanation: "`super()` cooperates with Python's Method Resolution Order (MRO) to run parent initialization cleanly.",
      },
      {
        subtopic: "@classmethod vs @staticmethod",
        keywords: ["@classmethod", "@staticmethod", "class methods", "static methods"],
        prompt: "What separates `@classmethod` from `@staticmethod` in a Python class?",
        correct: "`@classmethod` receives the class `cls` as its first argument (can read/modify class state or act as an alternate constructor), while `@staticmethod` takes neither `self` nor `cls`.",
        distractors: [
          "`@staticmethod` requires calling an object instance first and accesses `self.id`",
          "`@classmethod` runs only once at module import time and cannot take extra args",
          "`@staticmethod` breaks inheritance across child classes",
        ],
        explanation: "`@classmethod` binds to `cls` for class-level behavior; `@staticmethod` groups plain utility logic inside the class namespace.",
      },
      {
        subtopic: "@property",
        keywords: ["@property", "getters", "setters", "property decorators"],
        prompt: "Why use the `@property` decorator (and `@attr.setter`) in Python OOP?",
        correct: "It exposes computed attributes or validated setter logic behind normal dot syntax (`obj.age = 20`) without breaking existing callers.",
        distractors: [
          "It encrypts private fields with SHA-256 automatically",
          "It converts an instance method into a class-wide global constant",
          "It allows mutating `tuple` elements directly",
        ],
        explanation: "`@property` enforces encapsulation and validation while keeping clean attribute-access syntax.",
      },
      {
        subtopic: "operator overloading & dunder",
        keywords: ["operator overloading", "dunder", "magic methods", "vectors", "__add__"],
        prompt: "How do dunder methods like `__add__` and `__str__` enable cleaner 2D/3D `Vector` classes?",
        correct: "`__add__` overloads the `+` operator (`v1 + v2`) for custom math objects, while `__str__` customizes human-readable `print(v)` output.",
        distractors: [
          "Dunder methods double execution speed by compiling Python into C++",
          "Defining `__add__` automatically disables all comparisons like `==`",
          "`__str__` runs only when writing files to binary streams",
        ],
        explanation: "Special (`__dunder__`) methods hook custom classes cleanly into Python's built-in operators and `str()`.",
      },
    ],
  },
  {
    id: "python_exceptions_modern",
    priorityPhrases: [
      "exception handling",
      "try, except, else, finally",
      "walrus operator",
      "match-case",
      "advanced python",
      "conditionals & exceptions",
    ],
    keywords: [
      "try",
      "except",
      "finally",
      "raise",
      "custom exception",
      "walrus",
      "type hints",
      "match-case",
      "match case",
      ":=",
    ],
    questions: [
      {
        subtopic: "try-except-else-finally",
        keywords: ["try", "except", "else", "finally", "exception"],
        prompt: "In a `try / except / else / finally` block, when do `else:` and `finally:` each run?",
        correct: "`else:` runs **only if `try:` succeeded without raising an exception**, whereas `finally:` **always** runs regardless of errors or returns.",
        distractors: [
          "`else:` runs whenever an exception is caught by `except:`",
          "`finally:` executes only when no exception was raised",
          "Using `return` inside `try:` bypasses `finally:` cleanly",
        ],
        explanation: "`else:` isolates success-only logic after `try`, and `finally:` guarantees resource cleanup on all paths.",
      },
      {
        subtopic: "specific exceptions & raise",
        keywords: ["raise", "custom exception", "valueerror", "except"],
        prompt: "Why catch specific exceptions like `except ValueError:` instead of bare `except:` and when use `raise`?",
        correct: "Specific handlers avoid masking unrelated bugs (`KeyboardInterrupt`, typos), and `raise` explicitly signals invalid state or custom domain failures.",
        distractors: [
          "Bare `except:` executes 10x faster inside production API servers",
          "`raise` suppresses stack traces completely so users see blank pages",
          "`ValueError` cannot be subclassed or thrown intentionally",
        ],
        explanation: "Targeted exception handling catches anticipated faults cleanly without swallowing critical system errors.",
      },
      {
        subtopic: "walrus & type hints",
        keywords: ["walrus", ":=", "type hints", "typing"],
        prompt: "What do the **walrus operator** (`:=`) and **type hints** (`def total(xs: list[int]) -> int:`) provide in modern Python 3.8+?",
        correct: "`:=` assigns and evaluates a value mid-expression (e.g., inside `if` / `while`), while type hints document contracts for static linters like mypy/pyright.",
        distractors: [
          "Type hints reject invalid runtime calls automatically by raising `TypeError` natively",
          "`:=` declares immutable constants just like `const` in JavaScript",
          "`:=` creates deep copies of nested dictionaries",
        ],
        explanation: "Walrus avoids redundant calls before conditions; type hints aid IDE safety and static analysis tools.",
      },
      {
        subtopic: "match-case & dict merge",
        keywords: ["match-case", "match case", "dictionary merge"],
        prompt: "In Python 3.10+ structural `match / case` and `dict1 | dict2`, what role does `case _:` play?",
        correct: "`case _:` serves as the wildcard catch-all pattern (when no specific case matches), and `|` merges two dicts into a new dict.",
        distractors: [
          "`match/case` falls through cleanly to all subsequent cases without breaking",
          "`case _:` throws a `MatchError` automatically on integers",
          "`dict1 | dict2` modifies `dict1` in place instead of creating a new dictionary",
        ],
        explanation: "Python `match` does not fall through like C switches; `case _:` matches default fallbacks cleanly.",
      },
    ],
  },
  {
    id: "python_projects",
    priorityPhrases: ["snake, water, gun", "the perfect guess", "perfect guess", "number guessing game"],
    keywords: ["snake", "water", "gun", "perfect guess", "random", "game loop"],
    questions: [
      {
        subtopic: "random choices",
        keywords: ["random", "snake", "perfect guess"],
        prompt: "Which standard library function generates the computer's secret choice cleanly in games like Snake-Water-Gun or Number Guessing?",
        correct: "`random.choice([...])` for discrete moves or `random.randint(1, 100)` for bounded random integers.",
        distractors: [
          "`math.random()` natively without imports",
          "`input()` reading unseeded memory pointers",
          "`set.pop()` on sorted integers",
        ],
        explanation: "Python's `random` module supplies `choice()` and `randint()` cleanly for randomized game turns.",
      },
      {
        subtopic: "game win rules & mapping",
        keywords: ["snake", "water", "gun", "rules", "dict"],
        prompt: "In **Snake, Water, Gun**, why map moves like `{'s': 1, 'w': -1, 'g': 0}` or win-tuples cleanly instead of huge `if/elif` trees?",
        correct: "Clean dictionary mappings/rules prevent copy-paste branch bugs and make draw/win/loss resolution deterministic and extensible.",
        distractors: [
          "Because Python limits `if/elif` chains to 3 choices max",
          "Strings cannot be compared with `==` inside game loops",
          "Dictionaries execute UI graphics automatically",
        ],
        explanation: "Mapping moves cleanly separates user input normalization from deterministic win/loss outcome evaluation.",
      },
      {
        subtopic: "guess loop & hints",
        keywords: ["perfect guess", "loop", "attempts", "hint"],
        prompt: "In **The Perfect Guess**, how does the `while` loop track attempts cleanly while guiding the player?",
        correct: "It loops until `guess == target`, printing `'Higher number please'` / `'Lower number please'` and incrementing `guesses += 1` per valid guess.",
        distractors: [
          "It uses `for i in range(1):` and restarts the OS script manually",
          "It resets `guesses = 0` inside each loop cycle",
          "It ignores user input whenever `guess != target`",
        ],
        explanation: "Comparing `guess` vs `target` gives directional feedback (`O(log n)` strategy) while counting valid tries.",
      },
    ],
  },
  {
    id: "cs50p_python_testing",
    priorityPhrases: ["libraries & unit tests", "unit tests", "pytest", "cs50p"],
    keywords: ["unit test", "pytest", "assert", "libraries", "cs50p", "test case", "pytest.raises"],
    questions: [
      {
        subtopic: "pytest & assert",
        keywords: ["pytest", "assert", "unit test"],
        prompt: "What happens when `pytest` runs a test function containing an `assert fn(2) == 4` expression that evaluates to `False`?",
        correct: "`assert` raises an `AssertionError`, which `pytest` intercepts to report a failed test alongside the exact left/right values.",
        distractors: [
          "`pytest` skips failed assertions unless wrapped in `try/except`",
          "`assert` returns `-1` cleanly to standard output without failing the suite",
          "`assert` deletes the buggy function automatically",
        ],
        explanation: "`assert` triggers `AssertionError` on mismatch, allowing `pytest` to fail fast with diff diagnostics.",
      },
      {
        subtopic: "pytest.raises",
        keywords: ["pytest", "exception", "error", "boundary"],
        prompt: "How do you properly verify inside a `pytest` unit test that invalid input raises `ValueError` or `ZeroDivisionError`?",
        correct: "Wrap the expected failing call inside `with pytest.raises(ValueError):` so the test passes ONLY if that exception occurs.",
        distractors: [
          "Wrap the call in `try: ... except: pass` so errors never fail tests",
          "Print `'Error expected'` above the assertion",
          "Delete assertions for invalid input cases altogether",
        ],
        explanation: "`pytest.raises` turns expected error conditions into deterministic pass/fail assertions.",
      },
      {
        subtopic: "__name__ == __main__",
        keywords: ["__main__", "libraries", "import"],
        prompt: "Why wrap CLI script entry calls in `if __name__ == \"__main__\":` when writing modular Python libraries and unit tests?",
        correct: "It prevents interactive prompts or `main()` side effects from executing when test suites `import` helper functions.",
        distractors: [
          "Because `pytest` refuses to load files missing `main()`",
          "It compiles local functions into global C libraries",
          "It automatically exposes CLI scripts on localhost HTTP ports",
        ],
        explanation: "Guarding `main()` separates importable library functions from script-execution entry behavior.",
      },
      {
        subtopic: "libraries & imports",
        keywords: ["libraries", "sys", "random", "requests", "import"],
        prompt: "Why prefer `import math` or explicit `from random import choice` over `from module import *` in Python projects?",
        correct: "Explicit imports prevent silent name collisions and keep every symbol's origin immediately clear to readers and linters.",
        distractors: [
          "`import *` is invalid syntax in Python 3.10+",
          "`import math` downloads packages from PyPI on every execution",
          "Explicit imports consume 10x more memory than wildcard imports",
        ],
        explanation: "Explicit imports avoid shadowing local/standard identifiers across large codebases.",
      },
      {
        subtopic: "testable design",
        keywords: ["return", "print", "side effect", "unit test"],
        prompt: "Why is it much easier to unit-test a function that **returns** a string/number rather than calling `print()` internally?",
        correct: "Pure return values can be checked directly with `assert fn(x) == expected` without capturing stdout streams.",
        distractors: [
          "Functions with `print()` cannot accept strings or lists as arguments",
          "`assert` can only evaluate integers and crashes on strings",
          "`pytest` forbids testing files that contain any `return` statement",
        ],
        explanation: "Separating pure computation (`return`) from I/O (`print`) makes automated testing clean and reliable.",
      },
    ],
  },
  {
    id: "data_pandas_numpy",
    priorityPhrases: ["pandas data wrangling", "numpy vectorized math", "pandas", "numpy"],
    keywords: ["pandas", "dataframe", "numpy", "ndarray", "vectorized", "broadcasting", "dropna", "groupby"],
    questions: [
      {
        subtopic: "numpy ndarray & vectorization",
        keywords: ["numpy", "ndarray", "vectorized"],
        prompt: "Why is **NumPy** vectorized array math dramatically faster than native Python `for` loops over large datasets?",
        correct: "Contiguous C-typed `ndarray` buffers execute compiled element-wise C loops without per-item Python interpreter boxing overhead.",
        distractors: [
          "NumPy converts numbers into HTML tables automatically before adding",
          "Python `for` loops run strictly sequentially across network sockets",
          "NumPy arrays automatically remove all odd numbers prior to arithmetic",
        ],
        explanation: "Homogeneous typed memory and compiled C/SIMD loops make NumPy orders of magnitude faster on arrays.",
      },
      {
        subtopic: "broadcasting",
        keywords: ["broadcasting", "numpy", "shape"],
        prompt: "What does NumPy **broadcasting** accomplish in expressions like `matrix + np.array([10, 20, 30])`?",
        correct: "It stretches compatible smaller dimensions virtually across the larger shape without allocating duplicated memory copies.",
        distractors: [
          "It transmits array objects over UDP sockets automatically",
          "It drops mismatched columns quietly without raising shape errors",
          "It converts multi-dimensional arrays into 1D strings",
        ],
        explanation: "Broadcasting aligns trailing axes of equal length or size `1` cleanly without data duplication.",
      },
      {
        subtopic: "pandas dataframe & indexing",
        keywords: ["pandas", "dataframe", ".loc", ".iloc"],
        prompt: "How do `.loc[]` and `.iloc[]` differ when slicing a Pandas `DataFrame`?",
        correct: "`.loc[]` selects rows/columns by **index label** (inclusive slice ends), whereas `.iloc[]` uses **0-based integer positions** (exclusive stop).",
        distractors: [
          "`.loc[]` works exclusively on floating-point columns",
          "`.iloc[]` modifies CSV files directly on disk without saving",
          "`.loc[]` ignores column names and accepts only negative positions",
        ],
        explanation: "Use `.loc` for label-based indexing and `.iloc` for strict integer positional indexing.",
      },
      {
        subtopic: "data cleaning & groupby",
        keywords: ["dropna", "fillna", "groupby", "wrangling", "pandas"],
        prompt: "In Pandas data wrangling, how do `fillna()`, `dropna()`, and `groupby().agg()` support analytics pipelines?",
        correct: "`dropna()`/`fillna()` handle `NaN` missing values cleanly, while `groupby().agg()` splits records into buckets to compute grouped summaries (`mean`, `sum`, `count`).",
        distractors: [
          "`dropna()` deletes every string column inside a `DataFrame`",
          "`groupby()` converts numeric columns into unhashable lists",
          "`fillna(0)` raises a `KeyError` unless every column already has nulls",
        ],
        explanation: "Clean missing-value handling paired with split-apply-combine aggregations prepares raw tables reliably.",
      },
    ],
  },
  {
    id: "ai_llm_core",
    priorityPhrases: [
      "llm fundamentals & tokens",
      "prompt engineering",
      "openai vs. gemini vs. claude",
      "openai & anthropic sdks",
      "large language models",
      "tokens & token costs",
      "context window",
      "attention mechanism",
      "transformers",
      "how llms learn: pretraining",
      "fine-tuning",
      "rlhf",
      "ai hallucination",
      "context engineering",
      "model parameters",
      "multimodal ai",
      "reasoning models",
      "small language models",
      "agi vs asi",
      "mcp (model context protocol)",
      "level 5 | mcp",
      "level 1 | ai & llm basics",
    ],
    keywords: [
      "llm",
      "token",
      "prompt",
      "chain-of-thought",
      "cot",
      "context window",
      "attention",
      "transformer",
      "pretraining",
      "fine-tuning",
      "rlhf",
      "hallucination",
      "temperature",
      "anthropic",
      "openai",
      "gemini",
      "mcp",
      "multimodal",
      "reasoning model",
    ],
    questions: [
      {
        subtopic: "tokens",
        keywords: ["token", "token costs", "llm"],
        prompt: "Why are LLM prompts and responses metered and processed in **tokens** rather than whole words or single characters?",
        correct: "Subword tokenizers (BPE/WordPiece) balance compact vocabulary size with handling rare/compound words cleanly; both API latency and billing scale with token count.",
        distractors: [
          "Every token strictly equals 10 fixed English sentences",
          "Only output words consume tokens while massive system prompts are always free",
          "Tokens bypass GPU memory constraints entirely",
        ],
        explanation: "Subword tokens represent words or word fragments (~0.75 words/token) and govern both context limits and cost.",
      },
      {
        subtopic: "context window",
        keywords: ["context window", "context engineering"],
        prompt: "What happens if conversation history, retrieved RAG chunks, and generated tokens exceed an LLM's **context window**?",
        correct: "Older/excess tokens fall outside the attention limit (truncated or triggering API overflow errors), causing the model to forget earlier instructions.",
        distractors: [
          "The model compresses previous files directly onto the client hard drive automatically",
          "Inference speed becomes twice as fast once the limit passes",
          "The model switches automatically from transformer weights to regex",
        ],
        explanation: "The context window bounds total input + output tokens visible per request, requiring intentional context budgeting.",
      },
      {
        subtopic: "prompt engineering & cot",
        keywords: ["prompt", "chain-of-thought", "zero-shot", "few-shot", "structured"],
        prompt: "How do **few-shot examples** and **Chain-of-Thought (CoT)** prompting improve reliability on complex reasoning tasks?",
        correct: "Few-shot examples lock in formatting/style patterns, while CoT encourages step-by-step intermediate decomposition before committing to final conclusions.",
        distractors: [
          "CoT automatically edits and retrains model neural weights mid-request",
          "Few-shot examples reduce token count to zero on repeated calls",
          "CoT eliminates the need for input validation on JSON parsers",
        ],
        explanation: "Intermediate reasoning steps and concrete exemplars reduce logical leaps and format drift.",
      },
      {
        subtopic: "temperature & hallucination",
        keywords: ["temperature", "hallucination", "sampling"],
        prompt: "Why do LLMs sometimes **hallucinate** fabricated facts, and how does lowering `temperature` (`0.0–0.2`) affect outputs?",
        correct: "LLMs predict plausible next tokens rather than querying verified truth; lower temperature narrows sampling toward high-probability tokens for more deterministic replies.",
        distractors: [
          "Lowering temperature connects the LLM directly to live SQL databases",
          "Higher temperature (`1.8`) forces the model to cite real peer-reviewed links",
          "Hallucinations only happen when Python syntax errors exist in the prompt",
        ],
        explanation: "Low temperature tightens deterministic token sampling, while RAG/grounding combats unverified fabrication.",
      },
      {
        subtopic: "transformers & attention",
        keywords: ["attention", "transformer", "self-attention"],
        prompt: "What breakthrough allowed **Transformers** and **self-attention** to surpass older RNN architectures on long text sequences?",
        correct: "Self-attention lets every token directly attend to relevant tokens anywhere in the sequence in parallel without sequential bottlenecks.",
        distractors: [
          "Transformers forbid processing text longer than 16 characters",
          "Attention replaces floating-point weights with string hash tables",
          "Transformers process inputs strictly one character per clock cycle without parallelism",
        ],
        explanation: "Parallel Q/K/V self-attention captures long-range dependencies efficiently on GPUs.",
      },
      {
        subtopic: "pretraining, fine-tuning & rlhf",
        keywords: ["pretraining", "fine-tuning", "rlhf", "alignment"],
        prompt: "How do **Pretraining**, **Supervised Fine-Tuning (SFT)**, and **RLHF** work together in building modern chat models?",
        correct: "Pretraining builds broad language prediction on massive corpora, SFT teaches instruction-following structure, and RLHF aligns helpfulness/safety using human preference rankings.",
        distractors: [
          "Pretraining memorizes private user chat histories exclusively",
          "RLHF removes attention layers to shrink token billing",
          "Fine-tuning is required just to pass system prompt variables via API",
        ],
        explanation: "Each training stage refines raw next-token prediction into aligned, instruction-following behavior.",
      },
      {
        subtopic: "sdks & streaming",
        keywords: ["openai", "anthropic", "gemini", "sdk", "streaming"],
        prompt: "Why enable **streaming** (Server-Sent Events / async token streams) when integrating OpenAI, Gemini, or Anthropic APIs into user UIs?",
        correct: "It cuts Time-To-First-Token (TTFT) dramatically by rendering partial tokens immediately rather than waiting for the entire response.",
        distractors: [
          "Streaming skips billing for generated output tokens",
          "Streaming increases response quality by double-checking tokens offline",
          "Non-streaming SDK calls cannot return structured JSON",
        ],
        explanation: "Token streaming dramatically improves perceived responsiveness on long generations.",
      },
      {
        subtopic: "mcp (model context protocol)",
        keywords: ["mcp", "model context protocol", "tool"],
        prompt: "What problem does **MCP (Model Context Protocol)** solve when connecting AI models to external data sources and tools?",
        correct: "It provides a standardized open protocol for exposing tools, resources, and prompts cleanly across hosts without rewriting custom per-model glue code.",
        distractors: [
          "MCP compiles LLM neural weights into lightweight CSS stylesheets",
          "MCP replaces HTTPS TLS encryption with plaintext UDP packets",
          "MCP prevents models from calling any external APIs",
        ],
        explanation: "MCP acts like a universal connector layer between LLM host apps and external tools/context servers.",
      },
      {
        subtopic: "reasoning & small/multimodal models",
        keywords: ["reasoning", "small language", "multimodal", "slm", "parameters", "agi"],
        prompt: "When choose a **Small Language Model (SLM)** vs a **Reasoning Model** (extended thinking) in production?",
        correct: "SLMs excel at low-latency, low-cost edge or classification tasks, whereas reasoning models allocate extra test-time compute for complex coding, math, and planning.",
        distractors: [
          "SLMs always have higher reasoning accuracy on olympiad math than frontier models",
          "Reasoning models run strictly offline with zero token consumption",
          "Multimodal models can read only CSV tables and never images or audio",
        ],
        explanation: "Right-sizing model tier (SLM vs frontier vs reasoning vs multimodal) balances latency, cost, and accuracy.",
      },
    ],
  },
  {
    id: "ai_agents_langgraph",
    priorityPhrases: [
      "langgraph",
      "langchain",
      "rag & vector databases",
      "rag tutorial",
      "vector databases",
      "supabase vector embeddings",
      "autonomous agents & tools",
      "ai agents",
      "human-in-the-loop",
      "hitl",
      "chat threading",
      "persistence memory",
      "why persistence is required",
      "langsmith",
      "tripmate ai",
      "chatgpt agent",
      "evolution from llms to agentic",
      "pydantic for ai agents",
      "level 2 | ai agents",
      "level 3 | memory",
      "level 4 | rag",
    ],
    keywords: [
      "langgraph",
      "langchain",
      "rag",
      "vector",
      "embedding",
      "chromadb",
      "pgvector",
      "agent",
      "tool calling",
      "persistence",
      "checkpointer",
      "hitl",
      "human-in-the-loop",
      "langsmith",
      "pydantic",
      "conditional workflow",
      "parallel workflow",
      "iterative workflow",
      "sequential workflow",
    ],
    questions: [
      {
        subtopic: "langgraph vs langchain",
        keywords: ["langgraph", "langchain", "stategraph", "cyclic"],
        prompt: "Why is **LangGraph** preferred over simple linear chains when building autonomous, multi-step AI agents?",
        correct: "LangGraph models workflows as stateful cyclic graphs with conditional branching, retry loops, and durable state checkpoints.",
        distractors: [
          "LangGraph runs transformer neural weights directly inside browser localStorage",
          "Linear chains forbid connecting external APIs or vector databases",
          "LangGraph restricts agents to one deterministic prompt turn",
        ],
        explanation: "Agents frequently need loops (tool -> observe -> decide), branching, and persistent state, which graphs model cleanly.",
      },
      {
        subtopic: "rag & embeddings",
        keywords: ["rag", "vector", "embedding", "chromadb", "supabase", "retrieval"],
        prompt: "How does **Retrieval-Augmented Generation (RAG)** with embeddings and a vector DB (`ChromaDB`/`pgvector`) reduce LLM hallucinations?",
        correct: "By retrieving semantically relevant source chunks (`embedding cosine similarity`) at query time and grounding the LLM prompt in fetched evidence.",
        distractors: [
          "By rewriting and retraining base foundation model parameters on every search",
          "By deleting user prompts longer than 20 tokens cleanly",
          "By replacing database lookups with high temperature (`2.0`) sampling",
        ],
        explanation: "RAG anchors answers in up-to-date retrieved documents without expensive continual model retraining.",
      },
      {
        subtopic: "chunking & similarity",
        keywords: ["chromadb", "vector", "supabase", "embedding", "rag"],
        prompt: "Why do RAG ingestion pipelines split documents into **overlapping chunks** before computing vector embeddings?",
        correct: "Chunking fits narrow retrieval precision inside context budgets, while overlap preserves sentences/meaning split across boundaries.",
        distractors: [
          "Because vector databases throw `SyntaxError` on strings shorter than 10,000 characters",
          "Overlap duplicates billing metrics to slow retrieval",
          "Chunking strips all punctuation so keywords become invisible",
        ],
        explanation: "Balanced chunk size + overlap optimizes semantic recall without drowning prompt context.",
      },
      {
        subtopic: "tools & structured schemas",
        keywords: ["tool", "pydantic", "autonomous agent", "function calling"],
        prompt: "What role do **Pydantic schemas** and typed tool docstrings play in reliable AI tool calling?",
        correct: "They tell the LLM exact parameter names/constraints and strictly validate returned JSON arguments before touching databases or APIs.",
        distractors: [
          "They train brand-new LLM parameters automatically inside SQLite",
          "They suppress runtime TypeErrors so corrupt arguments pass silently",
          "They convert PDF files into raw PNG pixels",
        ],
        explanation: "Strict schema validation prevents brittle parsing failures when models invoke backend tools.",
      },
      {
        subtopic: "persistence & chat threading",
        keywords: ["persistence", "checkpointer", "threading", "memory", "thread_id"],
        prompt: "Why do production LangGraph agents attach a database **checkpointer** (`thread_id`) for persistence and chat threading?",
        correct: "Each conversation thread checkpoints `State` after every node step, enabling multi-turn memory, crash recovery, and isolated user sessions.",
        distractors: [
          "Checkpointers erase chat history after every turn to force stateless restarts",
          "Threading forces every user to share one single global message array",
          "Persistence eliminates the need for LLM API keys",
        ],
        explanation: "`thread_id` + persistent checkpointing restore exact graph state across turns and server restarts.",
      },
      {
        subtopic: "human-in-the-loop (hitl)",
        keywords: ["hitl", "human-in-the-loop", "interrupt", "approval"],
        prompt: "How does **Human-in-the-Loop (HITL)** using `interrupt` protect high-risk agent actions (e.g., emails, payments, deletions)?",
        correct: "Execution pauses cleanly at a checkpoint before running the sensitive tool, waits for human approval/edits, and resumes seamlessly from saved state.",
        distractors: [
          "HITL executes all destructive tools first and asks the user afterward",
          "HITL blocks the server process globally for every other user on the site",
          "HITL deletes state memory whenever a user pauses a workflow",
        ],
        explanation: "Checkpointed interrupts let humans inspect or override high-impact tool calls before execution.",
      },
      {
        subtopic: "conditional, parallel & iterative workflows",
        keywords: ["conditional workflow", "parallel workflow", "iterative workflow", "sequential workflow"],
        prompt: "When building LangGraph flows, how do **conditional edges**, **parallel fan-out**, and **iterative evaluator loops** differ?",
        correct: "Conditional edges route dynamically based on state; parallel branches run independent tasks concurrently; iterative loops refine outputs until passing quality checks.",
        distractors: [
          "Parallel graphs forbid merging branch outputs back into shared state",
          "Iterative loops run indefinitely because conditional termination edges are illegal",
          "Sequential workflows require at least 5 separate Redis clusters",
        ],
        explanation: "Graph topologies combine sequential stages, conditional routing, concurrent fan-out, and critic-refinement cycles.",
      },
      {
        subtopic: "langsmith observability",
        keywords: ["langsmith", "monitor", "observability", "trace"],
        prompt: "What concrete visibility does **LangSmith** add when debugging or monitoring an Agentic Chatbot or TripMate/ChatGPT project?",
        correct: "Step-by-step execution traces capturing prompt inputs, tool calls, token counts, latency bottlenecks, errors, and evaluation datasets.",
        distractors: [
          "It renders frontend CSS grid animations inside React components",
          "It hosts PostgreSQL vector migrations on port 5432 automatically",
          "It replaces model weights with local cached responses offline",
        ],
        explanation: "Observability tracing isolates which prompt, retriever chunk, or tool step caused latency or bad answers.",
      },
      {
        subtopic: "multi-agent & full-stack integration",
        keywords: ["multi-agent", "fastapi", "sqlalchemy", "aws", "groq", "render"],
        prompt: "In full-stack AI apps (like **ChatGPT/TripMate Agent** with **FastAPI**, **SQLAlchemy**, **ChromaDB**, and **AWS/Docker**), how do layers collaborate?",
        correct: "FastAPI exposes async API/streaming endpoints, LangGraph orchestrates agents + ChromaDB RAG, SQLAlchemy/Postgres persists user & thread data, and Docker/AWS handles deployment.",
        distractors: [
          "ChromaDB serves frontend React SSR pages directly to mobile browsers",
          "SQLAlchemy computes transformer matrix multiplications on CPU",
          "AWS S3 executes live Python LangGraph loops synchronously without containers",
        ],
        explanation: "Clean separation across API layer, agent graph, vector/relational persistence, and containerized hosting keeps AI apps maintainable.",
      },
    ],
  },
  {
    id: "fastapi_backend",
    priorityPhrases: [
      "fastapi async services",
      "fastapi endpoints",
      "postgres indexing & locks",
      "docker compose orchestration",
      "redis caching strategies",
      "rate limiting & auth",
      "microservice architecture",
      "production deployment",
      "streaming llm responses",
      "ci/cd deployment",
      "full-stack architecture",
    ],
    keywords: [
      "fastapi",
      "postgres",
      "indexing",
      "locks",
      "docker",
      "redis",
      "caching",
      "rate limiting",
      "microservice",
      "ci/cd",
      "github actions",
      "streaming",
    ],
    questions: [
      {
        subtopic: "fastapi async",
        keywords: ["fastapi", "async", "await", "uvicorn", "endpoints"],
        prompt: "Why can calling blocking synchronous network/DB drivers inside a `FastAPI` `async def` route hurt concurrency?",
        correct: "Blocking calls stall the single asyncio event loop thread, freezing concurrent requests until the synchronous call returns.",
        distractors: [
          "`async def` spawns a fresh dedicated VM per incoming HTTP header",
          "FastAPI automatically turns synchronous `requests.get()` into non-blocking coroutines",
          "Pydantic rejects JSON inputs inside `async def` handlers",
        ],
        explanation: "Keep `async def` routes non-blocking with async I/O (`httpx`, async DB pools) or run sync I/O via threadpools.",
      },
      {
        subtopic: "postgres indexing & locks",
        keywords: ["postgres", "indexing", "locks", "b-tree", "deadlock"],
        prompt: "How do **B-tree indexes** and row-level **locks** (`SELECT ... FOR UPDATE`) affect PostgreSQL workloads?",
        correct: "Indexes speed up selective lookups (`O(log N)`) at some write overhead, while row locks prevent concurrent double-spend races (requiring consistent lock order to avoid deadlocks).",
        distractors: [
          "Adding B-tree indexes to every column guarantees faster `INSERT` throughput with zero storage cost",
          "`SELECT ... FOR UPDATE` reads dirty uncommitted data from crashed transactions",
          "PostgreSQL locks the entire database globally for every `SELECT` query",
        ],
        explanation: "Index high-cardinality query columns thoughtfully and keep transaction locks short and consistently ordered.",
      },
      {
        subtopic: "redis caching",
        keywords: ["redis", "caching", "ttl", "cache"],
        prompt: "What happens in a **cache-aside (lazy-loading)** Redis pattern when data updates in PostgreSQL without invalidating the cached key?",
        correct: "Readers keep receiving stale cached values until the Redis key's **TTL** expires or an explicit `DEL`/update happens on write.",
        distractors: [
          "PostgreSQL pushes binary WAL updates straight into Redis keys automatically",
          "Redis crashes with `MemoryError` whenever Postgres commits an `UPDATE`",
          "Cache-aside automatically writes unvalidated user sessions to SQL",
        ],
        explanation: "Cache-aside delivers fast reads while requiring intentional TTL sizing and write invalidation.",
      },
      {
        subtopic: "rate limiting & auth",
        keywords: ["rate limiting", "auth", "jwt", "token bucket"],
        prompt: "Why combine **sliding-window/token-bucket rate limiting** (e.g., in Redis) with signed authentication (`JWT` / server sessions) on API gateways?",
        correct: "Per-IP/per-user rate limits block abusive scraping/bursts before hitting expensive LLM or DB paths, while auth verifies identity & RBAC permissions.",
        distractors: [
          "JWT tokens automatically drop brute-force TCP packets at layer 2",
          "Rate limiting permanently deletes verified user profiles after 5 requests",
          "Auth middleware caches other users' private secrets inside public CDN headers",
        ],
        explanation: "Distributed rate limiting protects downstream compute while strict auth verification enforces access boundaries.",
      },
      {
        subtopic: "docker compose & ci/cd",
        keywords: ["docker", "ci/cd", "github actions", "deploy", "production"],
        prompt: "Why pair multi-stage **Docker** builds + Compose **`healthcheck`** with **GitHub Actions CI/CD** pipelines?",
        correct: "Multi-stage images shrink attack surface & container size, healthchecks enforce startup readiness ordering, and CI runs automated tests/builds before deploy.",
        distractors: [
          "Docker Compose `depends_on` waits for databases to finish seeding even without healthchecks",
          "Multi-stage builds expose build-time `.env` secrets safely to browser JS",
          "GitHub Actions disables production rollbacks whenever tests pass",
        ],
        explanation: "Lean multi-stage containers, readiness probes, and automated CI gates ensure repeatable zero-surprise deployments.",
      },
      {
        subtopic: "microservices",
        keywords: ["microservice", "architecture", "full-stack", "service"],
        prompt: "What major trade-off arises when splitting a monolith into distributed **microservices**?",
        correct: "Teams gain independent scaling and deploys per service, at the cost of network latency, distributed tracing, and eventual consistency (no single ACID join).",
        distractors: [
          "Microservices eliminate all network serialization and error handling overhead",
          "Splitting code into 10 containers automatically solves single-database lock bottlenecks",
          "Microservices prohibit asynchronous queues or event buses",
        ],
        explanation: "Distributed boundaries solve team/scale isolation while introducing operational and consistency complexity.",
      },
    ],
  },
  {
    id: "system_design",
    priorityPhrases: [
      "database sharding & replication",
      "cache invalidation patterns",
      "asynchronous message queues",
      "horizontal vs vertical scaling",
      "load balancers & reverse proxies",
    ],
    keywords: [
      "sharding",
      "replication",
      "cache invalidation",
      "message queues",
      "horizontal",
      "vertical scaling",
      "load balancer",
      "reverse proxy",
      "cdn",
      "consistent hashing",
    ],
    questions: [
      {
        subtopic: "load balancers & reverse proxies",
        keywords: ["load balancer", "reverse proxy", "health check", "l7"],
        prompt: "Beyond distributing requests across healthy backends, what roles does an L7 **Reverse Proxy / Load Balancer** handle?",
        correct: "TLS termination, path/header routing, rate limiting, gzip/brotli compression, and removing unhealthy nodes via health checks.",
        distractors: [
          "Compiling SQL schemas dynamically on every HTTP GET",
          "Storing all mutable user session data inside local browser cookies without secrets",
          "Allowing broken instances to receive 100% of traffic during crashes",
        ],
        explanation: "L7 proxies terminate TLS cleanly and route HTTP traffic safely away from degraded instances.",
      },
      {
        subtopic: "horizontal vs vertical scaling",
        keywords: ["horizontal", "vertical", "scaling", "stateless"],
        prompt: "Why must application servers be **stateless** (externalizing sessions/uploads) to scale **horizontally** reliably?",
        correct: "Any request may hit any backend node behind a load balancer, whereas vertical scaling simply upgrades CPU/RAM on one machine up to hardware ceilings.",
        distractors: [
          "Horizontal scaling prevents using more than one database replica",
          "Vertical scaling requires rewriting REST APIs into GraphQL",
          "Stateless servers store local SQLite files directly in memory per pod",
        ],
        explanation: "Externalizing state allows elastically adding/removing commodity instances under load.",
      },
      {
        subtopic: "sharding & replication",
        keywords: ["sharding", "replication", "consistent hashing", "database"],
        prompt: "How do **Read Replication** and **Sharding** scale databases differently?",
        correct: "Replication copies full data to follower replicas to scale **reads** cleanly, while sharding partitions rows across servers to scale massive **writes & storage**.",
        distractors: [
          "Replication eliminates write lag across continents instantaneously",
          "Sharding makes cross-shard JOIN queries faster than single-node lookups",
          "Both terms simply describe adding extra RAM to a single SQLite file",
        ],
        explanation: "Replicas relieve read bottlenecks; sharding splits write/storage capacity horizontally using carefully chosen shard keys.",
      },
      {
        subtopic: "cache invalidation",
        keywords: ["cache invalidation", "cache stampede", "ttl", "write-through"],
        prompt: "How can systems mitigate a **cache stampede (thundering herd)** when a popular cached key expires?",
        correct: "Using request coalescing (singleflight locks), staggered TTL jitter, or proactive background refresh before hard expiry.",
        distractors: [
          "Disabling caching globally during peak traffic windows",
          "Dropping all incoming user requests with HTTP 500 permanently",
          "Setting TTL = 0 seconds on every Redis key",
        ],
        explanation: "Preventing thousands of simultaneous cache-miss DB rebuilds protects origin databases under bursts.",
      },
      {
        subtopic: "message queues",
        keywords: ["message queues", "asynchronous", "dlq", "backpressure"],
        prompt: "Why decouple slow tasks (video encoding, emails, webhooks) using **Asynchronous Message Queues** + **Dead-Letter Queues (DLQ)**?",
        correct: "Producers respond fast while workers smooth traffic bursts (backpressure) with retries, isolating repeatedly failing jobs in a DLQ instead of losing or blocking queues.",
        distractors: [
          "Message queues force browsers to wait synchronously until batch processing finishes",
          "DLQs automatically discard successful messages immediately",
          "Queues forbid multiple consumer workers from processing distinct partitions",
        ],
        explanation: "Queues absorb traffic spikes gracefully and isolate poison messages in DLQs for inspection.",
      },
      {
        subtopic: "cdn & edge caching",
        keywords: ["cdn", "edge", "cache", "latency"],
        prompt: "How does a **CDN (Content Delivery Network)** cut latency and protect origin servers under global traffic?",
        correct: "It caches static assets and cacheable API responses at geographically close edge PoPs, reducing RTT and origin load.",
        distractors: [
          "It compiles server SQLite queries into browser CSS rules",
          "It routes every image fetch directly back to a single primary database",
          "It disables TLS encryption on edge servers automatically",
        ],
        explanation: "CDNs serve cacheable content from edge locations close to end users, relieving origin infrastructure.",
      },
      {
        subtopic: "consistent hashing",
        keywords: ["consistent hashing", "sharding", "ring", "partition"],
        prompt: "Why do distributed caches and sharded stores use **Consistent Hashing** instead of `hash(key) % N`?",
        correct: "Adding or removing a server only remaps roughly `1/N` keys instead of triggering a near-total cache miss storm across every node.",
        distractors: [
          "Because `%` fails to return integers inside modern CPUs",
          "Consistent hashing replicates 100% of every key onto every single shard",
          "It eliminates network sockets completely between microservices",
        ],
        explanation: "Consistent hashing minimizes key movement when cluster topology scales up or down.",
      },
      {
        subtopic: "cap theorem & trade-offs",
        keywords: ["cap theorem", "consistency", "availability", "partition"],
        prompt: "Under **CAP Theorem** during a network partition (`P`), what trade-off must a distributed store choose?",
        correct: "Between strict linearizable **Consistency (CP)** (rejecting stale writes/reads) and high **Availability (AP)** (serving possibly stale replicas).",
        distractors: [
          "Between SQL table names and camelCase JSON keys",
          "Disabling both disk storage and TCP connections permanently",
          "Requiring every microservice to run in a single browser tab",
        ],
        explanation: "Network partitions are unavoidable in distributed systems, forcing explicit CP vs AP design choices.",
      },
    ],
  },
  {
    id: "excel_analytics",
    priorityPhrases: [
      "pivot tables & slicers",
      "power query transformations",
      "excel ai workflows",
      "formulas & cell referencing",
      "xlookup & nested logic",
    ],
    keywords: ["excel", "pivot", "slicers", "power query", "xlookup", "cell referencing", "$a$1", "formula"],
    questions: [
      {
        subtopic: "cell referencing",
        keywords: ["cell referencing", "formula", "$a$1"],
        prompt: "What happens when copying formula `=B2*$C$1` down 10 rows in Excel?",
        correct: "`B2` adjusts relatively (`B3, B4...`) while `$C$1` remains locked via **absolute referencing** onto row 1 column C.",
        distractors: [
          "`$C$1` increments to `$C$2, $C$3...` while `B2` freezes",
          "Excel treats `$` as literal currency formatting text",
          "Both coordinates convert automatically to `0` on copy",
        ],
        explanation: "Prefixing column and/or row with `$` locks coordinates across dragged/copied formulas.",
      },
      {
        subtopic: "xlookup & nested logic",
        keywords: ["xlookup", "nested logic", "if", "ifs"],
        prompt: "Which major advantages make `XLOOKUP` superior to legacy `VLOOKUP` in modern Excel?",
        correct: "It looks left or right cleanly, defaults to exact match, survives column insertions, and includes an inline `[if_not_found]` parameter.",
        distractors: [
          "`XLOOKUP` requires hardcoding fragile column index integers (`3`, `4`)",
          "`XLOOKUP` only searches alphabetically sorted data ascending",
          "`VLOOKUP` supports looking leftward cleanly without `INDEX/MATCH`",
        ],
        explanation: "`XLOOKUP` decouples lookup/return ranges explicitly, eliminating off-by-column breakage.",
      },
      {
        subtopic: "pivot tables & slicers",
        keywords: ["pivot", "slicers", "timelines"],
        prompt: "How do **Slicers** and **Report Connections** supercharge multi-chart **Pivot Table** dashboards?",
        correct: "Slicers provide visual interactive filter buttons that can link simultaneously to multiple PivotTables/PivotCharts sharing the same data model.",
        distractors: [
          "Slicers permanently overwrite and delete unfiltered rows from raw data tabs",
          "PivotTables cannot compute sums or counts unless VBA macros run first",
          "Slicers only work inside Power Query scripts without UI buttons",
        ],
        explanation: "Connected Slicers drive synchronized multi-visual filtering dynamically with zero raw-data mutation.",
      },
      {
        subtopic: "power query",
        keywords: ["power query", "transformations", "unpivot", "etl"],
        prompt: "Why perform cleaning tasks (removing blanks, **Unpivoting** crosstabs, merging files) inside **Power Query** rather than editing cells manually?",
        correct: "Power Query records repeatable, non-destructive M-code steps so future monthly files refresh cleanly with one click.",
        distractors: [
          "Power Query permanently locks Excel files into read-only PDFs",
          "Unpivoting converts tidy column tables into unreadable XML blobs",
          "Power Query forces users to re-type steps manually each month",
        ],
        explanation: "Repeatable ETL transforms automate recurring cleaning workflows reproducibly.",
      },
      {
        subtopic: "excel ai workflows",
        keywords: ["excel ai", "copilot", "python in excel"],
        prompt: "What safeguard is essential when generating formulas, Python scripts, or summaries using **Excel AI / Copilot**?",
        correct: "Auditing the generated formula syntax, `$` absolute references, edge rows, and totals against source cells rather than trusting outputs blindly.",
        distractors: [
          "Disabling formula bars globally so users cannot verify formulas",
          "Converting all numeric tables into uneditable screenshots",
          "Deleting raw data tabs immediately after prompting AI",
        ],
        explanation: "AI speeds formula drafting, while human validation ensures column boundaries and edge cases stay exact.",
      },
      {
        subtopic: "excel tables & dynamic ranges",
        keywords: ["table", "structured reference", "pivot", "refresh"],
        prompt: "Why format source data as an **Excel Table (`Ctrl+T`)** before building PivotTables or formulas?",
        correct: "Structured Tables expand automatically when new rows arrive so PivotTables and SUMIFS/XLOOKUP formulas include fresh records on refresh.",
        distractors: [
          "Tables prevent sorting or filtering numeric columns cleanly",
          "Tables convert every cell value into static text strings",
          "PivotTables require deleting headers before summarizing data",
        ],
        explanation: "Excel Tables auto-expand range boundaries, eliminating broken hardcoded ranges like `A1:D50`.",
      },
      {
        subtopic: "iferror & data validation",
        keywords: ["iferror", "sumifs", "countifs", "formula"],
        prompt: "How do `SUMIFS` / `COUNTIFS` paired with `IFERROR` improve dashboard reliability?",
        correct: "`SUMIFS`/`COUNTIFS` aggregate multi-criteria slices dynamically while `IFERROR` replaces noisy `#N/A` or `#DIV/0!` errors with clean defaults.",
        distractors: [
          "`IFERROR` silently alters non-error math calculations",
          "`SUMIFS` supports only one condition column maximum",
          "`#DIV/0!` errors automatically delete surrounding worksheet charts",
        ],
        explanation: "Multi-criteria aggregations with clean error fallback prevent cascading `#N/A` dashboard breaks.",
      },
      {
        subtopic: "pivot grouping & calculated fields",
        keywords: ["pivot", "grouping", "timeline", "date"],
        prompt: "Why use **Timeline Slicers** and **Date Grouping** (Months, Quarters, Years) inside a PivotTable?",
        correct: "They aggregate daily transaction dates cleanly into time periods without cluttering raw tables with helper columns.",
        distractors: [
          "Grouping converts dates permanently into binary images",
          "Timelines overwrite every formula on separate summary sheets",
          "PivotTables can group dates only if stored alphabetically as weekday names",
        ],
        explanation: "Native Pivot date grouping and Timelines streamline time-series reporting interactively.",
      },
    ],
  },
  {
    id: "cybersecurity_hacking",
    priorityPhrases: [
      "vulnerability analysis",
      "web exploitation & sqli",
      "privilege escalation",
      "network reconnaissance",
      "port scanning & nmap",
    ],
    keywords: [
      "vulnerability",
      "sqli",
      "sql injection",
      "privilege escalation",
      "reconnaissance",
      "osint",
      "nmap",
      "port scanning",
      "hacking",
    ],
    questions: [
      {
        subtopic: "network reconnaissance & osint",
        keywords: ["reconnaissance", "osint", "passive"],
        prompt: "How does **passive reconnaissance (OSINT)** differ from **active reconnaissance** in authorized penetration testing?",
        correct: "Passive OSINT inspects public records (DNS, WHOIS, certificate transparency logs) without sending traffic to target hosts; active probing interacts directly.",
        distractors: [
          "Passive recon injects SQL payloads directly into login forms",
          "Active recon leaves zero packets on target firewalls or IDS logs",
          "OSINT skips checking public DNS records entirely",
        ],
        explanation: "Separating passive OSINT from active probing shapes stealth, authorization boundaries, and attack-surface mapping.",
      },
      {
        subtopic: "nmap & port scanning",
        keywords: ["nmap", "port scanning", "-ss", "syn"],
        prompt: "Why do security testers frequently prefer Nmap's `-sS` (TCP SYN half-open) + `-sV` flags during authorized scans?",
        correct: "`-sS` identifies open TCP ports quickly without finishing full 3-way handshakes, while `-sV` probes banners to reveal exact running software versions.",
        distractors: [
          "`-sS` automatically patches vulnerable services across subnets",
          "`-sV` exploits kernel drivers blindly without checking ports",
          "`-sS` scans strictly UDP ports without sending SYN packets",
        ],
        explanation: "Port states paired with service versions highlight exposed surfaces and outdated software targets.",
      },
      {
        subtopic: "web exploitation & sqli",
        keywords: ["sqli", "sql injection", "web exploitation", "parameterized"],
        prompt: "What root flaw causes **SQL Injection (SQLi)**, and what defense permanently neutralizes it?",
        correct: "Untrusted input concatenated directly into SQL strings alters query syntax; **parameterized queries (prepared statements)** bind inputs strictly as literal data.",
        distractors: [
          "Replacing `<script>` tags in CSS fixes SQL syntax vulnerabilities",
          "Using client-side JavaScript maxLength attributes secures database queries completely",
          "Switching from GET to POST bodies eliminates SQL parsing execution",
        ],
        explanation: "Prepared statements separate SQL query compilation from untrusted user parameter values.",
      },
      {
        subtopic: "vulnerability analysis & cvss",
        keywords: ["vulnerability", "cvss", "cve"],
        prompt: "Why verify exploitability context alongside **CVSS severity scores** during vulnerability analysis?",
        correct: "Real risk depends on network reachability, authentication barriers, asset criticality, and active mitigations — not just a generic static score.",
        distractors: [
          "Higher CVE years automatically outweigh reachable critical remote code flaws",
          "Internal non-routable services cannot ever be leveraged for lateral movement",
          "Scanners eliminate false positives without manual validation",
        ],
        explanation: "Contextual triage separates theoretical alerts from actionable high-impact attack paths.",
      },
      {
        subtopic: "privilege escalation",
        keywords: ["privilege escalation", "suid", "sudo", "root"],
        prompt: "On Linux hosts, why do misconfigured `sudo -l` rules or writable **`SUID` binaries / cron scripts** lead to privilege escalation?",
        correct: "Low-privileged users can execute elevated commands or inject payloads that run under `root` UID permissions.",
        distractors: [
          "Because `SUID` encrypts `/etc/passwd` hashes cleanly",
          "Because `sudo -l` grants users read-only manpages exclusively",
          "Privilege escalation only works via physical USB keyloggers",
        ],
        explanation: "Auditing SUID binaries, `sudo` permissions, and scheduled root jobs catches common vertical escalation flaws.",
      },
      {
        subtopic: "xss & browser security",
        keywords: ["xss", "web exploitation", "csp", "sanitize"],
        prompt: "How does **Cross-Site Scripting (XSS)** occur in web apps, and what blocks it effectively?",
        correct: "Unsanitized user text injected into HTML/DOM executes arbitrary JavaScript in victims' browsers; **context-aware output encoding**, CSP, and `HttpOnly` cookies mitigate it.",
        distractors: [
          "XSS happens exclusively when SQL passwords lack uppercase symbols",
          "Renaming routes from `.html` to `.php` eliminates DOM injection risks",
          "Removing HTTPS certificates stops reflected XSS scripts cleanly",
        ],
        explanation: "Escaping untrusted output per context (HTML/attribute/JS) paired with CSP stops script execution.",
      },
      {
        subtopic: "authentication & broken access control (idor)",
        keywords: ["idor", "access control", "vulnerability", "authorization"],
        prompt: "What vulnerability allows `?invoice_id=1042` to expose another customer's invoice when **authorization checks** only verify login?",
        correct: "**Broken Object Level Authorization (IDOR)** — the server checks authentication (`who you are`) but fails to enforce ownership (`what you may access`).",
        distractors: [
          "Purely a harmless CSS layout alignment bug",
          "Buffer overflow inside the user's GPU monitor driver",
          "DNS cache poisoning at the local Wi-Fi router",
        ],
        explanation: "Every resource endpoint must verify object ownership or RBAC permissions server-side, never just login state.",
      },
      {
        subtopic: "tls & least privilege hardening",
        keywords: ["vulnerability", "hardening", "least privilege", "defense"],
        prompt: "Why does enforcing the **Principle of Least Privilege (PoLP)** contain breach blast radius after an initial compromise?",
        correct: "Compromised services and accounts hold only minimal scoped permissions needed for their task, blocking trivial lateral movement or root takeover.",
        distractors: [
          "Granting every microservice `Administrator`/`root` simplifies firewall auditing cleanly",
          "Least privilege disables encrypted HTTPS connections inside internal subnets",
          "PoLP exposes plaintext passwords inside environment backups",
        ],
        explanation: "Strict permission scoping restricts what an attacker can reach even if one component falls.",
      },
    ],
  },
  {
    id: "web_nextjs_react",
    priorityPhrases: [
      "server actions",
      "streaming with suspense",
      "app router",
      "react server components",
      "next.js",
    ],
    keywords: [
      "next.js",
      "nextjs",
      "react",
      "use client",
      "server action",
      "suspense",
      "prisma",
      "tailwind",
      "app router",
      "ssr",
    ],
    questions: [
      {
        subtopic: "rsc vs use client",
        keywords: ["use client", "server component", "react"],
        prompt: "In Next.js App Router, when should a component include `'use client'` vs remaining a **Server Component**?",
        correct: "Use `'use client'` only for interactive browser state/effects/event handlers (`useState`, `onClick`), keeping data fetching and secret logic on the server.",
        distractors: [
          "Add `'use client'` at the top of every file including database Prisma files",
          "Server Components run inside browser WebWorkers without Node/server access",
          "Client Components allow importing raw `.env` database passwords directly cleanly",
        ],
        explanation: "Pushing `'use client'` to leaf interactive boundaries keeps bundles small and server queries secure.",
      },
      {
        subtopic: "streaming & suspense",
        keywords: ["suspense", "streaming", "ssr"],
        prompt: "How does wrapping async sections in `<Suspense fallback={...}>` improve Next.js page UX?",
        correct: "Fast shell/static content streams immediately to the browser while slower async components flush progressive HTML chunks as they resolve.",
        distractors: [
          "Suspense freezes the browser tab until all API calls complete globally",
          "Suspense converts REST calls into peer-to-peer WebRTC connections",
          "Suspense skips rendering loading skeletons entirely",
        ],
        explanation: "Streaming SSR with Suspense removes whole-page waterfalls and improves First Contentful Paint.",
      },
      {
        subtopic: "server actions & validation",
        keywords: ["server action", "mutation", "zod", "revalidatetag"],
        prompt: "What critical security practice is mandatory inside **Next.js Server Actions** handling user form submissions?",
        correct: "Re-verify user authentication and validate `FormData`/JSON payloads server-side (e.g., Zod) before mutating DB records or calling `revalidatePath`.",
        distractors: [
          "Rely purely on HTML `required` attributes since Server Actions run hidden from HTTP POST",
          "Store admin role flags cleanly in unencrypted `localStorage` headers",
          "Disable CSRF and input schema parsing for faster mutations",
        ],
        explanation: "Server Actions are public HTTP endpoints underneath and always require server-side auth + schema validation.",
      },
    ],
  },
];

function scoreBankMatch(bank: TopicQuestionBank, titleLower: string, bodyLower: string): number {
  let score = 0;
  for (const phrase of bank.priorityPhrases || []) {
    if (titleLower.includes(phrase)) score += 14;
    else if (bodyLower.includes(phrase)) score += 7;
  }
  for (const kw of bank.keywords) {
    if (containsKeyword(titleLower, kw)) score += 6;
    else if (containsKeyword(bodyLower, kw)) score += 2;
  }
  return score;
}

function scoreQuestionSpecificity(
  q: RawTopicMCQ,
  subtopics: string[],
  titleLower: string,
  bodyLower: string
): number {
  let score = 0;
  const sub = (q.subtopic || "").toLowerCase();

  for (const st of subtopics) {
    if (sub && (sub.includes(st) || st.includes(sub))) {
      score += 18;
    }
    if ((q.keywords || []).some((kw) => kw.toLowerCase().includes(st) || st.includes(kw.toLowerCase()))) {
      score += 14;
    }
  }

  for (const kw of q.keywords || []) {
    if (containsKeyword(titleLower, kw)) score += 10;
    else if (containsKeyword(bodyLower, kw)) score += 4;
  }

  return score;
}

function buildContextDerivedFallbackQuestions(
  ctx: LessonQuizContext,
  alreadyPrompts: Set<string>,
  needed: number,
  targetTotal: number,
  existingCount: number,
  seed: number,
  startSeconds: number,
  endSeconds: number,
  subtopics: string[]
): SynthesizedQuizQuestion[] {
  const cleanTitle = normalizeTopicText(ctx.title) || ctx.title.trim() || "Core Lesson Concepts";
  const courseHead = (ctx.courseTitle || "this course").split(/[|–—]/)[0].trim();
  const takeaways = (ctx.keyTakeaways || []).filter((t) => typeof t === "string" && t.trim().length > 10);
  const definitions = (ctx.importantDefinitions || []).filter((d) => typeof d === "string" && d.trim().length > 10);

  const summarySource = [ctx.summary || "", ctx.description || "", ctx.transcriptExcerpt || ""]
    .join(" ")
    .replace(/Spoken highlights from video:\s*/gi, "")
    .replace(/["“”]/g, (m) => (m === '"' ? '"' : '"'))
    .replace(/\s+/g, " ")
    .trim();

  const isTemplateFluff = (sentence: string) =>
    /^(in this lesson,?\s*master|segment overview\s*\[|this \d+-minute lesson breaks down|curriculum progression:|key focus areas include|connects directly into|core module taught from|explore .+?\(\d+:\d+)/i.test(
      sentence.trim()
    );

  const summarySentences = summarySource
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/^["']+|["']+$/g, "").trim())
    .filter((s) => s.length >= 28 && s.length <= 210 && !isTemplateFluff(s));

  const isTechDomain =
    /\b(python|javascript|typescript|react|next\.?js|fastapi|sql|postgres|redis|docker|api|code|coding|programming|algorithm|function|variable|git|linux|backend|frontend|agent|llm|ai|cybersecurity|exploit|nmap|sharding|database|excel|formula|power query)\b/i.test(
      `${cleanTitle} ${courseHead} ${summarySource}`
    );

  const candidates: RawTopicMCQ[] = [];

  for (const defLine of definitions.slice(0, 3)) {
    const colonIdx = defLine.indexOf(":");
    const term = colonIdx > 0 ? defLine.slice(0, colonIdx).trim() : cleanTitle;
    const defBody = colonIdx > 0 ? defLine.slice(colonIdx + 1).trim() : defLine;
    candidates.push({
      prompt: `In "${cleanTitle}", what accurately defines **${term}**?`,
      correct: defBody,
      distractors: isTechDomain
        ? [
            `An anti-pattern that bypasses input checks and stores everything in unvalidated global state`,
            `A deprecated legacy syntax disallowed inside modern ${courseHead} modules`,
            `A purely cosmetic label unrelated to how ${cleanTitle} operates`,
          ]
        : [
            `An outdated myth that ignores the core principles taught in "${cleanTitle}"`,
            `A decorative label with no practical effect on ${courseHead} outcomes`,
            `A shortcut that skips foundational accuracy and core context in "${cleanTitle}"`,
          ],
      explanation: `${term}: ${defBody}`,
    });
  }

  for (const tk of takeaways.slice(0, 4)) {
    candidates.push({
      prompt: isTechDomain
        ? `Which engineering practice reflects a key takeaway from "${cleanTitle}"?`
        : `Which key takeaway accurately reflects what is taught in "${cleanTitle}"?`,
      correct: tk,
      distractors: isTechDomain
        ? [
            `Skipping validation constraints and ignoring edge cases under production traffic`,
            `Duplicating unstructured scripts rather than designing modular boundaries`,
            `Swallowing exceptions silently so faults remain invisible to callers`,
          ]
        : [
            `Skipping foundational steps and applying concepts without checking the surrounding context`,
            `Ignoring quality criteria and feedback signals covered in ${courseHead}`,
            `Relying on guesswork rather than the structured methods shown in "${cleanTitle}"`,
          ],
      explanation: `Key takeaway highlighted in this lesson: ${tk}`,
    });
  }

  for (let sIdx = 0; sIdx < Math.min(4, summarySentences.length); sIdx++) {
    const sent = summarySentences[sIdx];
    candidates.push({
      prompt: `According to "${cleanTitle}" (${sIdx === 0 ? "overview" : `key point ${sIdx + 1}`}), which statement is accurate?`,
      correct: sent,
      distractors: isTechDomain
        ? [
            `Relying strictly on hardcoded trial-and-error without structured verification`,
            `Removing error handling and boundaries once basic syntax runs once`,
            `Mixing unrelated concerns and unvalidated inputs inline`,
          ]
        : [
            `Avoiding structured steps altogether in favor of unverified assumptions`,
            `Treating "${cleanTitle}" as irrelevant to real-world outcomes in ${courseHead}`,
            `Ignoring primary constraints and context emphasized by the instructor`,
          ],
      explanation: sent,
    });
  }

  for (const sub of subtopics.slice(0, 5)) {
    candidates.push({
      prompt: isTechDomain
        ? `When applying **${sub}** covered inside "${cleanTitle}", what principle keeps implementations reliable?`
        : `How should you apply **${sub}** effectively when studying "${cleanTitle}"?`,
      correct: isTechDomain
        ? `Structuring ${sub} with clear contracts, explicit boundary/edge-case handling, and testable verification.`
        : `Understanding the purpose of ${sub}, checking key constraints and context, and applying it consistently in practice.`,
      distractors: isTechDomain
        ? [
            `Leaving ${sub} unvalidated and relying on accidental side effects across files`,
            `Bypassing documentation and ignoring failure conditions in ${sub}`,
            `Duplicating raw ${sub} state globally without clear boundaries`,
          ]
        : [
            `Using ${sub} randomly without checking goals, audience, or context`,
            `Ignoring core constraints and best practices demonstrated for ${sub}`,
            `Skipping verification or review after applying ${sub}`,
          ],
      explanation: `Every topic covered in ${cleanTitle} (including ${sub}) relies on structured application and context checks.`,
    });
  }

  candidates.push(
    {
      prompt: `What is the central objective of "${cleanTitle}" in ${courseHead}?`,
      correct:
        summarySentences[0] && summarySentences[0].length <= 180
          ? summarySentences[0]
          : isTechDomain
            ? `Understanding core mechanics, practical patterns, and verifiable workflows behind ${cleanTitle}.`
            : `Mastering the core concepts, principles, and practical application behind ${cleanTitle}.`,
      distractors: isTechDomain
        ? [
            `Skipping foundational behavior and copying unverified snippets blindly`,
            `Disabling runtime validation and ignoring error paths altogether`,
            `Treating ${cleanTitle} as isolated theory disconnected from project structure`,
          ]
        : [
            `Memorizing isolated buzzwords without understanding practical application`,
            `Skipping core principles and ignoring feedback or constraints`,
            `Treating ${cleanTitle} as unrelated to broader ${courseHead} goals`,
          ],
      explanation: `Mastering ${cleanTitle} builds both conceptual clarity and practical execution across ${courseHead}.`,
    },
    {
      prompt: isTechDomain
        ? `When testing or reviewing work after "${cleanTitle}", what habit catches mistakes fastest?`
        : `When reviewing or applying skills from "${cleanTitle}", what habit ensures strong results?`,
      correct: isTechDomain
        ? `Checking boundary inputs, inspecting intermediate states, and validating outputs systematically across realistic cases.`
        : `Checking requirements against real examples, verifying edge cases, and iterating based on concrete outcomes.`,
      distractors: [
        `Ignoring failure or feedback cases so subtle mistakes remain hidden`,
        `Changing unrelated parts blindly without testing what actually broke`,
        `Skipping review checks completely after a single quick attempt`,
      ],
      explanation: `Systematic review and validation catch subtle mistakes quickly when applying ${cleanTitle}.`,
    }
  );

  const built: SynthesizedQuizQuestion[] = [];
  for (let i = 0; i < candidates.length && built.length < needed; i++) {
    const c = candidates[i];
    if (alreadyPrompts.has(c.prompt)) continue;
    alreadyPrompts.add(c.prompt);
    built.push(
      buildRotatedMCQ(
        c,
        seed + 1,
        existingCount + built.length,
        targetTotal,
        startSeconds,
        endSeconds
      )
    );
  }
  return built;
}

/**
 * Deterministically synthesizes a content-proportional set (3..12) of topic-accurate MCQs
 * covering EVERY sub-topic taught inside a specific lesson.
 */
export function synthesizeLessonQuizQuestions(
  ctx: LessonQuizContext,
  desiredCount?: number
): SynthesizedQuizQuestion[] {
  const targetCount = desiredCount ?? computeRecommendedQuizCount(ctx);
  const startSeconds = Math.max(0, Number(ctx.startSeconds ?? 0));
  const durFallback = Math.max(60, Number(ctx.durationSeconds ?? 600));
  const endSeconds = Math.max(startSeconds + 60, Number(ctx.endSeconds ?? startSeconds + durFallback));
  const partOffset = extractPartOffset(ctx.title);
  const seed = (ctx.lessonIndex ?? 0) + partOffset;

  const normalizedTitle = normalizeTopicText(ctx.title).toLowerCase();
  const subtopics = extractLessonSubtopics(ctx);
  const fullBody = [
    ctx.description || "",
    ctx.summary || "",
    ...(ctx.keyTakeaways || []),
    ...(ctx.importantDefinitions || []),
    ctx.chapterTitle || "",
    ctx.courseTitle || "",
    ctx.transcriptExcerpt || "",
  ]
    .join(" ")
    .toLowerCase();

  const rawRanked = TOPIC_QUESTION_BANKS.map((bank) => ({
    bank,
    bankScore: scoreBankMatch(bank, normalizedTitle, fullBody),
  }))
    .filter((item) => item.bankScore >= 4)
    .sort((a, b) => b.bankScore - a.bankScore);

  const topBankScore = rawRanked[0]?.bankScore ?? 0;
  const rankedBanks = rawRanked.filter(
    (item) => topBankScore < 14 || item.bankScore >= 8
  );

  interface ScoredCandidate {
    raw: RawTopicMCQ;
    bankId: string;
    bankRank: number;
    specScore: number;
    orderTie: number;
  }

  const allCandidates: ScoredCandidate[] = [];
  rankedBanks.forEach(({ bank, bankScore }, bIdx) => {
    const bankLen = bank.questions.length;
    const rot = bankLen > 0 ? partOffset % bankLen : 0;
    for (let j = 0; j < bankLen; j++) {
      const q = bank.questions[(j + rot) % bankLen];
      const spec = scoreQuestionSpecificity(q, subtopics, normalizedTitle, fullBody);
      allCandidates.push({
        raw: q,
        bankId: bank.id,
        bankRank: bIdx,
        specScore: bankScore + spec,
        orderTie: j,
      });
    }
  });

  const selectedRaw: RawTopicMCQ[] = [];
  const usedPrompts = new Set<string>();

  // Pass 1: Cover EVERY extracted sub-topic from title/agenda first (topic-breadth guarantee)
  for (const sub of subtopics) {
    if (selectedRaw.length >= targetCount) break;
    let bestForSub: ScoredCandidate | null = null;
    let bestSubScore = -1;

    for (const cand of allCandidates) {
      if (usedPrompts.has(cand.raw.prompt)) continue;
      const candSub = (cand.raw.subtopic || "").toLowerCase();
      const kwMatch = (cand.raw.keywords || []).some((k) => {
        const kl = k.toLowerCase();
        return kl === sub || sub.includes(kl) || kl.includes(sub);
      });
      const subMatch = candSub && (candSub.includes(sub) || sub.includes(candSub));
      const promptMatch = containsKeyword(cand.raw.prompt.toLowerCase(), sub);
      if (subMatch || kwMatch || promptMatch) {
        const matchStrength = cand.specScore + (subMatch ? 20 : 0) + (kwMatch ? 12 : 0);
        if (matchStrength > bestSubScore) {
          bestSubScore = matchStrength;
          bestForSub = cand;
        }
      }
    }

    if (bestForSub) {
      usedPrompts.add(bestForSub.raw.prompt);
      selectedRaw.push(bestForSub.raw);
    }
  }

  // Pass 2: Round-robin across matched banks (preferring highest specificity score inside each bank)
  const candidatesByBank = rankedBanks.map(({ bank }) =>
    allCandidates
      .filter((c) => c.bankId === bank.id)
      .sort((a, b) => b.specScore - a.specScore || a.orderTie - b.orderTie)
  );

  let addedInPass = true;
  while (selectedRaw.length < targetCount && addedInPass) {
    addedInPass = false;
    for (const bucket of candidatesByBank) {
      if (selectedRaw.length >= targetCount) break;
      const nextCand = bucket.find((c) => !usedPrompts.has(c.raw.prompt));
      if (nextCand) {
        usedPrompts.add(nextCand.raw.prompt);
        selectedRaw.push(nextCand.raw);
        addedInPass = true;
      }
    }
  }

  // Convert selected raw MCQs using total target count so timestamps span evenly 12%..92%
  const output: SynthesizedQuizQuestion[] = [];

  if (selectedRaw.length < targetCount) {
    const derived = buildContextDerivedFallbackQuestions(
      ctx,
      usedPrompts,
      targetCount - selectedRaw.length,
      targetCount,
      selectedRaw.length,
      seed,
      startSeconds,
      endSeconds,
      subtopics
    );
    const actualTotal = selectedRaw.length + derived.length;
    selectedRaw.forEach((raw, idx) => {
      output.push(buildRotatedMCQ(raw, seed, idx, actualTotal, startSeconds, endSeconds));
    });
    // Adjust derived timestamps relative to actualTotal cleanly
    derived.forEach((dq, idx) => {
      const qIdx = selectedRaw.length + idx;
      const span = Math.max(30, endSeconds - startSeconds);
      const ratio = actualTotal <= 1 ? 0.5 : 0.12 + (qIdx / Math.max(1, actualTotal - 1)) * 0.8;
      output.push({
        ...dq,
        replayTimestampSeconds: Math.max(0, Math.floor(startSeconds + span * ratio)),
      });
    });
  } else {
    selectedRaw.slice(0, targetCount).forEach((raw, idx) => {
      output.push(buildRotatedMCQ(raw, seed, idx, targetCount, startSeconds, endSeconds));
    });
  }

  return output.slice(0, targetCount);
}

/**
 * Generates a content-proportional quiz (`3..12` questions covering ALL lesson sub-topics) via
 * external LLM when configured, seamlessly topping up or falling back to `synthesizeLessonQuizQuestions`.
 */
export async function generateLessonQuizQuestions(
  ctx: LessonQuizContext,
  desiredCount?: number
): Promise<SynthesizedQuizQuestion[]> {
  const targetCount = desiredCount ?? computeRecommendedQuizCount(ctx);
  const subtopics = extractLessonSubtopics(ctx);
  const provider = await resolveAIProvider();
  const isExternalLLM = isExternalAIProvider(provider);

  if (isExternalLLM) {
    try {
      const cleanTitle = normalizeTopicText(ctx.title) || ctx.title;
      const startSeconds = Math.max(0, Number(ctx.startSeconds ?? 0));
      const durFallback = Math.max(60, Number(ctx.durationSeconds ?? 600));
      const endSeconds = Math.max(startSeconds + 60, Number(ctx.endSeconds ?? startSeconds + durFallback));
      const span = Math.max(30, endSeconds - startSeconds);

      const prompt = `Create ${targetCount} high-quality multiple-choice quiz questions testing EVERY concept taught in this lecture:
Course: ${ctx.courseTitle || "Course"}
Chapter/Day: ${ctx.chapterTitle || "Module"}
Lecture Title: ${cleanTitle}
Topics Covered: ${subtopics.join(", ") || cleanTitle}
Description/Summary: ${(ctx.summary || ctx.description || "").slice(0, 700)}
${ctx.keyTakeaways?.length ? `Key Takeaways:\n- ${ctx.keyTakeaways.slice(0, 5).join("\n- ")}` : ""}
${ctx.transcriptExcerpt ? `Transcript Excerpt:\n"${ctx.transcriptExcerpt.slice(0, 1200)}"` : ""}

Requirements:
- Generate ${targetCount} distinct questions so ALL topics covered above are represented proportionally.
- Each question MUST be technical, accurate, and grounded strictly in this lecture's content.
- Each question MUST have exactly 4 distinct options and valid correctOptionIndex (0-3).
- Vary correctOptionIndex across questions and write a clear 1-sentence explanation.`;

      const schema = `{
  "questions": [
    {
      "questionText": "string",
      "options": ["option A", "option B", "option C", "option D"],
      "correctOptionIndex": 0,
      "explanation": "string"
    }
  ]
}`;

      const parsed = await Promise.race([
        provider.generateJSON<{
          questions?: {
            questionText?: string;
            options?: string[];
            correctOptionIndex?: number;
            explanation?: string;
          }[];
        }>(prompt, schema),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 9000)),
      ]);

      if (parsed?.questions && Array.isArray(parsed.questions)) {
        const valid = parsed.questions
          .filter(
            (q) =>
              typeof q?.questionText === "string" &&
              q.questionText.trim().length > 10 &&
              Array.isArray(q.options) &&
              q.options.length === 4 &&
              q.options.every((o) => typeof o === "string" && o.trim().length > 0) &&
              typeof q.correctOptionIndex === "number" &&
              q.correctOptionIndex >= 0 &&
              q.correctOptionIndex <= 3
          )
          .slice(0, targetCount)
          .map((q, idx, arr) => {
            const ratio = arr.length <= 1 ? 0.5 : 0.12 + (idx / Math.max(1, arr.length - 1)) * 0.8;
            return {
              questionText: q.questionText!.trim(),
              options: q.options!.map((o) => o.trim()),
              correctOptionIndex: q.correctOptionIndex!,
              explanation: (q.explanation || `Directly covered in "${cleanTitle}".`).trim(),
              replayTimestampSeconds: Math.max(0, Math.floor(startSeconds + span * ratio)),
            };
          });

        if (valid.length >= targetCount) {
          return valid;
        }
        if (valid.length >= 2) {
          const fallbackPool = synthesizeLessonQuizQuestions(ctx, targetCount);
          const seenPrompts = new Set(valid.map((v) => v.questionText.toLowerCase()));
          for (const extra of fallbackPool) {
            if (valid.length >= targetCount) break;
            if (!seenPrompts.has(extra.questionText.toLowerCase())) {
              seenPrompts.add(extra.questionText.toLowerCase());
              valid.push(extra);
            }
          }
          return valid.slice(0, targetCount);
        }
      }
    } catch {
      // Seamlessly fall back to content-proportional concept synthesis
    }
  }

  return synthesizeLessonQuizQuestions(ctx, targetCount);
}

const QUIZ_INCLUDE = {
  options: {
    orderBy: { optionIndex: "asc" as const },
    select: { optionIndex: true, optionText: true },
  },
};

const inFlightQuizCreation = new Map<
  string,
  ReturnType<typeof runEnsureLessonQuizzesInDb>
>();

async function runEnsureLessonQuizzesInDb(
  lessonId: string,
  ctx: LessonQuizContext,
  options?: { forceRefresh?: boolean; desiredCount?: number }
) {
  if (!options?.forceRefresh) {
    const existing = await prisma.quizQuestion.findMany({
      where: { lessonId },
      orderBy: { orderIndex: "asc" },
      include: QUIZ_INCLUDE,
    });
    if (existing.length > 0) {
      return existing;
    }
  }

  const generated = await generateLessonQuizQuestions(ctx, options?.desiredCount);

  const questionRows: Array<{
    id: string;
    lessonId: string;
    orderIndex: number;
    questionText: string;
    correctOptionIndex: number;
    explanation: string;
    replayTimestampSeconds: number;
  }> = [];
  const optionRows: Array<{
    id: string;
    questionId: string;
    optionIndex: number;
    optionText: string;
  }> = [];

  for (let qIdx = 0; qIdx < generated.length; qIdx++) {
    const q = generated[qIdx];
    const questionId = randomUUID();
    questionRows.push({
      id: questionId,
      lessonId,
      orderIndex: qIdx,
      questionText: q.questionText,
      correctOptionIndex: q.correctOptionIndex,
      explanation: q.explanation,
      replayTimestampSeconds: q.replayTimestampSeconds,
    });
    for (let optIdx = 0; optIdx < q.options.length; optIdx++) {
      optionRows.push({
        id: randomUUID(),
        questionId,
        optionIndex: optIdx,
        optionText: q.options[optIdx],
      });
    }
  }

  if (options?.forceRefresh) {
    await prisma.$transaction([
      prisma.quizQuestion.deleteMany({ where: { lessonId } }),
      prisma.quizQuestion.createMany({ data: questionRows }),
      prisma.quizOption.createMany({ data: optionRows }),
    ]);
  } else {
    const recheck = await prisma.quizQuestion.findMany({
      where: { lessonId },
      orderBy: { orderIndex: "asc" },
      include: QUIZ_INCLUDE,
    });
    if (recheck.length > 0) {
      return recheck;
    }

    await prisma.$transaction([
      prisma.quizQuestion.createMany({ data: questionRows }),
      prisma.quizOption.createMany({ data: optionRows }),
    ]);
  }

  return prisma.quizQuestion.findMany({
    where: { lessonId },
    orderBy: { orderIndex: "asc" },
    include: QUIZ_INCLUDE,
  });
}

/**
 * Self-heals (or refreshes) any lesson's `QuizQuestion`s in PostgreSQL using content-proportional
 * sizing (3..12 questions) and atomic non-interactive transactions safe for Supabase pooler.
 */
export async function ensureLessonQuizzesInDb(
  lessonId: string,
  ctx: LessonQuizContext,
  options?: { forceRefresh?: boolean; desiredCount?: number }
) {
  const cacheKey = `${lessonId}:${options?.forceRefresh ? "refresh" : "heal"}`;
  const existingPromise = inFlightQuizCreation.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = runEnsureLessonQuizzesInDb(lessonId, ctx, options).finally(() => {
    inFlightQuizCreation.delete(cacheKey);
  });
  inFlightQuizCreation.set(cacheKey, promise);
  return promise;
}
