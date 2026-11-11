import { prisma } from "@/lib/db";
import { getAIProvider } from "@/lib/ai/aiProvider";

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
  lessonIndex?: number;
  transcriptExcerpt?: string | null;
}

interface RawTopicMCQ {
  prompt: string;
  correct: string;
  distractors: [string, string, string];
  explanation: string;
  tags?: string[];
}

interface TopicQuestionBank {
  id: string;
  keywords: string[];
  priorityPhrases?: string[];
  questions: RawTopicMCQ[];
}

function normalizeTopicText(raw = ""): string {
  return raw
    .replace(/^(Module\s*\d+(\.\d+)?|Chapter\s*\d+|Day\s*\d+|Project\s*\d+)\s*[:\-–]\s*/i, "")
    .replace(/\(\s*Part\s*\d+\s*\)/gi, "")
    .replace(/^\d+[\.\:\-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPartOffset(rawTitle = ""): number {
  const m = rawTitle.match(/Part\s*(\d+)/i) || rawTitle.match(/Module\s*(\d+)\.(\d+)/i);
  if (!m) return 0;
  return Number.parseInt(m[m.length - 1] || "1", 10) || 0;
}

function buildRotatedMCQ(
  raw: RawTopicMCQ,
  seed: number,
  qIndex: number,
  startSeconds: number,
  endSeconds: number
): SynthesizedQuizQuestion {
  const span = Math.max(30, endSeconds - startSeconds);
  const fraction = [0.18, 0.42, 0.66, 0.85][qIndex % 4];
  const targetIdx = Math.abs(seed + qIndex) % 4;
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
    replayTimestampSeconds: Math.max(0, Math.floor(startSeconds + span * fraction)),
  };
}

/**
 * Rich multi-domain curriculum question bank anchored to exact technical concepts taught in each class.
 */
const TOPIC_QUESTION_BANKS: TopicQuestionBank[] = [
  {
    id: "python_conditionals",
    priorityPhrases: ["if, elif, else", "conditional statements", "if-elif-else", "conditionals & spam", "conditionals & exceptions"],
    keywords: ["if", "elif", "else", "conditional", "branching", "spam detector", "decision control"],
    questions: [
      {
        prompt: "In an `if / elif / else` ladder in Python, how many branches execute for a single evaluation?",
        correct: "Only the first branch whose condition evaluates to True (or `else` if all prior conditions are False).",
        distractors: [
          "Every `elif` branch whose condition is True executes sequentially",
          "Both `if` and `else` execute whenever the condition evaluates to False",
          "Python executes branches from bottom (`else`) to top (`if`)",
        ],
        explanation: "Python short-circuits an `if / elif / else` chain after executing the first matching branch.",
      },
      {
        prompt: "How does Python determine which statements belong inside an `if` or `elif` block?",
        correct: "By consistent indentation (commonly 4 spaces) immediately following a colon `:`.",
        distractors: [
          "By wrapping the conditional statements inside curly braces `{ }`",
          "By ending every conditional block with an explicit `endif;` keyword",
          "By indenting only the final line of the conditional block",
        ],
        explanation: "Python uses colons `:` and uniform indentation instead of braces to define block scope.",
      },
      {
        prompt: "What happens if you write several independent `if` statements instead of `if / elif / else`?",
        correct: "Every `if` condition is tested independently, so multiple blocks can run in the same pass.",
        distractors: [
          "Python raises a SyntaxError unless at least one `elif` separates them",
          "Only the very last `if` statement is evaluated by the interpreter",
          "All independent `if` statements automatically share one `else` fallback",
        ],
        explanation: "Separate `if` statements are unrelated checks, whereas `elif` links mutually exclusive alternatives.",
      },
      {
        prompt: "When building a rule like a spam keyword detector (`\"buy now\" in message`), what is the role of the final `else` clause?",
        correct: "It serves as the default fallback when none of the preceding `if` or `elif` conditions matched.",
        distractors: [
          "It runs before `if` to pre-validate the user input type",
          "It requires its own boolean expression in parentheses after `else`",
          "It only runs if every previous `elif` raised a runtime exception",
        ],
        explanation: "`else` catches all remaining cases without taking a condition of its own.",
      },
    ],
  },
  {
    id: "python_in_is_operators",
    priorityPhrases: ["in & is operators", "in and is"],
    keywords: ["is operator", "in operator", "membership", "identity", "none check"],
    questions: [
      {
        prompt: "What is the key difference between `==` and `is` in Python?",
        correct: "`==` compares object values for equality, while `is` checks whether two variables point to the same object in memory.",
        distractors: [
          "`==` only works on integers, whereas `is` only compares strings",
          "`is` compares object values, while `==` checks memory addresses",
          "They are exact aliases and always produce identical results on lists",
        ],
        explanation: "`is` checks object identity (`id(a) == id(b)`), whereas `==` checks value equality.",
      },
      {
        prompt: "What does the `in` operator return when evaluated inside a Python `if` condition?",
        correct: "`True` if the target value exists inside the string, list, tuple, set, or dictionary keys; otherwise `False`.",
        distractors: [
          "The zero-based index position where the element was found",
          "A new list containing all matching elements",
          "An exception whenever the searched value is missing",
        ],
        explanation: "Membership operators (`in` / `not in`) return a boolean indicating presence in a sequence or collection.",
      },
      {
        prompt: "When checking if a variable holds `None` in Python conditionals, which idiom follows best practice?",
        correct: "Using `if value is None:` rather than `if value == None:`",
        distractors: [
          "Using `if None in value:` for every type",
          "Using `if value = None:` inside the conditional header",
          "Casting `str(value) == 'empty'` before checking",
        ],
        explanation: "`None` is a singleton object in Python, so identity comparison (`is None`) is fast and idiomatic.",
      },
      {
        prompt: "If `a = [1, 2]` and `b = [1, 2]`, what do `(a == b)` and `(a is b)` evaluate to?",
        correct: "`a == b` is `True` because values match, while `a is b` is `False` because they are two distinct list objects.",
        distractors: [
          "Both expressions evaluate to `True` for all lists",
          "Both expressions evaluate to `False` unless `b` is sorted",
          "`a == b` is `False` while `a is b` is `True`",
        ],
        explanation: "Two separate list literals hold equal items (`==`) at different memory locations (`is` is `False`).",
      },
    ],
  },
  {
    id: "python_operators",
    priorityPhrases: ["arithmetic, assignment, comparison, logical", "relational & logical operators"],
    keywords: ["operators", "arithmetic", "assignment", "comparison", "relational", "logical", "modulo", "floor division"],
    questions: [
      {
        prompt: "What is the result of floor division `7 // 2` versus standard division `7 / 2` in Python 3?",
        correct: "`7 // 2` evaluates to integer `3`, whereas `7 / 2` evaluates to float `3.5`.",
        distractors: [
          "Both `7 // 2` and `7 / 2` evaluate to `3.5`",
          "`7 // 2` returns the remainder `1`, while `7 / 2` returns `3`",
          "`7 // 2` throws a ZeroDivisionError on odd numbers",
        ],
        explanation: "`/` performs floating-point division in Python 3, while `//` truncates down to the floor integer.",
      },
      {
        prompt: "How do Python logical operators `and`, `or`, and `not` evaluate conditional expressions?",
        correct: "`and` requires both operands True, `or` succeeds if at least one is True, and `not` inverts truthiness.",
        distractors: [
          "Python uses `&&`, `||`, and `!` keywords exclusively for boolean logic",
          "`or` returns `True` only when both operands are identical",
          "`and` always evaluates the right operand even if the left operand is `False`",
        ],
        explanation: "Python uses readable `and`, `or`, `not` keywords with short-circuit evaluation.",
      },
      {
        prompt: "What does the compound assignment statement `score += 5` do?",
        correct: "It adds `5` to the current value of `score` and rebinds the result to `score`.",
        distractors: [
          "It checks whether `score` is greater than or equal to `5`",
          "It appends string `'5'` onto an integer variable without arithmetic",
          "It creates an immutable constant named `score`",
        ],
        explanation: "`+=` combines addition and re-assignment (`score = score + 5`).",
      },
      {
        prompt: "Which expression accurately checks if `age` lies inclusively between 18 and 65 using relational/logical operators?",
        correct: "`age >= 18 and age <= 65` (or chained `18 <= age <= 65`)",
        distractors: [
          "`age = 18 or 65`",
          "`18 => age && age =< 65`",
          "`age >= 18 not age > 65`",
        ],
        explanation: "Python supports logical `and` as well as readable chained comparison syntax like `18 <= age <= 65`.",
      },
    ],
  },
  {
    id: "python_variables_types",
    priorityPhrases: ["variables, data types", "functions & variables", "type conversions"],
    keywords: ["variables", "data types", "type conversion", "type casting", "int(", "float(", "type("],
    questions: [
      {
        prompt: "Which five core built-in types represent whole numbers, decimals, text, truth values, and null absence in Python?",
        correct: "`int`, `float`, `str`, `bool`, and `NoneType` (`None`).",
        distractors: [
          "`char`, `double`, `varchar`, `bit`, and `undefined`",
          "`number`, `decimal`, `text`, `flag`, and `void`",
          "`short`, `long`, `string[]`, `boolean`, and `nullptr`",
        ],
        explanation: "Python represents integers, floating-point decimals, strings, booleans, and null with `int`, `float`, `str`, `bool`, and `None`.",
      },
      {
        prompt: "What does `int(\"42\") + 8` produce compared to `\"42\" + 8` in Python?",
        correct: "`int(\"42\") + 8` evaluates to `50`, whereas `\"42\" + 8` raises a `TypeError`.",
        distractors: [
          "Both expressions evaluate silently to `\"428\"`",
          "`int(\"42\") + 8` produces `\"50\"` as a string",
          "`\"42\" + 8` automatically casts `'42'` into integer `42`",
        ],
        explanation: "Python is strongly typed and requires explicit conversion via `int()` or `str()` before adding text and numbers.",
      },
      {
        prompt: "Which rule must every Python variable identifier follow to avoid a `SyntaxError`?",
        correct: "Start with a letter or underscore `_` (never a digit), contain no spaces, and avoid reserved keywords.",
        distractors: [
          "Always prefix variable names with `$` or `var`",
          "Include hyphens like `my-total` between words",
          "Start numeric counters with digits such as `1st_value`",
        ],
        explanation: "Identifiers may contain letters, digits, and underscores, cannot begin with a digit, and cannot match keywords.",
      },
      {
        prompt: "How do you inspect the runtime data type of any variable `x` in Python?",
        correct: "Calling `type(x)`",
        distractors: [
          "Calling `typeof x`",
          "Calling `x.datatype()`",
          "Writing `dtype::x`",
        ],
        explanation: "The built-in `type()` function returns the class/type of an object at runtime.",
      },
    ],
  },
  {
    id: "python_input_setup",
    priorityPhrases: ["input function", "course introduction & python setup", "modules, pip", "python setup"],
    keywords: ["input()", "concatenation", "add to path", "pip", "pyjokes", "setup", "idle"],
    questions: [
      {
        prompt: "Regardless of what characters a user types, what data type does Python's built-in `input()` function always return?",
        correct: "A string (`str`), which must be explicitly cast with `int()` or `float()` for numeric math.",
        distractors: [
          "Automatically an `int` whenever digits are typed",
          "A raw byte buffer (`bytes`) requiring `.decode()`",
          "A single-element `tuple` wrapping the prompt text",
        ],
        explanation: "`input()` always returns text (`str`), so numeric input requires explicit `int(input(...))` or `float(input(...))`.",
      },
      {
        prompt: "Why should you check `'Add Python to PATH'` during installation and use `pip install` cleanly?",
        correct: "Adding Python to PATH lets any terminal run `python` and `pip` globally without typing full executable folder paths.",
        distractors: [
          "It compiles every `.py` script into standalone `.exe` binaries automatically",
          "It bypasses all syntax checks inside VS Code",
          "It installs every third-party PyPI library offline inside standard library folders",
        ],
        explanation: "The `PATH` environment variable allows VS Code and shells to locate the `python` and `pip` executables globally.",
      },
      {
        prompt: "What distinguishes a built-in Python module (like `math` or `os`) from an external module (like `pyjokes`)?",
        correct: "Built-in/standard library modules ship with Python ready to `import`, while external packages must be installed first using `pip install`.",
        distractors: [
          "External modules run without an `import` statement",
          "Built-in modules require an active internet connection on every `import`",
          "Standard library modules cannot be called inside functions",
        ],
        explanation: "Standard modules come pre-installed with Python; third-party PyPI modules require `pip` installation first.",
      },
      {
        prompt: "Which approach cleanly combines a variable `name` inside a greeting string without type mismatch errors?",
        correct: "Using an f-string like `f\"Hello, {name}!\"` (or converting non-strings with `str()` before `+`).",
        distractors: [
          "Writing `\"Hello, \" + 123` directly",
          "Calling `concat(\"Hello\", name)` built-in keyword",
          "Wrapping the variable in HTML `<var>` tags",
        ],
        explanation: "f-strings safely interpolate variables of any type into formatted strings cleanly.",
      },
    ],
  },
  {
    id: "python_strings",
    priorityPhrases: ["strings: indexing, slicing", "string formatting & escape", "strings & operations"],
    keywords: ["string", "slicing", "slice", "escape sequence", "f-string", "\\n", "\\t"],
    questions: [
      {
        prompt: "In Python string slicing `word[start:end]`, which characters are included in the slice?",
        correct: "Characters starting at index `start` up to `end - 1` (`end` index is excluded).",
        distractors: [
          "Characters from `start` through `end` inclusively",
          "Only the two characters exactly at `start` and `end`",
          "Characters starting at 1-based index `start + 1` up to `end`",
        ],
        explanation: "Python slices are half-open intervals `[start, end)`: `start` is included, `end` is excluded.",
      },
      {
        prompt: "What does negative index `text[-1]` access in a Python string?",
        correct: "The last character of the string.",
        distractors: [
          "An `IndexError` in every Python version",
          "The first character reversed to lowercase",
          "The whitespace character immediately preceding index 0",
        ],
        explanation: "Negative indices count backwards from the end of a sequence (`-1` is the final element).",
      },
      {
        prompt: "Why does writing `word[0] = 'J'` raise a `TypeError` on a Python `str`?",
        correct: "Python strings are immutable, so methods like `.replace()` or slicing return a new string instead of modifying in place.",
        distractors: [
          "Single quotes cannot store uppercase characters",
          "Index `0` is reserved exclusively for escape sequences",
          "Strings require `.unlock()` before character assignment",
        ],
        explanation: "Because strings are immutable in Python, transforming them creates new string objects.",
      },
      {
        prompt: "What is the role of `\\n` and `\\t` inside a string literal?",
        correct: "Escape sequences that insert a newline (`\\n`) or a horizontal tab (`\\t`) into formatted output.",
        distractors: [
          "Operators that divide numbers inside an f-string",
          "Comments ignored by Python up to the next semicolon",
          "Syntax for declaring global constants inside strings",
        ],
        explanation: "Backslash escape sequences represent special whitespace and control characters inside string literals.",
      },
    ],
  },
  {
    id: "python_lists",
    priorityPhrases: ["list methods", "lists in python", "lists & tuples"],
    keywords: ["list", "append", "insert", "pop", "remove", "sort", "mutability", "indexing"],
    questions: [
      {
        prompt: "What happens when you call `nums.sort()` or `nums.append(99)` on a Python list?",
        correct: "Because lists are mutable, the original list is modified in place and `.sort()` returns `None`.",
        distractors: [
          "The original list stays unchanged and `.sort()` returns a sorted copy",
          "Python converts the list into an immutable tuple before sorting",
          "`.append(99)` inserts `99` at index `0` instead of the end",
        ],
        explanation: "List mutating methods modify the existing list directly in memory rather than returning a new list.",
      },
      {
        prompt: "How does `items.pop(index)` differ from `items.remove(value)`?",
        correct: "`.pop(index)` deletes and returns the element at a position (defaulting to the last item), while `.remove(value)` removes the first matching value.",
        distractors: [
          "`.pop()` removes all duplicates of a value, while `.remove()` removes by index",
          "`.remove()` returns the deleted value while `.pop()` always returns `True`",
          "Neither method changes the length of the list",
        ],
        explanation: "`.pop()` operates by index and returns the removed item; `.remove()` searches by value.",
      },
      {
        prompt: "If `fruits = ['apple', 'banana']`, what is the difference between `fruits.append('mango')` and `fruits.insert(1, 'mango')`?",
        correct: "`.append()` adds `'mango'` to the end, while `.insert(1, 'mango')` places it at index `1` and shifts subsequent elements.",
        distractors: [
          "`.insert(1, ...)` overwrites and deletes `'banana'`",
          "`.append()` inserts at index `0` before `'apple'`",
          "Both behave identically when `'mango'` is a string",
        ],
        explanation: "`.append(x)` appends to the tail; `.insert(i, x)` inserts at an arbitrary index without overwriting.",
      },
      {
        prompt: "Unlike Python strings, why can you execute `scores[2] = 95` directly on a `list`?",
        correct: "Lists are ordered and mutable containers, allowing direct in-place item assignment by index.",
        distractors: [
          "Lists only allow replacing integers with floats",
          "Brackets `[]` automatically trigger a deep copy on assignment",
          "Index `2` skips immutability checks in Python 3",
        ],
        explanation: "Mutability allows element replacement, addition, and deletion inside the same list object.",
      },
    ],
  },
  {
    id: "python_tuples",
    priorityPhrases: ["tuple methods", "tuples in python"],
    keywords: ["tuple", "immutability", "count & index", "empty tuple", "single element tuple"],
    questions: [
      {
        prompt: "What happens if you try to modify an element of an existing tuple via `t[0] = 10`?",
        correct: "Python raises a `TypeError` because tuples are immutable once created.",
        distractors: [
          "The tuple silently converts into a mutable list",
          "`t[0]` updates as long as `10` matches the previous data type",
          "The value appends at the end of the tuple instead",
        ],
        explanation: "Tuples are fixed-size immutable sequences; their elements cannot be reassigned after creation.",
      },
      {
        prompt: "How do you correctly create a Python tuple containing a single item `5`?",
        correct: "`t = (5,)` with a trailing comma.",
        distractors: [
          "`t = (5)` without any comma",
          "`t = [5,]` with square brackets",
          "`t = tuple(5)` passing a raw integer",
        ],
        explanation: "Without the trailing comma, `(5)` is parsed as an integer inside grouping parentheses rather than a 1-tuple.",
      },
      {
        prompt: "What do `t.count(x)` and `t.index(x)` return on a Python tuple?",
        correct: "`.count(x)` returns how many times `x` appears; `.index(x)` returns the index of the first occurrence of `x`.",
        distractors: [
          "`.count(x)` returns total tuple length and `.index(x)` deletes `x`",
          "Both return a sorted list of matching positions",
          "`.index(x)` returns `-1` if `x` is missing without raising an error",
        ],
        explanation: "Tuples expose two read-only utility methods: `.count()` for frequency and `.index()` (raising `ValueError` if absent).",
      },
      {
        prompt: "When should you prefer a `tuple` over a `list` in Python?",
        correct: "When representing fixed collections that should not be accidentally mutated (e.g., coordinates, records, or dictionary keys).",
        distractors: [
          "Whenever you need `.append()` and `.sort()` inside a loop",
          "When storing dynamic user carts whose length changes constantly",
          "Because tuples allow key-value lookups like dictionaries",
        ],
        explanation: "Immutability communicates fixed structure and prevents unintended mutations.",
      },
    ],
  },
  {
    id: "python_dicts_sets",
    priorityPhrases: ["dictionaries in python", "dictionary methods", "sets in python", "set operations", "dictionaries & sets"],
    keywords: ["dictionary", "dictionaries", "key-value", "set operations", "sets", "union", "intersection", ".get(", "empty set"],
    questions: [
      {
        prompt: "How does `student.get(\"grade\")` behave differently from `student[\"grade\"]` when `\"grade\"` is not in the dictionary?",
        correct: "`.get()` safely returns `None` (or a specified default), whereas `student[\"grade\"]` raises a `KeyError`.",
        distractors: [
          "`.get()` raises a `ValueError`, whereas `[]` inserts `'grade': None`",
          "Both return `False` without raising an exception",
          "`.get()` deletes the key after reading it",
        ],
        explanation: "`dict.get(key, default)` prevents `KeyError` crashes when a key may be absent.",
      },
      {
        prompt: "How do you create an **empty `set`** in Python without accidentally creating an empty `dict`?",
        correct: "`s = set()` — because `{}` creates an empty dictionary.",
        distractors: [
          "`s = {}`",
          "`s = set[]`",
          "`s = (set)`",
        ],
        explanation: "In Python syntax, empty `{}` creates a dictionary; an empty set requires `set()`.",
      },
      {
        prompt: "What happens when duplicate values are added to a Python `set`, and what do `.union()` vs `.intersection()` return?",
        correct: "Duplicates are automatically ignored; `.union()` combines unique elements from both sets while `.intersection()` keeps only shared elements.",
        distractors: [
          "Sets store duplicate copies at the back while `.intersection()` subtracts lengths",
          "Adding a duplicate value raises a `DuplicateKeyError` immediately",
          "`.union()` overwrites both sets in place and returns `None`",
        ],
        explanation: "Sets store unordered unique hashable elements and support mathematical set algebra.",
      },
      {
        prompt: "What do `d.keys()`, `d.values()`, and `d.items()` return on a Python dictionary?",
        correct: "Dynamic view objects containing the dictionary's keys, values, and `(key, value)` pairs respectively.",
        distractors: [
          "Sorted lists of strings after converting every numeric key",
          "A boolean confirming whether the dictionary is mutable",
          "Only the first and last entries in insertion order",
        ],
        explanation: "`.keys()`, `.values()`, and `.items()` provide iterable views over keys, values, and `(key, value)` tuples.",
      },
    ],
  },
  {
    id: "python_loops_control",
    priorityPhrases: ["while loops", "for loops", "range function", "for loop with else", "break statement", "continue statement", "pass statement", "nested loops", "loops & iterations", "conditionals & loops"],
    keywords: ["while loop", "for loop", "range(", "break", "continue", "pass", "star pattern", "nested loop", "loop termination"],
    questions: [
      {
        prompt: "What numbers does `range(1, 10, 2)` generate in a Python `for` loop?",
        correct: "`1, 3, 5, 7, 9` (starts at `1`, stops before `10`, steps by `2`).",
        distractors: [
          "`1, 2, 3, 4, 5, 6, 7, 8, 9, 10`",
          "`1, 3, 5, 7, 9, 10` including the stop boundary",
          "`2, 4, 6, 8, 10` starting at the step argument",
        ],
        explanation: "`range(start, stop, step)` starts at `start`, increments by `step`, and excludes `stop`.",
      },
      {
        prompt: "How do `break`, `continue`, and `pass` differ inside a Python loop?",
        correct: "`break` exits the loop entirely, `continue` skips to the next iteration, and `pass` is a no-op syntax placeholder.",
        distractors: [
          "`continue` restarts the whole script from line 1 while `pass` exits the loop",
          "`break` skips only the current iteration while `continue` exits the program",
          "`pass` raises a `StopIteration` error inside `while` loops",
        ],
        explanation: "`break` terminates looping, `continue` jumps to the next cycle, and `pass` leaves block syntax valid with no effect.",
      },
      {
        prompt: "In Python's `for ... else:` construct, when does the `else` block execute?",
        correct: "Only when the loop exhausts all iterations normally without encountering a `break` statement.",
        distractors: [
          "Whenever a `break` statement terminates the loop early",
          "Only if the iterable has zero items and throws `ValueError`",
          "On every single iteration immediately before checking the next item",
        ],
        explanation: "The loop `else` clause runs strictly on normal loop completion (no `break`).",
      },
      {
        prompt: "When using nested loops (e.g., printing rows of star patterns) or `while` loops, what prevents an infinite loop?",
        correct: "Updating the loop condition variable cleanly on each cycle (e.g., incrementing counters inside `while`) and bounding outer/inner bounds.",
        distractors: [
          "Wrapping the loop header with a `def` statement",
          "Placing `pass` inside the inner loop body",
          "Removing all comparison operators from the `while` condition",
        ],
        explanation: "A `while` loop terminates only when its condition eventually becomes `False` (or hits `break`).",
      },
    ],
  },
  {
    id: "python_functions_recursion",
    priorityPhrases: ["functions in python", "function arguments", "return statement", "recursion in python", "functions & recursion"],
    keywords: ["function", "def ", "default parameter", "positional", "return", "recursion", "recursive", "base case"],
    questions: [
      {
        prompt: "Why is `return result` inside a Python function fundamentally different from `print(result)`?",
        correct: "`return` hands the computed value back to the caller for reuse in expressions/variables, whereas `print()` only writes text to the console and returns `None`.",
        distractors: [
          "`print()` exits the function immediately and stores the value in `result`",
          "`return` can only output integers while `print()` handles strings",
          "Functions without `return` automatically return the last local variable",
        ],
        explanation: "Without an explicit `return`, a Python function evaluates to `None` even if it prints output.",
      },
      {
        prompt: "What rule applies when mixing positional parameters and default parameter values like `def greet(name, msg=\"Hello\"):`?",
        correct: "Parameters with default values must appear AFTER parameters without defaults in the function signature.",
        distractors: [
          "Default parameters must always come first before required parameters",
          "Every caller must still pass `" + "Hello" + "` explicitly on every call",
          "Default parameter values can only be `None` or `0`",
        ],
        explanation: "Non-default positional arguments always precede default-valued parameters in Python function definitions.",
      },
      {
        prompt: "What happens if a recursive function lacks a reachable **base case**?",
        correct: "It calls itself endlessly until Python stops it with a `RecursionError: maximum recursion depth exceeded`.",
        distractors: [
          "Python automatically stops recursion after 3 nested calls and returns `0`",
          "The function converts itself into a `while` loop at compile time",
          "All local variables become global across recursive frames",
        ],
        explanation: "Every valid recursive algorithm needs a terminating base case and a step moving toward that base case.",
      },
      {
        prompt: "Why organize reusable logic into `def` functions rather than repeating identical blocks?",
        correct: "It eliminates duplicate code, isolates bugs to one place, and lets you pass different inputs cleanly via parameters.",
        distractors: [
          "Functions automatically parallelize every statement across GPU cores",
          "Because Python forbids calling loops outside functions",
          "Functions execute only once per file regardless of how many times called",
        ],
        explanation: "Functions promote modularity, maintainability, and parameterized reuse across programs.",
      },
    ],
  },
  {
    id: "python_file_io",
    priorityPhrases: ["file i/o", "file writing & appending", "with statement", "high score tracker"],
    keywords: ["file i/o", "open(", "with open", "context manager", "'w'", "'a'", "readline", "file handling"],
    questions: [
      {
        prompt: "How does opening a file in mode `'w'` differ from mode `'a'`?",
        correct: "Mode `'w'` overwrites existing file contents (or creates a new file), whereas `'a'` preserves existing text and appends to the end.",
        distractors: [
          "Mode `'w'` is read-only for Windows files while `'a'` reads binary audio",
          "Mode `'a'` deletes the file first and creates an empty file",
          "Mode `'w'` raises `FileExistsError` if the file already exists",
        ],
        explanation: "`'w'` truncates/overwrites before writing; `'a'` appends new data at the end of existing contents.",
      },
      {
        prompt: "Why is `with open(\"data.txt\", \"r\") as f:` strongly preferred over calling `open()` and `f.close()` manually?",
        correct: "The `with` context manager guarantees the file handle is automatically closed even if an exception occurs inside the block.",
        distractors: [
          "`with` automatically encrypts the file with AES before closing",
          "`with` loads files asynchronously without touching disk storage",
          "Calling `open()` without `with` forbids reading more than 1 line",
        ],
        explanation: "Context managers guarantee deterministic resource cleanup when exiting the `with` block.",
      },
      {
        prompt: "Which difference separates `f.read()` from `f.readline()` when reading a text file?",
        correct: "`f.read()` reads the entire file (or N characters) as one string, while `f.readline()` reads one line at a time.",
        distractors: [
          "`f.readline()` automatically parses JSON objects into dicts",
          "`f.read()` deletes lines from disk immediately after reading",
          "`f.readline()` returns the number of bytes instead of text",
        ],
        explanation: "`read()` returns bulk text while `readline()` consumes a single line per call.",
      },
      {
        prompt: "When building a persistent high-score tracker in a file, which sequence ensures new scores aren't lost on restart?",
        correct: "Read the stored integer score from file (defaulting safely if missing), compare against the new score, and write back the updated high score cleanly.",
        distractors: [
          "Store scores only inside a local list without opening any file",
          "Always open the file in `'w'` mode BEFORE reading the previous score",
          "Use `'x'` mode repeatedly without error handling",
        ],
        explanation: "Opening in `'w'` before reading would erase the existing high score; read first, compare, then write if higher.",
      },
    ],
  },
  {
    id: "python_oop_inheritance",
    priorityPhrases: ["object oriented programming", "__init__() constructor", "self parameter", "inheritance in python", "super() method", "class methods", "static methods", "property decorators", "operator overloading", "railway booking system", "2d/3d vectors"],
    keywords: ["oop", "class", "object", "__init__", "self", "inheritance", "super()", "@classmethod", "@staticmethod", "@property", "dunder", "overloading"],
    questions: [
      {
        prompt: "What does `self` represent inside an instance method of a Python class, and why is it the first parameter?",
        correct: "It refers to the specific object instance invoking the method, passed automatically by Python so instance attributes can be accessed and updated.",
        distractors: [
          "It refers exclusively to the parent base class dictionary",
          "It is a global singleton shared across every class in the module",
          "Callers must pass an integer ID manually for `self` on every method call",
        ],
        explanation: "`instance.method()` automatically binds `instance` as `self`, letting methods read `self.attr`.",
      },
      {
        prompt: "When does `__init__()` execute, and what is its primary responsibility?",
        correct: "It runs automatically when a new object is instantiated (dunder constructor) to initialize that instance's attributes.",
        distractors: [
          "It runs only when the object is garbage-collected on shutdown",
          "It must be called manually after creating an instance to define class variables",
          "It converts class methods into standalone `@staticmethod` functions",
        ],
        explanation: "`__init__(self, ...)` initializes per-object state immediately at instantiation.",
      },
      {
        prompt: "How do `@classmethod` (`cls`), `@staticmethod`, and `@property` differ in Python OOP?",
        correct: "`@classmethod` receives the class (`cls`), `@staticmethod` receives neither `self` nor `cls`, and `@property` exposes getter/setter logic like a clean attribute.",
        distractors: [
          "`@staticmethod` modifies instance attributes via `self`, while `@classmethod` forbids inheritance",
          "`@property` forces methods to take at least 3 positional arguments",
          "All three decorators share the exact same runtime signature",
        ],
        explanation: "Python decorators distinguish class-bound factories (`cls`), utility static helpers, and managed property accessors.",
      },
      {
        prompt: "In child classes using inheritance (single, multiple, or multilevel), why call `super().__init__(...)` and implement dunder methods like `__add__`?",
        correct: "`super()` invokes the parent class constructor properly via MRO without hardcoding its name, and dunders like `__add__` enable `+` operator overloading on custom classes (e.g., Vectors).",
        distractors: [
          "`super()` deletes parent attributes so subclasses start empty",
          "`__add__` allows Python to execute arithmetic only on strings, never custom classes",
          "Multiple inheritance forbids overriding any parent methods",
        ],
        explanation: "`super()` follows Python's Method Resolution Order (MRO) cleanly, and dunder methods customize built-in operators.",
      },
    ],
  },
  {
    id: "python_exceptions_modern",
    priorityPhrases: ["exception handling", "walrus operator", "match-case", "dictionary merge"],
    keywords: ["try", "except", "finally", "walrus", "match-case", "match case", "type hints", "custom exceptions", "raise"],
    questions: [
      {
        prompt: "In Python's `try / except / else / finally` block, when do the `else` and `finally` clauses run?",
        correct: "`else` runs only if the `try` block succeeded with zero exceptions; `finally` ALWAYS executes whether an error occurred or not.",
        distractors: [
          "`else` runs only when an exception is raised, and `finally` skips if `return` runs",
          "`finally` runs ONLY when an unhandled exception crashes the program",
          "`else` and `finally` execute identically in all cases",
        ],
        explanation: "`else` separates success-path logic from guarded error checks, while `finally` guarantees cleanup always executes.",
      },
      {
        prompt: "Why catch specific exceptions (e.g., `except ValueError:`) rather than a bare `except:` everywhere?",
        correct: "Specific handlers prevent accidentally swallowing unrelated bugs like `KeyboardInterrupt` or `NameError`, enabling accurate recovery.",
        distractors: [
          "Bare `except:` raises a `SyntaxError` in Python 3",
          "Specific handlers automatically suppress logging and skip `finally`",
          "Because `ValueError` is the parent of every exception class in Python",
        ],
        explanation: "Narrow `except` clauses handle known failure modes explicitly without masking genuine bugs.",
      },
      {
        prompt: "What modern Python 3.8–3.10+ features simplify inline assignment, structural branching, and dictionary merging?",
        correct: "The walrus operator (`:=`) assigns inside expressions, `match / case` handles structural pattern matching, and `d1 | d2` merges dicts cleanly.",
        distractors: [
          "`switch / break` from C++ and `dict.join()`",
          "`var :=` to bypass indentation rules inside loops",
          "Type hints like `x: int` forcing hard C-style runtime crashes automatically",
        ],
        explanation: "Modern Python introduces `:=` (assignment expression), `match/case`, `|` dict union, and static type hints.",
      },
      {
        prompt: "When might you execute `raise ValueError(...)` inside a function?",
        correct: "To signal explicitly to callers that an argument violates a domain constraint so invalid state doesn't silently propagate.",
        distractors: [
          "To convert an integer into a string without calling `str()`",
          "To permanently suppress all future tracebacks in the process",
          "To re-run the current `try` block automatically 3 times",
        ],
        explanation: "Raising explicit exceptions fails fast with clear diagnostic context.",
      },
    ],
  },
  {
    id: "python_projects",
    priorityPhrases: ["snake, water, gun", "perfect guess"],
    keywords: ["snake", "water", "gun", "perfect guess", "random", "game loop"],
    questions: [
      {
        prompt: "In Python console projects like Snake-Water-Gun or Perfect Guess, how does `random.choice()` / `random.randint()` drive fair gameplay?",
        correct: "It generates unpredictable computer moves or secret target numbers dynamically on each run rather than hardcoding outcomes.",
        distractors: [
          "It always picks the exact same sequence `1, 2, 3` unless passed a password",
          "It mutates user strings into floating-point timestamps",
          "It pauses input loops until a GUI window opens",
        ],
        explanation: "The `random` standard library module provides non-deterministic opponent choices and secret targets.",
      },
      {
        prompt: "In a number-guessing or round-based game loop, what ends the `while` loop cleanly?",
        correct: "Checking whether the player's guess matches the target (or rounds finish) and updating state or executing `break`.",
        distractors: [
          "Removing all `if/elif/else` checks inside the loop",
          "Converting the secret integer into an empty tuple",
          "Resetting the attempt counter to `0` at the end of each wrong guess",
        ],
        explanation: "Clear termination predicates and attempt counters ensure the game reports score cleanly when solved.",
      },
      {
        prompt: "Why normalize user input (e.g., mapping short keys or `.lower().strip()` and handling non-numeric input) before evaluating game rules?",
        correct: "To avoid crashes on unexpected casing/whitespace or `ValueError` when parsing user input.",
        distractors: [
          "Because `input()` returns raw integers that ignore uppercase letters",
          "To hide the player's score from variables",
          "So Python converts `elif` branches into recursion",
        ],
        explanation: "Defensive input normalization prevents invalid casing or typos from breaking the game loop.",
      },
      {
        prompt: "How do mapping dictionaries like `{ 's': 1, 'w': -1, 'g': 0 }` simplify win/lose/draw evaluation in multi-choice games?",
        correct: "Compact lookup tables replace repetitive nested conditionals while keeping valid move validation clean and extensible.",
        distractors: [
          "Dictionaries disable equality checks (`==`)",
          "Mapping tables skip validating unknown inputs automatically without checks",
          "Because Python forbids using strings inside `if` statements",
        ],
        explanation: "Dictionary lookups decouple human-readable inputs from internal comparison rules.",
      },
    ],
  },
  {
    id: "data_pandas_numpy",
    priorityPhrases: ["pandas data wrangling", "numpy vectorized math", "pandas", "numpy"],
    keywords: ["pandas", "dataframe", "numpy", "ndarray", "vectorized", "broadcasting", "dropna", "groupby"],
    questions: [
      {
        prompt: "Why are NumPy vectorized array operations drastically faster than iterating over Python lists with `for` loops?",
        correct: "NumPy executes homogeneous `ndarray` operations in contiguous memory using optimized compiled C loops without per-element Python type overhead.",
        distractors: [
          "NumPy translates Python loops directly into SQL queries inside SQLite",
          "Vectorized math discards floating-point precision beyond 1 decimal place",
          "`ndarray` automatically converts strings into nested dictionaries",
        ],
        explanation: "Contiguous typed memory and compiled C/SIMD kernels eliminate dynamic interpreter dispatch overhead.",
      },
      {
        prompt: "In Pandas DataFrame wrangling, what do `.dropna()`, `.fillna()`, and `.groupby()` solve?",
        correct: "Handling missing (`NaN`) rows cleanly (dropping or imputing) and aggregating metrics per category group.",
        distractors: [
          "Encrypting CSV files before writing to S3",
          "Launching Docker containers for every column",
          "Replacing every string column with random UUIDs",
        ],
        explanation: "Pandas cleaning and group-aggregation APIs standardize messy tabular datasets prior to modeling.",
      },
      {
        prompt: "What is **broadcasting** in NumPy array arithmetic?",
        correct: "Automatically expanding compatible smaller array dimensions (like a scalar or 1D row) across a larger array shape without copying memory unnecessarily.",
        distractors: [
          "Sending DataFrame JSON logs to connected WebSocket browsers",
          "Sorting a multidimensional array along axis `-1` in place",
          "Merging mismatched incompatible shapes by truncating extra rows silently",
        ],
        explanation: "Broadcasting aligns compatible trailing dimensions cleanly without explicit Python loop expansion.",
      },
      {
        prompt: "Before performing group-by metrics or feeding features into an AI workflow, why inspect `.info()`, `.shape`, and `.isna().sum()`?",
        correct: "To verify row/column dimensions, detect wrong string/object dtypes on numeric columns, and quantify missing values early.",
        distractors: [
          "To clear all indexes and convert the DataFrame into a tuple",
          "Because Pandas deletes uninspected columns after 60 seconds",
          "To bypass vectorization and force pure Python loops",
        ],
        explanation: "Schema and null auditing prevents silent type coercion bugs and skewed statistics downstream.",
      },
    ],
  },
  {
    id: "fastapi_backend_docker_redis",
    priorityPhrases: ["fastapi async services", "fastapi endpoints", "postgres indexing & locks", "docker compose orchestration", "redis caching strategies", "rate limiting & auth", "microservice architecture", "production deployment"],
    keywords: ["fastapi", "postgres", "indexing", "locks", "docker compose", "redis", "caching", "rate limiting", "microservice", "async services"],
    questions: [
      {
        prompt: "How does a PostgreSQL B-tree index improve `WHERE` and `JOIN` query speed, and what tradeoff does it introduce?",
        correct: "It enables fast logarithmic lookups instead of full sequential table scans, at the cost of extra disk space and slightly slower `INSERT`/`UPDATE`/`DELETE` index writes.",
        distractors: [
          "Indexes make writes 10x faster while forcing every `SELECT` to scan all rows",
          "Indexes automatically encrypt row values and disable foreign key constraints",
          "A single index eliminates table deadlocks for every transaction permanently",
        ],
        explanation: "Indexes trade write-time maintenance and storage overhead for orders-of-magnitude faster read lookups.",
      },
      {
        prompt: "In Redis caching (Cache-Aside pattern), what happens on a cache miss and why always set a TTL?",
        correct: "On a miss, the service queries the primary DB, stores the result in Redis with an expiration TTL to avoid unbounded stale data/memory growth, and returns the payload.",
        distractors: [
          "Cache misses permanently drop the user request with HTTP 404",
          "Redis refuses to store keys unless TTL is set to infinity (`-1`)",
          "Setting a TTL causes Redis to bypass RAM and write synchronously to cold tape",
        ],
        explanation: "Cache-aside + TTL balances fast reads, bounded RAM usage, and eventual freshness after mutations.",
      },
      {
        prompt: "What role do Docker Compose service networks, volumes, and healthchecks play in multi-container architectures?",
        correct: "Service names resolve automatically over an isolated bridge network, named volumes persist DB data across restarts, and healthchecks wait until dependencies are actually ready.",
        distractors: [
          "Docker Compose merges PostgreSQL, Redis, and FastAPI into one single shared PID process",
          "Named volumes delete database data automatically whenever a container restarts",
          "Healthchecks replace TLS certificates on public load balancers",
        ],
        explanation: "Compose declaratively wires service discovery, durable stateful storage, and dependency startup ordering.",
      },
      {
        prompt: "Why combine Pydantic validation, `async def` non-blocking I/O, and Redis-backed Rate Limiting (e.g., Token Bucket / Sliding Window) in API endpoints?",
        correct: "Pydantic rejects malformed payloads early, `async` prevents stalling worker threads on network/DB calls, and rate limiting returns HTTP `429` before traffic spikes overwhelm backends.",
        distractors: [
          "Blocking synchronous sleep calls speed up concurrent FastAPI requests",
          "Rate limiting converts POST JSON bodies into GraphQL schemas",
          "Disabling Pydantic validation lowers memory safety checks for trusted traffic",
        ],
        explanation: "Schema validation, non-blocking concurrency, and backpressure rate limits protect latency under heavy load.",
      },
    ],
  },
  {
    id: "system_design",
    priorityPhrases: ["database sharding & replication", "cache invalidation patterns", "asynchronous message queues", "horizontal vs vertical scaling", "load balancers & reverse proxies"],
    keywords: ["sharding", "replication", "cache invalidation", "message queues", "horizontal", "vertical scaling", "load balancer", "reverse proxy", "cdn", "consistent hashing"],
    questions: [
      {
        prompt: "How does **horizontal scaling** (scaling out) compare to **vertical scaling** (scaling up)?",
        correct: "Horizontal scaling adds more machines behind a load balancer for fault tolerance and near-linear growth, whereas vertical scaling upgrades CPU/RAM on a single node and hits hardware limits.",
        distractors: [
          "Vertical scaling eliminates single points of failure without load balancers",
          "Horizontal scaling always shares one local CPU clock across servers",
          "Neither pattern affects database connection limits or state management",
        ],
        explanation: "Horizontal scaling distributes load across commodity instances; vertical scaling hits physical hardware ceilings and SPOF risk.",
      },
      {
        prompt: "What distinguishes database **replication** (primary-replica) from **sharding** (horizontal partitioning)?",
        correct: "Replication copies full data across nodes to scale reads and failover redundancy; sharding splits disjoint subsets of rows across nodes to scale write throughput and storage.",
        distractors: [
          "Replication splits tables alphabetically while sharding keeps identical copies on every host",
          "Sharding requires zero shard key design and eliminates cross-shard join costs",
          "Replication works only for in-memory caches and never relational databases",
        ],
        explanation: "Replicas scale read availability; shards partition datasets to overcome single-node write and disk limits.",
      },
      {
        prompt: "Why offload slow or spiky tasks (email dispatch, video indexing, webhooks) onto **asynchronous message queues** with workers & DLQs?",
        correct: "Producers return fast responses immediately while workers process queued jobs reliably at controlled concurrency, retrying failures via Dead-Letter Queues.",
        distractors: [
          "Queues force the browser HTTP connection to stay blocked until background encoding ends",
          "Message brokers drop every message whenever a worker temporarily restarts",
          "Replacing queues with direct synchronous loops removes backpressure control",
        ],
        explanation: "Queues decouple bursty request ingestion from downstream execution speed and enable durable retries.",
      },
      {
        prompt: "What responsibilities do L7 **Reverse Proxies / Load Balancers** and **Cache Invalidation** strategies fulfill?",
        correct: "Load balancers terminate TLS, run health checks, and route traffic across healthy backends; invalidation (TTL, write-through, key versioning) keeps stale cache hits bounded.",
        distractors: [
          "Load balancers store every user password unencrypted in browser cookies",
          "Write-through caching skips writing to the database permanently",
          "Health checks deliberately route all incoming traffic to crashed nodes",
        ],
        explanation: "Edge routing distributes healthy traffic while disciplined invalidation prevents stale cached state.",
      },
    ],
  },
  {
    id: "ai_llm_rag_agents",
    priorityPhrases: ["rag & vector databases", "supabase vector embeddings", "langgraph state machines", "autonomous agents & tools", "llm fundamentals & tokens", "prompt engineering & cot", "openai & anthropic sdks", "streaming llm responses"],
    keywords: ["rag", "vector", "embedding", "langgraph", "langchain", "agent", "token", "prompt", "chain-of-thought", "cot", "streaming", "sse", "anthropic", "openai", "mcp"],
    questions: [
      {
        prompt: "Why chunk domain documents and query a **vector database** (via cosine similarity on embeddings) in a RAG pipeline?",
        correct: "To retrieve the most semantically relevant grounded passages within token limits rather than relying solely on frozen pretraining weights.",
        distractors: [
          "To retrain all billion model weights from scratch on each user question",
          "To compress SQL relational rows directly into JPEG images",
          "To avoid sending any retrieved context in the final model prompt",
        ],
        explanation: "Semantic chunk retrieval anchors LLM answers in fresh, domain-specific evidence and cuts hallucinations.",
      },
      {
        prompt: "How does a **LangGraph StateGraph** differ from a basic linear prompt chain?",
        correct: "It coordinates cyclic reasoning loops, shared typed state across nodes, conditional edge routing, and persistent checkpoints.",
        distractors: [
          "It forbids branching or loops and allows only one hardcoded prompt string",
          "It compiles Python models into client-side CSS animations",
          "It runs exclusively without external tools or structured schemas",
        ],
        explanation: "State graphs model multi-step agent loops, branching logic, and durable thread checkpoints cleanly.",
      },
      {
        prompt: "Why use **Chain-of-Thought (CoT)**, **structured JSON outputs**, and **SSE streaming** when integrating OpenAI/Anthropic SDKs?",
        correct: "CoT improves multi-step reasoning, strict schemas make tool outputs reliably parseable, and token streaming gives instant Time-to-First-Token feedback.",
        distractors: [
          "Streaming doubles response latency by waiting for the final token before flushing anything",
          "Zero-shot prompts automatically enforce PostgreSQL ACID locks",
          "Raising temperature to `2.0` guarantees deterministic JSON syntax",
        ],
        explanation: "Explicit step reasoning, typed output schemas, and incremental SSE streams optimize accuracy and responsiveness.",
      },
      {
        prompt: "When building **Autonomous Agents & Tools** (including MCP tools), why enforce strict parameter schemas and execution guardrails?",
        correct: "So the LLM passes valid typed arguments to external APIs/DBs cleanly and risky or malformed tool calls fail safely instead of corrupting state.",
        distractors: [
          "To disable exception handling so broken API calls pass silently",
          "Because tools cannot accept string or integer parameters",
          "So every prompt sends private API secrets inside public system messages",
        ],
        explanation: "Typed tool contracts and bounded retries turn unreliable text output into dependable actions.",
      },
    ],
  },
  {
    id: "excel_analytics",
    priorityPhrases: ["pivot tables & slicers", "power query transformations", "excel ai workflows", "formulas & cell referencing", "xlookup & nested logic"],
    keywords: ["excel", "pivot", "slicers", "power query", "xlookup", "cell referencing", "$a$1", "formula"],
    questions: [
      {
        prompt: "What happens when you copy a formula containing `$B$2` (absolute reference) versus `B2` (relative reference) across rows?",
        correct: "`$B$2` stays locked to cell B2 across every copied row/column, whereas `B2` shifts dynamically relative to the destination row.",
        distractors: [
          "`$B$2` converts numeric values directly into US Dollar currency strings",
          "`B2` remains permanently frozen while `$B$2` increments automatically",
          "Both behave identically unless placed inside a Pivot Table",
        ],
        explanation: "Dollar signs (`$`) lock column and/or row coordinates during formula autofill.",
      },
      {
        prompt: "Why prefer `XLOOKUP` over legacy `VLOOKUP` for modern Excel lookup tables?",
        correct: "`XLOOKUP` searches left or right, defaults to exact match (`0`), survives inserted columns cleanly, and supports a built-in `if_not_found` fallback.",
        distractors: [
          "`XLOOKUP` only scans rightward and crashes whenever a column is inserted",
          "`VLOOKUP` supports looking up values to the left of the return column natively",
          "`XLOOKUP` can only evaluate numeric cells and ignores text keys",
        ],
        explanation: "`XLOOKUP` decouples lookup and return ranges, defaults to exact matching, and gracefully handles missing keys.",
      },
      {
        prompt: "What makes **Power Query** essential for recurring messy CSV/Excel data pipelines?",
        correct: "It records repeatable cleaning steps (split, unpivot, trim, merge, type cast) in M code that refresh raw exports in one click.",
        distractors: [
          "It replaces every formula with static screenshots so rows cannot change",
          "It deletes source workbooks immediately after importing",
          "It only works on 10 rows or fewer per worksheet",
        ],
        explanation: "Power Query turns manual repetitive spreadsheet cleanup into a reproducible ETL pipeline.",
      },
      {
        prompt: "How do **Pivot Tables & Slicers** work together in executive dashboards?",
        correct: "Pivot Tables summarize thousands of transactional rows dynamically across dimensions, while interactive Slicers filter one or multiple linked Pivot Views visually.",
        distractors: [
          "Slicers overwrite raw source rows permanently whenever clicked",
          "Pivot Tables require manually rewriting `SUMIFS` for every category row",
          "Slicers disable date grouping and sorting inside Pivot Tables",
        ],
        explanation: "Pivot Tables aggregate multi-dimensional metrics rapidly while Slicers expose clean visual filters.",
      },
    ],
  },
  {
    id: "cybersecurity_hacking",
    priorityPhrases: ["vulnerability analysis", "web exploitation & sqli", "privilege escalation", "network reconnaissance", "port scanning & nmap"],
    keywords: ["vulnerability", "sqli", "sql injection", "privilege escalation", "reconnaissance", "osint", "nmap", "port scanning", "hacking"],
    questions: [
      {
        prompt: "What separates **Passive OSINT Reconnaissance** from **Active Scanning (e.g., Nmap)** in authorized assessments?",
        correct: "Passive OSINT gathers public info (DNS records, certs, WHOIS) without touching target hosts directly, while active scanning sends packets directly to probe open ports/services.",
        distractors: [
          "Active scanning never leaves entries in target firewall or IDS logs",
          "Passive OSINT exploits SQL injection payloads directly on login forms",
          "Nmap only inspects local browser bookmarks offline",
        ],
        explanation: "Passive collection avoids direct target probing, whereas active scanners like Nmap interact directly with target ports.",
      },
      {
        prompt: "What does a common Nmap scan combining `-sS -sV` discover?",
        correct: "Stealth SYN scan (`-sS`) detects open TCP ports and service version probing (`-sV`) fingerprints running daemon banners.",
        distractors: [
          "It automatically resets root passwords over HTTP port 80",
          "It deletes `/etc/passwd` locally after finishing reconnaissance",
          "It scans only UDP DNS queries while ignoring TCP ports",
        ],
        explanation: "TCP SYN port discovery paired with service version fingerprinting maps the exact exposed attack surface.",
      },
      {
        prompt: "Why does concatenating untrusted request input directly into raw SQL invite **SQL Injection (SQLi)**, and what eliminates it?",
        correct: "Attacker input alters the SQL AST syntax; **parameterized queries / prepared statements** bind inputs strictly as literal data so SQL structure cannot be altered.",
        distractors: [
          "Converting all database tables to uppercase eliminates SQL injection completely",
          "Client-side HTML `maxlength` attributes prevent forged curl requests",
          "Renaming table columns to random words blocks `' OR 1=1 --` payloads permanently",
        ],
        explanation: "Prepared statements separate SQL query structure from untrusted parameter values at the database driver level.",
      },
      {
        prompt: "During **Vulnerability Analysis & Privilege Escalation**, what misconfigurations commonly allow lower-privileged accounts to escalate?",
        correct: "Overly permissive SUID binaries, unquoted/writable service paths, leaked credentials in env/files, and unpatched kernel or sudoers rules violating least privilege.",
        distractors: [
          "Enabling strict role-based access control (RBAC) and parameterized queries",
          "Running unprivileged containers with read-only filesystems",
          "Enforcing bcrypt password hashing and CSRF nonces",
        ],
        explanation: "Least-privilege hardening, strict file/sudo permissions, and credential hygiene close common escalation vectors.",
      },
    ],
  },
  {
    id: "cs50p_python_testing",
    priorityPhrases: ["libraries & unit tests", "functions & variables", "loops & iterations", "object-oriented programming"],
    keywords: ["unit test", "pytest", "assert", "libraries", "cs50p", "test case"],
    questions: [
      {
        prompt: "What makes automated **unit tests** (using `pytest` and `assert`) effective for catching regressions?",
        correct: "Independent test functions assert expected return values and edge cases (including expected exceptions via `pytest.raises`) deterministically after every change.",
        distractors: [
          "Unit tests skip running edge cases so failing assertions never stop builds",
          "Testing functions should print manually to screen instead of asserting values",
          "Pytest only runs inside Jupyter Notebooks when internet access is disabled",
        ],
        explanation: "Automated assertions on small, testable functions detect regressions immediately across boundary inputs.",
      },
      {
        prompt: "Why wrap scripts cleanly with `if __name__ == \"__main__\":` when writing reusable Python libraries and unit tests?",
        correct: "It ensures CLI entry-point logic runs only when executed directly, allowing unit tests to `import` functions safely without side effects.",
        distractors: [
          "Because `pytest` cannot import `.py` files containing lowercase function names",
          "It encrypts local variables inside the module namespace",
          "It turns every imported module into an infinite background loop",
        ],
        explanation: "Guarding `main()` prevents top-level execution side effects when test suites import your module.",
      },
      {
        prompt: "When testing a function that divides numbers or parses user formats, what should tests verify besides normal happy-path inputs?",
        correct: "Negative numbers, zero/empty edge values, boundary inputs, and raised exceptions like `ZeroDivisionError` or `ValueError`.",
        distractors: [
          "Only one hardcoded positive integer input per module",
          "Ignoring all exception branches with empty `try/except` blocks",
          "Testing comments rather than executable logic",
        ],
        explanation: "Thorough unit suites verify both nominal behavior and error/boundary invariants.",
      },
      {
        prompt: "How should third-party or standard libraries (e.g., `random`, `sys`, `requests`) be imported cleanly in Python?",
        correct: "At the top of the module using explicit `import` or `from pkg import fn`, avoiding wildcard `from pkg import *` collisions.",
        distractors: [
          "Inside every iteration of a tight `for` loop",
          "Always copying library source files directly into your script",
          "Calling `pip install` inside `assert` statements",
        ],
        explanation: "Explicit top-level imports keep dependencies clear and prevent namespace pollution.",
      },
    ],
  },
];

function scoreBankMatch(bank: TopicQuestionBank, titleLower: string, bodyLower: string): number {
  let score = 0;
  for (const phrase of bank.priorityPhrases || []) {
    if (titleLower.includes(phrase)) score += 12;
    else if (bodyLower.includes(phrase)) score += 6;
  }
  for (const kw of bank.keywords) {
    if (titleLower.includes(kw)) score += 5;
    else if (bodyLower.includes(kw)) score += 2;
  }
  return score;
}

function buildContextDerivedFallbackQuestions(
  ctx: LessonQuizContext,
  alreadyPrompts: Set<string>,
  needed: number,
  seed: number,
  startSeconds: number,
  endSeconds: number
): SynthesizedQuizQuestion[] {
  const cleanTitle = normalizeTopicText(ctx.title) || ctx.title.trim() || "Core Lesson Concepts";
  const courseHead = (ctx.courseTitle || "this course").split(/[|–—]/)[0].trim();
  const takeaways = (ctx.keyTakeaways || []).filter((t) => typeof t === "string" && t.trim().length > 10);
  const definitions = (ctx.importantDefinitions || []).filter((d) => typeof d === "string" && d.trim().length > 10);
  const summarySource = (ctx.summary || ctx.description || ctx.transcriptExcerpt || "").replace(/\s+/g, " ").trim();

  const summarySentences = summarySource
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 28 && s.length <= 210);

  const candidates: RawTopicMCQ[] = [];

  if (definitions[0]) {
    const colonIdx = definitions[0].indexOf(":");
    const term = colonIdx > 0 ? definitions[0].slice(0, colonIdx).trim() : cleanTitle;
    const defBody = colonIdx > 0 ? definitions[0].slice(colonIdx + 1).trim() : definitions[0];
    candidates.push({
      prompt: `Based on "${cleanTitle}", which statement accurately describes ${term}?`,
      correct: defBody,
      distractors: [
        `An anti-pattern that bypasses input checks and hardcodes mutable state globally`,
        `A deprecated feature that cannot be used inside modern ${courseHead} workflows`,
        `A build-only script unrelated to ${cleanTitle}`,
      ],
      explanation: `${term}: ${defBody}`,
    });
  }

  if (takeaways[0]) {
    candidates.push({
      prompt: `Which core takeaway directly applies when implementing "${cleanTitle}"?`,
      correct: takeaways[0],
      distractors: [
        `Skipping validation constraints and ignoring failing edge cases in production`,
        `Duplicating unstructured scripts instead of modular design`,
        `Suppressing runtime exceptions so bugs stay hidden from callers`,
      ],
      explanation: `This lesson highlights: ${takeaways[0]}`,
    });
  }

  if (summarySentences[0]) {
    candidates.push({
      prompt: `According to the lecture "${cleanTitle}", what is emphasized in this segment?`,
      correct: summarySentences[0],
      distractors: [
        `Avoiding structured workflows and relying purely on trial-and-error guesswork`,
        `Removing verification steps once code runs without syntax warnings once`,
        `Hardcoding user inputs directly into application source files`,
      ],
      explanation: summarySentences[0],
    });
  }

  candidates.push(
    {
      prompt: `What is the primary learning objective of "${cleanTitle}" in ${courseHead}?`,
      correct: summarySource && summarySource.length <= 180
        ? summarySource
        : `Understanding core mechanics, practical syntax, and verifiable application of ${cleanTitle}.`,
      distractors: [
        `Bypassing foundational mechanics and memorising unrelated boilerplate`,
        `Disabling runtime validation and ignoring error handling altogether`,
        `Treating ${cleanTitle} as isolated theory with zero real-world workflow integration`,
      ],
      explanation: `Mastering ${cleanTitle} builds both conceptual clarity and practical problem-solving reliability.`,
    },
    {
      prompt: `When debugging or testing code written after "${cleanTitle}", which engineering habit ensures reliable behavior?`,
      correct: `Checking boundary inputs, validating state transitions, and testing outputs systematically across expected scenarios.`,
      distractors: [
        `Skipping edge-case inputs so errors remain hidden during execution`,
        `Relying on implicit global side effects across unrelated modules`,
        `Deleting diagnostic checks immediately after writing the first draft`,
      ],
      explanation: `Explicit edge-case validation and clear structure prevent subtle bugs when applying ${cleanTitle}.`,
    },
    {
      prompt: `How does "${cleanTitle}" connect to building complete real-world projects in ${courseHead}?`,
      correct: takeaways[1] || `It supplies composable building blocks and clean contracts that later modules rely upon safely.`,
      distractors: [
        `It forces projects to rewrite core standard behavior from scratch without reuse`,
        `It applies only to static files and cannot handle dynamic inputs`,
        `It must be removed before shipping production features`,
      ],
      explanation: `Concepts taught in ${cleanTitle} form an integral layer within end-to-end workflows.`,
    }
  );

  const built: SynthesizedQuizQuestion[] = [];
  for (let i = 0; i < candidates.length && built.length < needed; i++) {
    const c = candidates[i];
    if (alreadyPrompts.has(c.prompt)) continue;
    alreadyPrompts.add(c.prompt);
    built.push(buildRotatedMCQ(c, seed + 1, built.length + 2, startSeconds, endSeconds));
  }
  return built;
}

/**
 * Deterministically synthesizes 4 topic-accurate MCQs strictly tailored to what is taught in a lesson.
 */
export function synthesizeLessonQuizQuestions(
  ctx: LessonQuizContext,
  desiredCount = 4
): SynthesizedQuizQuestion[] {
  const startSeconds = Math.max(0, Number(ctx.startSeconds ?? 0));
  const endSeconds = Math.max(startSeconds + 60, Number(ctx.endSeconds ?? startSeconds + 300));
  const partOffset = extractPartOffset(ctx.title);
  const seed = (ctx.lessonIndex ?? 0) + partOffset;

  const normalizedTitle = normalizeTopicText(ctx.title).toLowerCase();
  const fullBody = [
    ctx.description || "",
    ctx.summary || "",
    ...(ctx.keyTakeaways || []),
    ...(ctx.importantDefinitions || []),
    ctx.chapterTitle || "",
    ctx.courseTitle || "",
  ]
    .join(" ")
    .toLowerCase();

  const ranked = TOPIC_QUESTION_BANKS.map((bank) => ({
    bank,
    score: scoreBankMatch(bank, normalizedTitle, fullBody),
  }))
    .filter((item) => item.score >= 4)
    .sort((a, b) => b.score - a.score);

  const selectedRaw: RawTopicMCQ[] = [];
  const usedPrompts = new Set<string>();

  for (const { bank } of ranked) {
    // Rotate starting question slightly across Part 1..4 modules sharing a theme
    const bankLen = bank.questions.length;
    const offset = bankLen > 0 ? partOffset % bankLen : 0;
    for (let j = 0; j < bankLen && selectedRaw.length < desiredCount; j++) {
      const q = bank.questions[(j + offset) % bankLen];
      if (!usedPrompts.has(q.prompt)) {
        usedPrompts.add(q.prompt);
        selectedRaw.push(q);
      }
    }
    if (selectedRaw.length >= desiredCount) break;
  }

  const output: SynthesizedQuizQuestion[] = selectedRaw.map((raw, idx) =>
    buildRotatedMCQ(raw, seed, idx, startSeconds, endSeconds)
  );

  if (output.length < desiredCount) {
    const derived = buildContextDerivedFallbackQuestions(
      ctx,
      usedPrompts,
      desiredCount - output.length,
      seed,
      startSeconds,
      endSeconds
    );
    output.push(...derived);
  }

  return output.slice(0, desiredCount);
}

/**
 * Uses external LLM (when NVIDIA_API_KEY or OPENAI_API_KEY is configured & AI_PROVIDER is set) to generate
 * 4 lecture-grounded quiz questions, falling back cleanly to `synthesizeLessonQuizQuestions` on timeout/local mode.
 */
export async function generateLessonQuizQuestions(
  ctx: LessonQuizContext,
  desiredCount = 4
): Promise<SynthesizedQuizQuestion[]> {
  const provider = getAIProvider();
  const isExternalLLM = provider.name !== "Local Deterministic Synthesizer";

  if (isExternalLLM) {
    try {
      const cleanTitle = normalizeTopicText(ctx.title) || ctx.title;
      const startSeconds = Math.max(0, Number(ctx.startSeconds ?? 0));
      const endSeconds = Math.max(startSeconds + 60, Number(ctx.endSeconds ?? startSeconds + 300));
      const span = Math.max(30, endSeconds - startSeconds);

      const prompt = `Create exactly ${desiredCount} high-quality multiple-choice quiz questions specifically testing what was taught in this lecture:
Course: ${ctx.courseTitle || "Course"}
Chapter/Day: ${ctx.chapterTitle || "Module"}
Lecture Title: ${cleanTitle}
Description/Summary: ${(ctx.summary || ctx.description || "").slice(0, 500)}
${ctx.keyTakeaways?.length ? `Key Takeaways:\n- ${ctx.keyTakeaways.slice(0, 4).join("\n- ")}` : ""}
${ctx.transcriptExcerpt ? `Transcript Excerpt:\n"${ctx.transcriptExcerpt.slice(0, 600)}"` : ""}

Requirements:
- Each question MUST be concrete, technical, and directly reflect "${cleanTitle}".
- Each question MUST have exactly 4 distinct options and a valid correctOptionIndex (0-3).
- Vary correctOptionIndex across questions.
- Provide a concise 1-sentence explanation for the correct answer.`;

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
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 6500)),
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
          .slice(0, desiredCount)
          .map((q, idx) => ({
            questionText: q.questionText!.trim(),
            options: q.options!.map((o) => o.trim()),
            correctOptionIndex: q.correctOptionIndex!,
            explanation: (q.explanation || `Directly covered in "${cleanTitle}".`).trim(),
            replayTimestampSeconds: Math.max(
              0,
              Math.floor(startSeconds + span * ([0.18, 0.42, 0.66, 0.85][idx % 4]))
            ),
          }));

        if (valid.length >= desiredCount) {
          return valid;
        }
      }
    } catch {
      // Seamlessly fall back to high-signal concept quiz synthesis
    }
  }

  return synthesizeLessonQuizQuestions(ctx, desiredCount);
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

