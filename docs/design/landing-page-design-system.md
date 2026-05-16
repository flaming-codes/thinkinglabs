# Thinkinglabs Landing Page Design System

This document captures the visual system implied by the current thinkinglabs landing page. Use it as the reference point when bringing entity pages, detail pages, and future public surfaces back into the same family.

## Core Impression

The landing page is not a dashboard, a marketing homepage, or a card grid. It is a quiet gallery of artifacts. The interface chrome is fixed and minimal; the content moves through it. The strongest visual signal is not text density but a sequence of small, carefully spaced objects with off-object labels.

The design succeeds because it gives the viewer very little to parse at once:

- one centered object at a time on desktop,
- one simple label cluster near the object,
- one fixed wordmark above,
- one scrolling axis,
- no decorative frame around the page.

Everything feels intentional because there are only a few moves, repeated with discipline.

## Layout Model

### Page Chrome

The chrome is fixed, high-contrast, and sparse:

- The wordmark is fixed at the top center.
- The selected-content HUD is fixed on non-index pages.
- The footer is effectively silent.
- Chrome uses `mix-blend-mode: difference`, so it behaves like an optical overlay rather than a normal nav bar.

This means page layouts should leave breathing room near the top and should not create a competing header inside the first viewport.

### Gallery Axis

Desktop landing behavior is horizontal:

- `.tl-scroll` becomes horizontal for the gallery.
- Cards are arranged in a single row.
- Each card `scroll-snap-align: center`.
- The gallery has very large gaps: `clamp(9rem, 13vw, 15rem)`.
- The first and last cards are padded so a card can sit optically centered in the viewport.

Mobile returns to a vertical sequence:

- The same artifacts stack vertically.
- The gap becomes taller than a normal list gap: `3.6rem`.
- Labels beside the cards are removed.
- Cards use smaller fixed mobile widths rather than filling the viewport.

### Object Scale

The artifact is intentionally modest:

- Base card widths alternate around `16rem`, `17.5rem`, and `22rem`.
- Aspect ratios alternate between `3 / 4`, `4 / 3`, and `1 / 1`.
- The object rarely exceeds a small portion of the viewport.

This restraint is central. The page feels premium because it does not expand every surface to the available width.

## Spacing

The landing page uses a few clear spacing bands:

- Outer mobile inline padding: `20px`.
- Desktop gallery object gap: `clamp(9rem, 13vw, 15rem)`.
- Desktop gallery vertical padding: `clamp(5rem, 8vw, 9rem)`.
- Mobile gallery vertical padding: `23vh 0`.
- Mobile card gap: `3.6rem`.

The spacing is asymmetrical in practice: labels hang off the object, and the horizontal scroll creates negative space that changes while moving. Avoid filling this negative space with explanatory text.

## Typography

### Fonts

Two fonts define the system:

- The contour SVG icon for the brand mark.
- `Geist` for nearly everything else.

The visual system leans on weight and case more than font variety. Do not introduce additional font families for entity pages.

### Text Treatment

Labels are small and restrained:

- 11-12px.
- Medium to semibold weight.
- Tight line-height.
- Slight tracking, usually `0.06em` to `0.24em`.
- Uppercase only for metadata, not for all content.

Titles inside entity surfaces can be large, but should still feel clipped and controlled:

- Strong line-height, often close to `0.9` to `1.04`.
- Heavy weight around `600-650`.
- Tight letter spacing for large display type.

Body and deck copy is muted:

- Color: `rgba(7, 9, 13, 0.58)` or nearby.
- Font size around `14-15px`.
- Line-height around `1.55-1.7`.
- Copy blocks should be narrow enough to read quickly.

## Color And Surface

The base page is white with black ink:

- `--tl-bg: #fff`
- `--tl-ink: #07090d`
- muted ink uses alpha rather than a separate gray palette.

Entity identity is expressed through conic gradients, not badges, icons, or complex illustrations.

Each entity has an associated conic gradient token:

- claims: pale blue / pink confidence field
- thoughts: light paper blue / deep navy
- projects: high-contrast cyan / acid / red
- predictions: dark / white / blue calibration field
- changed-my-mind: gray / cream / amber / red
- decisions: green / cream / deep forest
- questions: yellow / orange / violet / navy
- posts: warm paper / clay / dark brown
- inputs: saturated blue / cyan / white / green

Gradient surfaces are active but contained. They work best as artifact fills, not as full-page backgrounds.

## Motion

Motion is slow and environmental:

- Gradient drift is `24s-36s`.
- Movement is rotational/positional and subtle.
- Hover increases shadow, not scale.
- Reduced motion disables gradient animation.

Avoid quick entrance animations or scroll-triggered theatrical effects. The page’s movement should feel like the artifact is alive, not like UI is performing.

## Shadows And Edges

Landing cards have no visible border and no border radius. Their separation comes from a soft multi-stop shadow:

```css
box-shadow:
  0 1px 1px rgba(7, 9, 13, 0.025),
  0 10px 22px -16px rgba(7, 9, 13, 0.2),
  0 26px 54px -32px rgba(7, 9, 13, 0.18),
  0 64px 112px -68px rgba(7, 9, 13, 0.16);
```

The page avoids conventional cards. A surface is only framed when it is an artifact. Lists and metadata should usually be separated by hairlines, spacing, and alignment.

## Entity Page Direction

Current entity pages deviate because they read like documents:

- A large full-width-ish hero panel dominates the top.
- Content lives in one conventional centered column.
- Stats feel like a separate dashboard area.
- Sections use predictable document headers.

The landing-page-aligned entity page should instead feel like entering one artifact from the gallery:

- Keep one strong artifact surface in the first viewport.
- Let metadata orbit the artifact rather than sitting in a rectangular dashboard.
- Prefer sparse row systems and off-object labels.
- Preserve generous whitespace.
- Use the same gradient identity as the landing page.
- Avoid boxed panels unless the box is the artifact itself.

## Practical Rules

When designing new pages:

1. Start with one artifact shape and one axis.
2. Keep the first viewport quiet; do not explain the whole system.
3. Place labels outside or beside the object where possible.
4. Use hairlines for structure, shadows for artifacts.
5. Keep repeated rows unframed.
6. Let entity color appear only through conic-gradient artifact surfaces.
7. Use small metadata type and restrained body copy.
8. Make mobile a vertical gallery, not a squeezed desktop layout.
