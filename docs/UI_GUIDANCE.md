# CourseIt Design System & Token-Driven UI Guidance

## 1. Context and Goals

### Design Intent
Deliver a structured, content-first, token-driven design system for CourseIt's marketing and dashboard surfaces that guarantees WCAG 2.2 AA accessibility, zero visual drift across dense viewports, and deterministic state transitions for readers and knowledge seekers.

### Surface Scope & Page Component Density
This specification governs CourseIt's marketing site and core web surfaces, calibrated to high-density layouts:
- **Links (`54` instances)**: Global navigation links, footer directory nodes, breadcrumbs, inline course references, external resource targets.
- **Cards (`28` instances)**: Course catalog tiles, chapter breakdown blocks, testimonial units, pricing tier containers, diagnostic stat tiles.
- **Buttons (`17` instances)**: Primary CTAs ("Generate Course", "Start Free"), secondary toggles, billing switchers, modal actions.
- **Lists (`8` instances)**: Curriculum syllabus trees, feature comparison breakdowns, daily task agendas, search filtering tags.
- **Navigation (`7` instances)**: Sticky top header, mobile off-canvas drawer, footer link groups, breadcrumb bars, tab ribbons.
- **Inputs (`1` primary core instance)**: High-impact hero YouTube URL intake bar with fallback configuration states.

---

## 2. Design Tokens and Foundations

All components **must** consume semantic design tokens. Direct raw hex values, arbitrary pixel dimensions, and ad-hoc utility classes are strictly prohibited.

### 2.1 Typography System

