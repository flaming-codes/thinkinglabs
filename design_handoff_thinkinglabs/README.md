# Handoff: thinkinglabs (Forum design system)

## Overview

`thinkinglabs` is a personal-thinking website. It exposes its author's reasoning under public scrutiny: every claim has an explicit confidence number; every prediction has a resolution date and a confidence-over-time history; every changed mind shows the before, the after, and the evidence that tipped it; every decision shows the alternatives that were rejected. The site is built so the author can be wrong in public and the record stays.

This handoff covers the **Forum** variation — a serif-led editorial design system inspired by independent magazine typography. There are eleven distinct page templates in the bundle.

## About the Design Files

The files in `source/` are **design references created in HTML/JSX** — interactive prototypes showing intended look, layout, and behavior. They are **not production code to copy directly**. The task is to **recreate these designs in the target codebase's environment** (whatever framework `thinkinglabs` is actually built in — likely Next.js or Astro for a markdown-backed personal site) using its established patterns: routing, content-loading, and component conventions.

If the target codebase has no established conventions yet, Next.js (App Router) with markdown loading via `gray-matter` + `remark` is a sensible default and matches the site's "markdown canonical, SQLite derived" decision.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, and layout are settled. The developer should reproduce the visual output pixel-for-pixel using the codebase's existing CSS approach (CSS modules, Tailwind, vanilla-extract, etc.). Inline styles in the source are scaffolding for the prototype, not the recommended production approach.

## Design philosophy — read this before implementing

Six principles drive every page. If you find yourself violating one, push back.