async function runEnsureLessonQuizzesInDb(lessonId: string, ctx: LessonQuizContext) {
  const existing = await prisma.quizQuestion.findMany({
    where: { lessonId },
    orderBy: { orderIndex: "asc" },
    include: QUIZ_INCLUDE,
  });
  if (existing.length > 0) {
    return existing;
  }

  const generated = await generateLessonQuizQuestions(ctx, 4);

  const recheck = await prisma.quizQuestion.findMany({
    where: { lessonId },
    orderBy: { orderIndex: "asc" },
    include: QUIZ_INCLUDE,
  });
  if (recheck.length > 0) {
    return recheck;
  }

  await prisma.$transaction(
    generated.map((q, qIdx) =>
      prisma.quizQuestion.create({
        data: {
          lessonId,
          orderIndex: qIdx,
          questionText: q.questionText,
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation,
          replayTimestampSeconds: q.replayTimestampSeconds,
          options: {
            create: q.options.map((optText, optIdx) => ({
              optionIndex: optIdx,
              optionText: optText,
            })),
          },
        },
      })
    )
  );

  return prisma.quizQuestion.findMany({
    where: { lessonId },
    orderBy: { orderIndex: "asc" },
    include: QUIZ_INCLUDE,
  });
}

/**
 * Self-heals any lesson that has 0 persisted `QuizQuestion`s in PostgreSQL by generating & saving
 * 4 class-specific questions safely without duplicating or exhausting Supabase pooler connections.
 */
export async function ensureLessonQuizzesInDb(lessonId: string, ctx: LessonQuizContext) {
  const existingPromise = inFlightQuizCreation.get(lessonId);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = runEnsureLessonQuizzesInDb(lessonId, ctx).finally(() => {
    inFlightQuizCreation.delete(lessonId);
  });
  inFlightQuizCreation.set(lessonId, promise);
  return promise;
}