```css
:root {
  /* Font Family Tokens */
  --font-family-primary: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-stack: 'Instrument Sans', 'Instrument Sans Fallback', 'Helvetica Neue', Arial, sans-serif;

  /* Base Typography */
  --font-size-base: 16px;
  --font-weight-base: 400;
  --font-line-height-base: 24.8px;

  /* Type Scale */
  --font-size-xs: 13.12px;   /* Captions, badges, fine print */
  --font-size-sm: 13.6px;    /* Secondary meta, breadcrumbs */
  --font-size-md: 14.72px;   /* Compact table cells, sub-labels */
  --font-size-lg: 15.2px;    /* Form labels, secondary buttons */
  --font-size-xl: 16px;      /* Standard body copy, primary inputs */
  --font-size-2xl: 18.4px;   /* Card headers, subheadings */
  --font-size-3xl: 21.6px;   /* Section headers, modal titles */
  --font-size-4xl: 30.4px;   /* Hero headlines, display banners */

  /* Line Heights */
  --line-height-tight: 1.15;
  --line-height-snug: 1.35;
  --line-height-normal: 1.55;

  /* Font Weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

### 2.2 Color System & Semantic Mapping

```css
:root {
  /* Primitive Raw Tokens */
  --raw-border-default: #0f1611;
  --raw-text-secondary: #4c4c3d;
  --raw-text-tertiary: #f6f8ec;
  --raw-surface-base: #000000;
  --raw-surface-muted: #ffffff;
  --raw-surface-raised: #4b5e1e;
  --raw-surface-strong: #fcfcfa;
  --raw-focus-ring: oklab(0.505428 -0.00404841 -0.136356 / 0.5);

  /* Semantic Surface Tokens */
  --color-surface-canvas: var(--raw-surface-base);              /* Deep backdrop: #000000 */
  --color-surface-panel: rgba(15, 22, 17, 0.85);                /* Dark glass surface */
  --color-surface-panel-raised: var(--raw-surface-raised);      /* Olive accent container: #4b5e1e */
  --color-surface-card: #080c09;                                /* Dark contrast tile */
  --color-surface-card-hover: #0e1510;                          /* Hover tile highlight */
  --color-surface-overlay: rgba(0, 0, 0, 0.75);                 /* Backdrop scrim */
  --color-surface-inverse: var(--raw-surface-strong);           /* High contrast light surface: #fcfcfa */

  /* Semantic Text Tokens */
  --color-text-primary: var(--raw-surface-strong);              /* Pure reading text: #fcfcfa */
  --color-text-secondary: #9ea89f;                              /* Secondary metadata (accessible on dark) */
  --color-text-muted: var(--raw-text-secondary);                /* Tertiary captions: #4c4c3d */
  --color-text-accent: var(--raw-text-tertiary);                /* Pale highlight text: #f6f8ec */
  --color-text-inverse: var(--raw-surface-base);                /* Dark text on light chips: #000000 */

  /* Semantic Border & Divider Tokens */
  --color-border-subtle: rgba(246, 248, 236, 0.12);             /* Hairline dark borders */
  --color-border-default: var(--raw-border-default);            /* Standard border: #0f1611 */
  --color-border-hover: rgba(246, 248, 236, 0.35);             /* Hover stroke */
  --color-border-active: var(--raw-surface-raised);             /* Active outline */

  /* Semantic Interactive Tokens */
  --color-interactive-primary: var(--raw-surface-strong);       /* Primary action fill */
  --color-interactive-primary-hover: var(--raw-text-tertiary);  /* Primary hover state */
  --color-interactive-primary-text: var(--raw-surface-base);    /* Contrast label text */
  --color-interactive-accent: var(--raw-surface-raised);        /* Olive highlight */
  --color-focus-ring: var(--raw-focus-ring);                    /* Accessible focus ring */

  /* Functional Status Tokens */
  --color-status-success: #22c55e;
  --color-status-warning: #eab308;
  --color-status-error: #ef4444;
  --color-status-info: #38bdf8;
}
```

### 2.3 Spacing Scale

```css
:root {
  --space-1: 2px;       /* Micro offsets, hairline icon paddings */
  --space-2: 10px;      /* Compact gap, button vertical padding */
  --space-3: 12px;      /* Standard element gap, pill padding */
  --space-4: 14px;      /* Card internal gutters, input padding */
  --space-5: 18px;      /* Section sub-spacing, card padding */
  --space-6: 19.14px;   /* Grid gutters, macro margins */
}
```

### 2.4 Radius, Elevation & Motion Tokens

```css
:root {
  /* Corner Radius Tokens */
  --radius-xs: 14px;            /* Badges, tags, small utility buttons */
  --radius-sm: 16.8px;          /* Inputs, secondary buttons */
  --radius-md: 18px;            /* Nested preview boxes, tooltips */
  --radius-lg: 22px;            /* Catalog cards, modal sheets */
  --radius-xl: 32px;            /* Hero banner panels, feature frames */
  --radius-2xl: 22369600px;     /* Pill shapes, circular avatars */

  /* Shadow & Elevation Tokens */
  --shadow-1: 0px 0px 0px 1px rgba(15, 22, 17, 0.09);
  --shadow-2: 0px 30px 60px -30px rgba(22, 49, 92, 0.45);
  --shadow-focus: 0 0 0 3px var(--color-focus-ring);

  /* Motion Tokens */
  --motion-duration-instant: 150ms;
  --motion-duration-fast: 200ms;
  --motion-ease-standard: cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

## 3. Component-Level Rules

### 3.1 Buttons (`density: 17`)

#### 3.1.1 Anatomy
A Button component comprises:
1. **Container**: Tokenized background, border, radius, and elevation.
2. **Leading Icon (Optional)**: Inline SVG icon sized to `16px` with `--space-2` right margin.
3. **Label**: Concise action text bound to `--font-size-lg` or `--font-size-md` with `--font-weight-medium`.
4. **Trailing Indicator (Optional)**: Action indicator (e.g. arrow, chevron, keyboard shortcut).
5. **Loading Spinner**: Embedded SVG spinner replacing or prepending label during async triggers.

#### 3.1.2 Variants
- **Primary**: High-contrast call to action. Background: `--color-interactive-primary`, Text: `--color-interactive-primary-text`, Border: transparent.
- **Secondary**: Elevated neutral action. Background: `--color-surface-panel`, Text: `--color-text-primary`, Border: `1px solid --color-border-subtle`.
- **Accent/Brand**: Featured value action. Background: `--color-surface-panel-raised`, Text: `--color-text-primary`, Border: `1px solid rgba(246, 248, 236, 0.25)`.
- **Ghost/Tertiary**: Low-emphasis action. Background: transparent, Text: `--color-text-secondary`, Border: transparent.
- **Destructive**: Negative actions. Background: rgba(239, 68, 68, 0.12), Text: `--color-status-error`, Border: `1px solid rgba(239, 68, 68, 0.3)`.

#### 3.1.3 State Rules
| State | Visual Treatment | Pointer / Touch Behavior | Keyboard Behavior |
| :--- | :--- | :--- | :--- |
| **Default** | Tokenized background, standard text token, `box-shadow: --shadow-1`. | Cursor: `pointer`. Touch target: minimum `44px x 44px`. | Focusable via <kbd>Tab</kbd>. |
| **Hover** | Background transition (`--motion-duration-instant`), elevation: `--shadow-2`. | Visual feedback triggered on hover. | N/A (Pointer only). |
| **Focus-Visible** | Outline: none. Box-shadow: `0 0 0 3px var(--color-focus-ring)`. Offset: `--space-1`. | Focus indicator visible upon keyboard traversal. | Highlighted via <kbd>Tab</kbd>. Activated via <kbd>Enter</kbd> or <kbd>Space</kbd>. |
| **Active** | Scale transform: `0.98`. Background shifted darker by 5%. | Visual compression on press. | Triggered on keydown of <kbd>Space</kbd>/<kbd>Enter</kbd>. |
| **Disabled** | Opacity: `0.45`. Background: `--color-surface-card`. Cursor: `not-allowed`. | Pointer-events: none. Tooltip disabled or wrapped in container. | Not reachable via <kbd>Tab</kbd> (`aria-disabled="true"` or `disabled`). |
| **Loading** | Spinner replaces leading icon. Label reads "Generating...", "Saving...". | Pointer clicks suppressed. Cursor: `wait`. | Non-interactive while pending. |
| **Error** | Border: `1px solid var(--color-status-error)`. Pulse animation applied. | Displays error tooltip or associated announcement. | Screen reader receives `aria-live="assertive"`. |

#### 3.1.4 Responsive & Overflow Behavior
- Button labels **must** never truncate with an ellipsis. If space is restricted, buttons **must** wrap to a vertical stack or adopt flex auto-growth.
- On viewports `< 640px`, primary action buttons **must** stretch to full container width (`width: 100%`) with minimum touch height of `48px`.

---

### 3.2 Cards (`density: 28`)

#### 3.2.1 Anatomy
1. **Container Frame**: Boundary styled with `--color-surface-card`, `--radius-lg`, and `--color-border-subtle`.
2. **Media / Thumbnail Area**: Video preview or icon badge bounded by `--radius-md`.
3. **Badge Metadata Group**: Difficulty, duration, and status tags (`--radius-xs`).
4. **Header Title**: Heading element (`--font-size-2xl`, `--font-weight-semibold`).
5. **Body Description**: Explanatory copy (`--font-size-md`, `--color-text-secondary`, line clamp: 2).
6. **Footer / Action Bar**: Progress meter, timestamp link, or direct action trigger.

#### 3.2.2 Variants
- **Course Catalog Card**: Displays YouTube thumbnail, title, author, lesson count, and placement test badge.
- **Diagnostic Result Card**: Displays concept proficiency percentage, skipped lesson total, and retake trigger.
- **Daily Task Card**: Interactive checkable lesson target with remaining duration and direct "Learn Now" link.
- **Pricing Tier Card**: Features price headline, billing interval toggle, feature checklist, and checkout trigger.

#### 3.2.3 State Rules
- **Default**: Background: `--color-surface-card`, Border: `1px solid var(--color-border-subtle)`, Shadow: `--shadow-1`.
- **Hover**: Background: `--color-surface-card-hover`, Border: `1px solid var(--color-border-hover)`, Shadow: `--shadow-2`, Transform: `translateY(-2px)`.
- **Focus-Visible**: Card container or inner interactive anchor displays `--shadow-focus`.
- **Active / Pressed**: Transform: `translateY(0px)`, Scale: `0.99`.
- **Disabled**: Desaturated opacity: `0.5`, click handler inert, `aria-disabled="true"`.
- **Loading (Skeleton)**: Animated gradient shimmer (`--motion-duration-fast` pulse) across image and text bars.
- **Empty State**: Centered illustration or icon, explanatory empty message, and "Create New Course" action button.

#### 3.2.4 Responsive & Overflow Behavior
- Multi-column card grids **must** scale gracefully: 3 columns on `>= 1024px`, 2 columns on `640px - 1023px`, 1 column on `< 640px`.
- Titles exceeding 2 lines **must** use `-webkit-line-clamp: 2` with accessible `title` attribute providing full text.

---

### 3.3 Links (`density: 54`)

#### 3.3.1 Anatomy
- Text or inline element with explicit semantic meaning (`<a>` or `<Link>`).
- Optional trailing external link indicator SVG for third-party navigation.

#### 3.3.2 Variants
- **Navigation Link**: Main menu item with `--font-size-lg`, `--font-weight-medium`, and active indicator bar.
- **Body / Inline Link**: Underlined text within paragraph copy with contrast `--color-text-primary`.
- **Footer Directory Link**: Subtle text (`--color-text-secondary`, `--font-size-sm`) with instant hover illumination.
- **Breadcrumb Link**: Step-by-step hierarchical trail separated by accessible `/` delimiter.

#### 3.3.3 State Rules
- **Default**: Color: `--color-text-secondary`, Text-decoration: none (for navigation) or underline (for inline text).
- **Hover**: Color: `--color-text-primary`, Text-decoration: underline, Duration: `--motion-duration-instant`.
- **Focus-Visible**: Outline: `2px solid var(--color-focus-ring)`, Outline-offset: `2px`, Radius: `2px`.
- **Active**: Color: `--color-text-accent`, Scale: `0.99`.
- **Disabled**: Color: `--color-text-muted`, Pointer-events: none, `aria-disabled="true"`.
- **Loading**: Inline pulse effect with `aria-busy="true"`.

#### 3.3.4 Responsive & Overflow Behavior
- Links **must** maintain a minimum hit target area of `44px x 44px` on mobile viewports.
- Inline links **must** wrap with normal word boundaries without clipping or breaking word tokens awkwardly.

---

### 3.4 Navigation Components (`density: 7`)

#### 3.4.1 Anatomy
1. **Brand Cluster**: CourseIt logo with gradient mark and home route link.
2. **Primary Route Cluster**: Explore Courses, Roadmaps, Pricing, Dashboard, Daily Plan, Notes.
3. **Utility Cluster**: Streak Counter Flame Badge, User Menu / Login trigger, "Build Course" primary CTA.
4. **Mobile Toggle Button**: Accessible hamburger menu icon (`aria-expanded="false"`, `aria-label="Toggle navigation"`).

#### 3.4.2 Variants
- **Sticky Marketing Header**: Frosted glass panel (`backdrop-filter: blur(16px)`), height: `64px`, fixed at `top: 0`, `z-index: 50`.
- **Lesson Player Theater Header**: Minimalist header with direct curriculum back-link and lesson switcher.
- **Mobile Drawer**: Slide-in full height sheet (`max-width: 320px`) with stacked route links and profile metrics.
- **Footer Sitemap**: 4-column organized directory with copyright and live system status indicator.

#### 3.4.3 State Rules
- **Default**: Background: `rgba(0, 0, 0, 0.85)`, Border-bottom: `1px solid var(--color-border-subtle)`.
- **Scrolled**: Elevated with `--shadow-2` when scroll position `window.scrollY > 20px`.
- **Item Hover**: Background: `rgba(255, 255, 255, 0.05)`, Radius: `--radius-xs`.
- **Item Active / Current Page**: Highlighted with `--color-text-primary`, indicator pill or glowing under-bar, `aria-current="page"`.
- **Mobile Open State**: Focus trapped within mobile menu drawer until explicitly dismissed via <kbd>Escape</kbd> or close button.

---

### 3.5 Lists (`density: 8`)

#### 3.5.1 Anatomy
Ordered (`<ol>`) or unordered (`<ul>`) semantic markup containing `<li>` nodes with structured leading bullet/number, title, and auxiliary meta.

#### 3.5.2 Variants
- **Curriculum Outline List**: Chapter hierarchy containing sequential video lessons with duration stamps and completion marks.
- **Placement Diagnostic Result List**: Tested concepts paired with pass/fail badges and skip statuses.
- **Daily Planner Agenda List**: Time-slotted tasks with checkbox toggles and "Replay Lesson" links.
- **Feature Comparison Matrix**: Pro vs Free capability bullets with check/cross glyphs.

#### 3.5.3 State Rules
- **Item Default**: Padding: `--space-3` vertical, `--space-4` horizontal, Border-bottom: `1px solid var(--color-border-subtle)`.
- **Item Hover**: Background: `--color-surface-card-hover`, Transition: `--motion-duration-instant`.
- **Item Checked / Completed**: Strikethrough style or dimming to `--color-text-secondary` with emerald check glyph.
- **Item Disabled**: Opacity: `0.4`, interactions suppressed.
- **Item Error / Replay Required**: Rose highlight border with "Replay at MM:SS" button.

---

### 3.6 Inputs (`density: 1 - Hero Generator Intake`)

#### 3.6.1 Anatomy
1. **Intake Container**: Glassmorphic capsule styled with `--radius-2xl` or `--radius-sm`.
2. **Leading Icon**: Video camera or YouTube logo (`--space-4` left inset).
3. **Text Input Element**: Native `<input type="url">` with `--font-size-xl`.
4. **Action Button**: Primary "Generate Course" button nestled inside container or adjacent.
5. **Inline Helper / Error Strip**: Live validation feedback message located directly below input.

#### 3.6.2 State Rules
| State | Visual Treatment | Interaction / Validation Behavior |
| :--- | :--- | :--- |
| **Default** | Border: `1px solid var(--color-border-subtle)`, Background: `rgba(15, 22, 17, 0.8)`. | Shows placeholder: "Paste any YouTube video or playlist link here...". |
| **Hover** | Border: `1px solid var(--color-border-hover)`. | Visual indicator of interactive capability. |
| **Focus-Visible** | Border: `1px solid var(--color-interactive-primary)`. Box-shadow: `--shadow-focus`. | Caret visible, placeholder dims, screen reader reads accessible label. |
| **Active / Filled** | Text: `--color-text-primary`. Clear button appears on right. | User input validated against YouTube URL regex on change/blur. |
| **Disabled** | Background: `--color-surface-card`, Text: `--color-text-muted`, Cursor: `not-allowed`. | Prevents input submission; `disabled` attribute set. |
| **Loading** | Input locked, animated progress bar slides beneath input border. | Submit button shows spinner and disables further key entries. |
| **Error** | Border: `1px solid var(--color-status-error)`, Box-shadow: `0 0 0 2px rgba(239, 68, 68, 0.25)`. | Error message displayed below input with `role="alert"` (e.g. "Please enter a valid YouTube video or playlist URL"). |

---

## 4. Accessibility Requirements & Testable Acceptance Criteria

CourseIt **must** meet WCAG 2.2 Level AA across all interactive workflows.

### 4.1 Contrast Constraints
1. **Text Contrast**: Normal text (`< 18.4px` or `< 14px bold`) **must** achieve a contrast ratio of at least `4.5:1` against its background.
2. **Large Text Contrast**: Headings (`>= 18.4px` or `>= 14px bold`) **must** achieve at least `3.0:1`.
3. **UI Components & Borders**: Active input boundaries, button edges, and focus indicators **must** achieve at least `3.0:1` against adjacent surfaces.

### 4.2 Keyboard Navigation & Focus Rules
1. Every interactive element **must** be operable via keyboard alone.
2. Focus order **must** follow logical reading order (top to bottom, left to right).
3. Focus indicators **must** never be removed (`outline: none` without replacement is strictly forbidden). The standard focus ring **must** be `0 0 0 3px var(--color-focus-ring)` with at least `2px` contrast offset.
4. Modals and drawers **must** trap keyboard focus within the dialog when open and return focus to the invoking trigger upon closure.
5. Users **must** be able to dismiss floating modals, tooltips, or drawers by pressing <kbd>Escape</kbd>.

### 4.3 Testable Acceptance Criteria Matrix

| Criterion ID | Requirement | Test Verification Method | Pass / Fail Rule |
| :--- | :--- | :--- | :--- |
| **AC-A11Y-01** | Focus Ring Visibility | Traverse page via <kbd>Tab</kbd> key. | **PASS**: Every button, link, and input exhibits a high-contrast focus ring of `3px`. **FAIL**: Any invisible focus indicator. |
| **AC-A11Y-02** | Text Color Contrast | Automated scan via Lighthouse / axe-core on dark canvas. | **PASS**: All body copy and headings meet or exceed `4.5:1` (`3:1` for large). **FAIL**: Any contrast warning. |
| **AC-A11Y-03** | Touch Target Size | Measure mobile touch nodes on viewports `< 768px`. | **PASS**: All interactive hit areas are `>= 44px x 44px` or spaced to avoid mis-clicks. **FAIL**: Interactive elements `< 44px`. |
| **AC-A11Y-04** | Form Accessibility | Inspect hero URL input field markup. | **PASS**: Input has an explicitly associated `<label>` or `aria-label="YouTube video or playlist URL"` and communicates errors via `aria-describedby`. |
| **AC-A11Y-05** | Media & Embed Alt Text | Inspect thumbnails and Iframe elements. | **PASS**: All course preview images contain informative `alt` text. The YouTube player iframe contains `title="YouTube video player: [Lesson Title]"`. |
| **AC-A11Y-06** | Screen Reader Live Updates| Trigger course generation or quiz answer submit. | **PASS**: Progress and evaluation results are announced via `aria-live="polite"` or `aria-live="assertive"`. |

---

## 5. Content and Tone Standards

### 5.1 Writing Tone
- **Concise**: Deliver the highest density of instructional value in the fewest possible words.
- **Confident**: Present AI capabilities and diagnostic evaluation directly without vague disclaimers.
- **Implementation-Focused**: Action labels must state exactly what happens upon interaction.

### 5.2 Microcopy Reference Table

| Surface | Prohibited Vague Copy | Prescribed High-Clarity Copy |
| :--- | :--- | :--- |
| **Hero Submit CTA** | "Submit", "Go", "Click Here" | "Generate Course", "Chop Video" |
| **Placement Assessment** | "Take Quiz", "Test" | "Take Diagnostic Placement Test" |
| **Missed Concept Feedback**| "Wrong answer. Try again." | "Missed this concept? Replay explanation at 04:20" |
| **URL Input Validation** | "Invalid URL" | "Please enter a valid YouTube video or playlist link (e.g., https://youtube.com/watch?v=...)" |
| **Daily Planner Target** | "Select time" | "Set daily study goal: 30m, 60m, 90m, or 120m" |
| **Empty State Note** | "No data found" | "No study notes saved yet. Click the timestamp button while watching to capture your first note!" |

---

## 6. Anti-Patterns and Prohibited Implementations

To preserve brand fidelity, performance, and accessibility, engineering teams **must** adhere to the following negative boundaries:

1. **NO Raw Hex Inlining**: Never write `style={{ background: '#000' }}` or arbitrary Tailwind utilities like `bg-[#0f1611]`. Always consume defined CSS variables or custom Tailwind token utilities (`bg-surface-card`, `border-token-subtle`).
2. **NO Low-Contrast Gray Text**: Never use `#71717a` or `#52525b` on dark canvas. Sub-labels must map to `--color-text-secondary` (`#9ea89f`), ensuring compliant `4.5:1` contrast against `#000000`.
3. **NO Non-Descriptive Buttons**: Never create buttons that read only "Click" or use unlabelled icon-only buttons without an `aria-label`.
4. **NO Unhandled Overflow**: Never let long lesson titles or user notes overflow container bounds. Use flex clamping or explicit line clamps.
5. **NO Fake Social Login Buttons**: Never display disabled or non-functional third-party OAuth pills. If a provider is not configured, it must be hidden from the UI.
6. **NO Layout Shifts (CLS > 0.1)**: Always reserve aspect-ratio boxes for YouTube video players (`aspect-video`) and image thumbnails so content does not jump upon loading.

---

## 7. QA Verification Checklist

Before shipping any page or component update, the QA and development teams **must** verify every item in this checklist:

### 7.1 Visual & Token QA
- [ ] Primary font renders with `Instrument Sans`, falling back gracefully to system sans-serif.
- [ ] Typography sizes strictly follow `--font-size-xs` through `--font-size-4xl`.
- [ ] Card corners consistently adopt `--radius-lg` (`22px`) and inputs use `--radius-sm` (`16.8px`).
- [ ] Shadows utilize `--shadow-1` and `--shadow-2` without hardcoded blurry box-shadows.
- [ ] Colors validate against the token dictionary (`--color-surface-card`, `--color-surface-panel`, `--color-surface-panel-raised`).

### 7.2 Interactive States QA
- [ ] Buttons display explicit visual changes for: Default, Hover, Focus-Visible, Active, Disabled, and Loading.
- [ ] Input fields show clear error borders and live error copy when given an invalid link.
- [ ] Quiz answers indicate emerald green for correct selections and rose red with "Replay at MM:SS" for incorrect attempts.
- [ ] Placement tests accurately display skipped lessons with strikethrough and enable one-click unskip.

### 7.3 Accessibility QA
- [ ] Full keyboard walkthrough completed with <kbd>Tab</kbd>, <kbd>Shift+Tab</kbd>, <kbd>Enter</kbd>, and <kbd>Space</kbd>.
- [ ] Zero focus traps encountered outside intentionally modal dialogs.
- [ ] Lighthouse Accessibility score evaluates at `100 / 100`.
- [ ] axe DevTools automated scan returns 0 critical, 0 serious, and 0 moderate accessibility issues.
- [ ] Screen reader (VoiceOver or NVDA) announces interactive states, button loading states, and live quiz feedback accurately.

### 7.4 Cross-Device & Viewport QA
- [ ] Desktop tested at `1440px` and `1920px`.
- [ ] Tablet tested at `768px` and `1024px`.
- [ ] Mobile tested at `375px` and `414px` with verified touch targets `>= 44px`.
- [ ] Dark theme rendering verified without light-mode flashes or un-themed white dialogs.