1. **No rectangular badges anywhere.** State indicators are `dot + uppercase mono label` — a small filled or outlined circle next to short text. Never a bordered or filled rectangle.
2. **Confidence is a first-class typographic element.** When a confidence number appears at page scale, it is set in the display serif at 144–320pt, not in a small badge.
3. **Mono labels mark structure.** The mono font is used only for: section markers (`§ 01 / context`), eyebrows, dates in lists, kind labels in cross-reference rows, and small captions. It is never used for body text.
4. **Section headers use the `§ NN / label` pattern.** Two lines: a small uppercase mono label on the left, a large display-italic title on the right, separated by a 64px column gap and a 1px hairline above the row.
5. **Italics carry voice.** The display italic is used for: section titles, decks/sub-headlines, pull quotes, "what I'm watching for" review questions, and any first-person admission. Roman is used for the load-bearing claim.
6. **Hairlines, not boxes.** Sections are separated by 1px borders in `--line` (#e5e2dc), not by background colors or shadows. Two background colors maximum across the whole site (warm white #ffffff, paper #faf8f3).

## Pages in the bundle

| Page                   | Path                     | File                              |
| ---------------------- | ------------------------ | --------------------------------- |
| Home (now / index)     | `/`                      | `variation-fashion.jsx`           |
| Claims index           | `/claims`                | `variation-fashion-pages.jsx`     |
| Claim detail           | `/claims/:slug`          | `variation-fashion-pages.jsx`     |
| Inputs index           | `/inputs`                | `variation-fashion-extras.jsx`    |
| Input detail           | `/inputs/:slug`          | `variation-fashion-extras.jsx`    |
| Thoughts feed          | `/thoughts`              | `variation-fashion-thoughts.jsx`  |
| Thought detail         | `/thoughts/:slug`        | `variation-fashion-thoughts.jsx`  |
| Posts listing          | `/posts`                 | `variation-fashion-posts.jsx`     |
| Post detail (essay)    | `/posts/:slug`           | `variation-fashion-posts.jsx`     |
| Prediction detail      | `/predictions/:slug`     | `variation-fashion-epistemic.jsx` |
| Changed-my-mind detail | `/changed-my-mind/:slug` | `variation-fashion-epistemic.jsx` |
| Decision detail        | `/decisions/:slug`       | `variation-fashion-epistemic.jsx` |

## Design tokens

Use these as CSS custom properties (or whatever your codebase uses for tokens). Defined in `variation-fashion.jsx` under `FASHION_THEMES.forum`.

### Colors

```css
--bg: #ffffff; /* page background */
--paper: #faf8f3; /* tinted band, warm cream */
--paperAlt: #fafaf6; /* second tint, used in CMM right column */
--ink: #0a0a0a; /* primary text + load-bearing UI */
--soft: #2a2a2a; /* secondary text */
--muted: #6a6a6a; /* mono labels, dates, small captions */
--line: #e5e2dc; /* hairlines */
--footBg: #0a0a0a; /* footer */
--footFg: #ffffff; /* footer text */
--footMuted: #7a7a7a; /* footer secondary */
```

No accent color in the Forum theme. The variation `B3 / bone-accent` introduces a `#c44a2a` terracotta — keep that out of Forum.

### Typography

```css
--display: "Forum", Georgia, serif; /* display serif */
--mono: "JetBrains Mono", ui-monospace, monospace;
--body: "Forum", Georgia, serif; /* body uses the same family */
```

Forum is a free Google font. Load with `400` weight. The display serif has a real italic — use it.

**Type scale (px / line-height / letter-spacing):**

| Use                            | Size    | Line      | Letter               |
| ------------------------------ | ------- | --------- | -------------------- |
| Page hero / lede               | 88–168  | 0.96–1.05 | -0.022em             |
| Drop cap (post detail)         | 124     | 0.85      | -0.04em              |
| Section title (display italic) | 56–88   | 0.98–1.05 | -0.022em             |
| Confidence number (page scale) | 144–320 | 0.86      | -0.04em              |
| Pull quote                     | 56      | 1.15      | -0.022em             |
| Body                           | 22–28   | 1.45–1.55 | -0.003em to -0.005em |
| Italic deck / sub-headline     | 22–32   | 1.35–1.5  | normal               |
| Mono eyebrow / section label   | 11      | 1         | 0.22em uppercase     |
| Mono small (dates, kinds)      | 11–13   | 1         | 0.08em–0.18em        |

### Spacing

The page uses a fixed 80px outer padding and a 64px column gap between the mono label column and the content column in section headers. Not a fluid system.

```css
--pad-x: 80px;
--col-gap: 64px;
--section-label-col: 240px; /* width of left mono column in section headers */
```

Vertical rhythm: 100–120px between major sections, 56px between section header and content, 24–32px between rows in a list, 1px borders separating rows in a list.

### Borders & radius

- Hairline: `1px solid var(--line)` for all dividers
- No border-radius anywhere except small circular dots
- No shadows
- Filled dot: `8–14px circle, background var(--ink)`
- Outlined dot: `8–14px circle, border 1px var(--ink), background transparent`

## Component patterns

These are the load-bearing patterns. Implement them as reusable primitives.

### `<Header>`

Fixed-row header at top of every page. Logo on left (small dot inside ring + "thinkinglabs" wordmark), nav items in the middle (Index, Now, Calibration, Brain-diff, About), CTA on the right ("Get in touch ↗"). Height ~80px, `padding: 28px 80px`, `border-bottom: 1px solid var(--line)`.

### `<SectionHeader label title>`

Two-column row, used to open every numbered section.

```
<grid columns="240px 1fr" gap=64>
  <span class="mono-label">§ 01 / context</span>
  <h2 class="display-italic">What I was facing.</h2>
</grid>
```

The grid sits on `border-top: 1px solid var(--line)` and has `padding: 100px 80px 56px`.

### `<DotLabel state>`

The replacement for badges. Used everywhere a status indicator is needed (settled, drafting, still thinking; open, resolved; active, archived; for, against).

```
<span class="dot-label">
  <span class="dot dot-filled"></span>
  <span class="mono-uppercase">SETTLED</span>
</span>
```

Filled dot for terminal/decided states, outlined dot for in-progress states.

### `<ConfidenceDisplay value scale="page|inline|tiny">`

- `page` — 320pt display serif, used as a hero element on prediction pages
- `inline` — 144pt, used in CMM columns
- `tiny` — 13pt mono, used in cross-reference rows

When a confidence has changed, render both: old value with `text-decoration: line-through; color: var(--muted)`, new value live.

### `<EvidenceRow stance="for|against" weight={1|2|3} text>`

Three-column grid: `140px 60px 1fr`. Stance label in mono uppercase. Weight as 1–3 small dots (filled to weight, outlined for the rest). Body text in display serif at 22pt.

### `<CrossRefRow kind title conf>`

The "Connects to" pattern. Three-column grid: `140px 1fr 100px`. Kind in mono uppercase (claim, thought, prediction, input, post, decision, changed-my-mind). Title in display serif. Confidence in mono right-aligned. For changed-my-mind cross-refs, the right column shows `"0.66 → 0.31"`.

### `<PullQuote>`

56pt display italic, 1.15 line-height, max-width 1080, sits between content blocks with 100px vertical padding above and below.

### `<DropCap>`

124pt display serif (roman, not italic), `float: left; margin-right: 16px; line-height: 0.85`. Only used on the first paragraph of section 01 of post details.

### `<Colophon>`

Sticky right rail on post detail pages. Width ~280px, `position: sticky; top: 80px`, mono small text. Contains: title, dates, length, topic, backlinks, license, citation block.

### `<DiffColumns before after>`

Two-column layout for the changed-my-mind page. Left column on `var(--bg)`, right column on `var(--paperAlt)`. Each column has: small mono label, mono date range, large confidence number (left struck through), body text (left dimmed to `var(--muted)`).

### `<OptionRow chosen label summary pros cons>`

Decision-page option pattern. 60px left column for the dot (filled if chosen, outlined otherwise). Right column: 48pt display label (dimmed if not chosen), italic summary, two-column `for / against` grid with 1px hairline between items. If chosen, a "Chosen" stamp at the bottom — small mono uppercase with a filled dot.

### `<ConfidenceChart history>`

SVG line chart, no library. 1280×360, hairline gridlines at 0.00/0.25/0.50/0.75/1.00, polyline through datapoints, white-filled circles with 2px ink stroke at each point, value label above each dot in display serif at 20pt, date label below each dot in mono at 10pt. See `PredictionDetail` in `variation-fashion-epistemic.jsx`.

## Data shapes

The site is markdown-canonical (see the decision in `/decisions/markdown-canonical-store`). Each entry type has a known front-matter schema. These shapes are reasonable starting points — defined in `data.jsx` and the per-page files.

```ts
type Claim = {
  slug: string;
  title: string;
  confidence: number; // 0..1
  history: { date: string; conf: number; note: string }[];
  evidence: { stance: "for" | "against"; weight: 1 | 2 | 3; text: string }[];
  topics: string[];
};

type Prediction = {
  slug: string;
  title: string;
  status: "open" | "resolved";
  due: string; // ISO date
  created: string; // ISO date
  resolves: string; // resolution rule, prose
  current: number;
  history: { date: string; conf: number; note: string }[];
  evidence: EvidenceRow[];
  baseRate: string; // prose
  related: CrossRef[];
};

type ChangedMyMind = {
  slug: string;
  title: string;
  date: string;
  span: string;
  before: { label: string; when: string; confThen: number; text: string };
  after: { label: string; when: string; confNow: number; text: string };
  pivots: { date: string; text: string }[];
  survived: string[];
  abandoned: string[];
  related: CrossRef[];
};

type Decision = {
  slug: string;
  title: string;
  date: string;
  status: "active" | "archived" | "reversed";
  reversed?: { from: string; on: string };
  context: string;
  options: {
    label: string;
    summary: string;
    pros: string[];
    cons: string[];
    chosen: boolean;
  }[];
  reasoning: string;
  reviewIn: string; // ISO date
  reviewQuestion: string;
  related: CrossRef[];
};

type Post = {
  slug: string;
  title: string;
  deck: string; // italic sub-headline
  date: string;
  topic: string;
  readingTime: string;
  body: MarkdownAST; // sections, drop cap on §01, footnotes, figures, pull quotes
  footnotes: { id: string; text: string }[];
  related: CrossRef[];
};

type Thought = {
  slug: string;
  title: string;
  body: string;
  state: "settled" | "drafting" | "still-thinking";
  date: string;
  topics: string[];
  related: CrossRef[];
};

type Input = {
  slug: string;
  title: string;
  source: string;
  date: string;
  notes: string;
  influencedClaims: CrossRef[];
};

type CrossRef = { kind: string; title: string; conf?: number; was?: number; slug: string };
```

## Implementation order

Suggested sequence — each phase is independently shippable.

1. **Tokens + base layout.** Port the color, type, and spacing tokens. Build `<Header>`, `<SectionHeader>`, `<DotLabel>`, `<CrossRefRow>` as reusable primitives. Get the section header rhythm (mono label · display italic title · hairline) feeling right — this is most of the identity.
2. **Home page.** Pulls everything together; lets you sanity-check the type scale.
3. **Claim detail and Thought detail.** The two simplest entry types.
4. **Prediction detail.** Adds the SVG chart and `<EvidenceRow>` pattern.
5. **Changed-my-mind and Decision details.** The most distinctive pages — the diff columns and option rows.
6. **Posts listing + detail.** Adds the magazine register: drop cap, pull quotes, figures, footnotes, sticky colophon.
7. **Inputs.** Smallest page surface.
8. **Index pages.** Listings derive cleanly from the detail patterns.

## Files in this bundle

- `source/variation-fashion.jsx` — `FASHION_THEMES`, `makeFashionStyles`, home page
- `source/variation-fashion-pages.jsx` — claims index + detail
- `source/variation-fashion-extras.jsx` — inputs index + detail
- `source/variation-fashion-thoughts.jsx` — thoughts feed + detail
- `source/variation-fashion-posts.jsx` — posts listing + essay detail with colophon
- `source/variation-fashion-epistemic.jsx` — prediction, changed-my-mind, decision details
- `source/data.jsx` — sample data + shapes

## What is intentionally out of scope

- The other variations in the project (`variation-editorial.jsx`, `variation-lab.jsx`, the B2/B3 fashion sub-themes). Forum is the chosen direction.
- Authoring tooling. The site is markdown-canonical; assume the engineer is reading from `/content/<type>/<slug>.md` files.
- Calibration math. The base-rate text on prediction pages is prose, not computed live in this bundle. Computing it for real is an engineering task: aggregate over resolved predictions, group by confidence bucket, compute Brier score.
