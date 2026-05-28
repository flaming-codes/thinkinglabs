import { readFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import { getCollection } from "astro:content";
import type { APIRoute, GetStaticPaths } from "astro";
import satori from "satori";
import { readThinkinglabsCssToken } from "../../lib/css-tokens.ts";
import { KIND_REGISTRY, LISTING_KINDS, titleFor } from "../../lib/registry.ts";
import type { Kind } from "../../schemas/index.ts";

/** Static social-card PNGs: one of ten "soft multi-wash" layouts per kind, with accent palettes sampled from each kind's conic-gradient stops. Title is dominant; wordmark is secondary; detail pages add a kind eyebrow (listings and static pages omit it). */
export const prerender = true;

interface OgImageProps {
  readonly title: string;
  readonly kindLabel?: string | undefined;
  readonly layout: Layout;
  readonly palette: OrbPalette;
}

interface StaticImage {
  readonly path: string;
  readonly title: string;
  readonly kindKey: EntityKindKey;
}

type EntityKindKey = Exclude<Kind, "provenance">;

type Layout =
  | "quiet-bl"
  | "top-edge"
  | "bottom-edge"
  | "side"
  | "dark"
  | "two-line"
  | "left-side"
  | "top-left-bloom"
  | "bottom-right-bloom"
  | "diagonal";

type OrbPalette = readonly [string, string, string];

interface OrbSpec {
  readonly w: number;
  readonly h: number;
  readonly top?: number;
  readonly left?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly paletteIndex: 0 | 1 | 2;
  readonly opacity: number;
}

interface LayoutSpec {
  readonly orbs: ReadonlyArray<OrbSpec>;
  readonly hAlign: "flex-start" | "flex-end" | "center";
  readonly vAlign: "flex-start" | "flex-end" | "center";
  readonly inverted?: boolean;
  readonly titleFontSize?: number;
  readonly titleMaxWidth?: number;
  readonly textAlign?: "left" | "right" | "center";
}

interface SatoriElement {
  readonly type: string;
  readonly props: {
    readonly style?: Record<string, unknown>;
    readonly children?: string | readonly SatoriNode[];
    readonly [key: string]: unknown;
  };
}

type SatoriNode = SatoriElement | string;

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 628;

const OG_THEME = {
  light: {
    bg: readThinkinglabsCssToken("--tl-og-bg"),
    ink: readThinkinglabsCssToken("--tl-og-ink"),
    inkSoft: readThinkinglabsCssToken("--tl-og-ink-soft"),
    inkEyebrow: readThinkinglabsCssToken("--tl-og-ink-eyebrow"),
  },
  dark: {
    bg: readThinkinglabsCssToken("--tl-og-dark-bg"),
    ink: readThinkinglabsCssToken("--tl-og-dark-ink"),
    inkSoft: readThinkinglabsCssToken("--tl-og-dark-ink-soft"),
    inkEyebrow: readThinkinglabsCssToken("--tl-og-dark-ink-eyebrow"),
  },
} as const;

/** Layout assigned to each entity kind. Static pages inherit their kindKey's layout. */
const KIND_LAYOUTS: Record<EntityKindKey, Layout> = {
  thoughts: "quiet-bl",
  claims: "top-edge",
  posts: "bottom-edge",
  projects: "side",
  "changed-my-mind": "dark",
  predictions: "two-line",
  decisions: "left-side",
  questions: "top-left-bloom",
  inputs: "bottom-right-bloom",
  observations: "diagonal",
};

/** Per-kind soft-orb accent palette, sourced from `--tl-og-palette-*` in styles.css. Soft falloff comes from a radial-gradient(ellipse) - Satori does not reliably support `filter: blur`. */
const KIND_ORB_PALETTES: Record<EntityKindKey, OrbPalette> = {
  thoughts: parsePalette("--tl-og-palette-thoughts"),
  claims: parsePalette("--tl-og-palette-claims"),
  projects: parsePalette("--tl-og-palette-projects"),
  predictions: parsePalette("--tl-og-palette-predictions"),
  "changed-my-mind": parsePalette("--tl-og-palette-changed-my-mind"),
  decisions: parsePalette("--tl-og-palette-decisions"),
  questions: parsePalette("--tl-og-palette-questions"),
  posts: parsePalette("--tl-og-palette-posts"),
  inputs: parsePalette("--tl-og-palette-inputs"),
  observations: parsePalette("--tl-og-palette-observations"),
};

function parsePalette(token: string): OrbPalette {
  const raw = readThinkinglabsCssToken(token);
  const parts = raw.split(",").map((part) => part.trim());
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error(`Expected 3 comma-separated hex colors in ${token}, got "${raw}"`);
  }
  return [parts[0], parts[1], parts[2]] as const;
}

/** Singular kind label shown as eyebrow on detail pages. */
const KIND_SINGULAR: Record<EntityKindKey, string> = {
  thoughts: "Thought",
  claims: "Claim",
  projects: "Project",
  predictions: "Prediction",
  "changed-my-mind": "Changed my mind",
  decisions: "Decision",
  questions: "Question",
  posts: "Post",
  inputs: "Input",
  observations: "Observation",
};

const LAYOUTS: Record<Layout, LayoutSpec> = {
  "quiet-bl": {
    orbs: [
      { w: 620, h: 620, top: -200, left: -80, paletteIndex: 0, opacity: 0.7 },
      { w: 540, h: 540, top: -120, right: -120, paletteIndex: 1, opacity: 0.78 },
      { w: 380, h: 380, top: 220, right: 360, paletteIndex: 2, opacity: 0.55 },
    ],
    hAlign: "flex-start",
    vAlign: "flex-end",
  },
  "top-edge": {
    orbs: [
      { w: 720, h: 480, top: -260, left: -120, paletteIndex: 0, opacity: 0.78 },
      { w: 620, h: 420, top: -240, left: 380, paletteIndex: 1, opacity: 0.72 },
      { w: 560, h: 380, top: -260, right: -100, paletteIndex: 2, opacity: 0.78 },
    ],
    hAlign: "flex-start",
    vAlign: "flex-end",
  },
  "bottom-edge": {
    orbs: [
      { w: 720, h: 480, bottom: -260, left: -120, paletteIndex: 0, opacity: 0.78 },
      { w: 620, h: 420, bottom: -240, left: 380, paletteIndex: 1, opacity: 0.7 },
      { w: 560, h: 380, bottom: -260, right: -100, paletteIndex: 2, opacity: 0.78 },
    ],
    hAlign: "flex-start",
    vAlign: "flex-start",
  },
  side: {
    orbs: [
      { w: 640, h: 640, top: -160, right: -180, paletteIndex: 0, opacity: 0.78 },
      { w: 460, h: 460, top: 220, right: -60, paletteIndex: 1, opacity: 0.7 },
      { w: 360, h: 360, bottom: -160, right: 200, paletteIndex: 2, opacity: 0.6 },
    ],
    hAlign: "flex-start",
    vAlign: "flex-end",
    titleMaxWidth: 720,
  },
  dark: {
    orbs: [
      { w: 700, h: 700, top: -160, left: -140, paletteIndex: 0, opacity: 0.85 },
      { w: 580, h: 580, top: 80, right: -180, paletteIndex: 1, opacity: 0.78 },
      { w: 440, h: 440, bottom: -200, left: 380, paletteIndex: 2, opacity: 0.7 },
    ],
    hAlign: "flex-start",
    vAlign: "flex-end",
    inverted: true,
  },
  "two-line": {
    orbs: [
      { w: 660, h: 660, top: -200, right: -160, paletteIndex: 0, opacity: 0.78 },
      { w: 480, h: 480, top: 100, left: -140, paletteIndex: 1, opacity: 0.72 },
      { w: 380, h: 380, bottom: -180, right: 260, paletteIndex: 2, opacity: 0.55 },
    ],
    hAlign: "flex-start",
    vAlign: "flex-end",
    titleFontSize: 56,
    titleMaxWidth: 940,
  },
  "left-side": {
    orbs: [
      { w: 640, h: 640, top: -160, left: -180, paletteIndex: 0, opacity: 0.78 },
      { w: 460, h: 460, top: 220, left: -60, paletteIndex: 1, opacity: 0.7 },
      { w: 360, h: 360, bottom: -160, left: 200, paletteIndex: 2, opacity: 0.6 },
    ],
    hAlign: "flex-end",
    vAlign: "flex-end",
    titleMaxWidth: 720,
    textAlign: "right",
  },
  "top-left-bloom": {
    orbs: [
      { w: 720, h: 720, top: -220, left: -200, paletteIndex: 0, opacity: 0.85 },
      { w: 460, h: 460, top: -60, left: 160, paletteIndex: 1, opacity: 0.7 },
      { w: 380, h: 380, top: 180, left: -80, paletteIndex: 2, opacity: 0.55 },
    ],
    hAlign: "flex-end",
    vAlign: "flex-end",
    titleMaxWidth: 780,
    textAlign: "right",
  },
  "bottom-right-bloom": {
    orbs: [
      { w: 720, h: 720, bottom: -220, right: -200, paletteIndex: 0, opacity: 0.85 },
      { w: 460, h: 460, bottom: -60, right: 160, paletteIndex: 1, opacity: 0.7 },
      { w: 380, h: 380, bottom: 180, right: -80, paletteIndex: 2, opacity: 0.55 },
    ],
    hAlign: "flex-start",
    vAlign: "flex-start",
    titleMaxWidth: 780,
  },
  diagonal: {
    orbs: [
      { w: 560, h: 560, top: -160, left: -160, paletteIndex: 0, opacity: 0.7 },
      { w: 480, h: 480, top: 140, left: 400, paletteIndex: 1, opacity: 0.65 },
      { w: 620, h: 620, bottom: -200, right: -160, paletteIndex: 2, opacity: 0.78 },
    ],
    hAlign: "flex-start",
    vAlign: "flex-end",
    titleMaxWidth: 820,
  },
};

const STATIC_IMAGES: ReadonlyArray<StaticImage> = [
  { path: "/", title: "personal thinking surface", kindKey: "thoughts" },
  { path: "/now", title: "Now", kindKey: "projects" },
  { path: "/about", title: "About", kindKey: "posts" },
  { path: "/agents", title: "For agents", kindKey: "inputs" },
  { path: "/contact", title: "Contact", kindKey: "questions" },
  { path: "/brain-diff", title: "Brain-diff", kindKey: "changed-my-mind" },
  { path: "/predictions/calibration", title: "Calibration", kindKey: "predictions" },
];

const fontCache = new Map<string, Promise<ArrayBuffer>>();

interface OgRoute {
  readonly params: { readonly slug: string };
  readonly props: {
    readonly title: string;
    readonly kindLabel?: string;
    readonly layout: Layout;
    readonly palette: OrbPalette;
  };
}

/** Build one PNG route for every public HTML page and content detail page. */
export const getStaticPaths: GetStaticPaths = async () => {
  const paths: OgRoute[] = [];
  STATIC_IMAGES.forEach(({ path, title, kindKey }) =>
    paths.push({
      params: { slug: pathToOgSlug(path) },
      props: {
        title,
        layout: KIND_LAYOUTS[kindKey],
        palette: KIND_ORB_PALETTES[kindKey],
      },
    }),
  );

  for (const kind of LISTING_KINDS) {
    if (!isEntityKindKey(kind)) continue;
    const route = KIND_REGISTRY[kind].route;
    if (!route) continue;
    const layout = KIND_LAYOUTS[kind];
    const palette = KIND_ORB_PALETTES[kind];
    paths.push({
      params: { slug: pathToOgSlug(route) },
      props: {
        title: KIND_REGISTRY[kind].listingTitle,
        layout,
        palette,
      },
    });

    const collection = await getKindCollection(kind);
    for (const entry of collection) {
      const data = entry.data as Record<string, unknown>;
      paths.push({
        params: { slug: pathToOgSlug(`${route}/${entry.id}`) },
        props: {
          title: titleFor(kind, data, entry.id),
          kindLabel: KIND_SINGULAR[kind],
          layout,
          palette,
        },
      });
    }
  }

  return paths;
};

/** Render the Satori SVG and convert it to PNG with ReSVG for social crawlers. */
export const GET: APIRoute = async ({ props }) => {
  const image = props as OgImageProps;
  const [regular, medium, semibold] = await Promise.all([
    loadFont("geist", 400),
    loadFont("geist", 500),
    loadFont("geist", 600),
  ]);
  const svg = await satori(renderImage(image) as Parameters<typeof satori>[0], {
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    fonts: [
      { name: "Geist", data: regular, weight: 400, style: "normal" },
      { name: "Geist", data: medium, weight: 500, style: "normal" },
      { name: "Geist", data: semibold, weight: 600, style: "normal" },
    ],
  });
  const png = new Resvg(svg).render().asPng();
  return new Response(new Uint8Array(png).buffer, {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-type": "image/png",
    },
  });
};

async function loadFont(family: "geist", weight: 400 | 500 | 600): Promise<ArrayBuffer> {
  const key = `${family}-${weight}`;
  let cached = fontCache.get(key);
  if (!cached) {
    const filename = `node_modules/@fontsource/geist/files/geist-latin-${weight}-normal.woff`;
    cached = readFile(filename).then((buffer) =>
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    );
    fontCache.set(key, cached);
  }
  return cached;
}

function isEntityKindKey(kind: Kind): kind is EntityKindKey {
  return kind !== "provenance";
}

async function getKindCollection(kind: Kind) {
  switch (kind) {
    case "thoughts":
      return getCollection("thoughts");
    case "claims":
      return getCollection("claims");
    case "projects":
      return getCollection("projects");
    case "predictions":
      return getCollection("predictions");
    case "changed-my-mind":
      return getCollection("changed-my-mind");
    case "decisions":
      return getCollection("decisions");
    case "questions":
      return getCollection("questions");
    case "posts":
      return getCollection("posts");
    case "inputs":
      return getCollection("inputs");
    case "observations":
      return getCollection("observations");
    case "provenance":
      return getCollection("provenance");
  }
}

/** Full-bleed root with positioned soft orbs plus a content block holding (optional kind eyebrow, title, wordmark); alignment is driven by the kind-assigned LayoutSpec. */
function renderImage(image: OgImageProps): SatoriElement {
  const spec = LAYOUTS[image.layout];
  const theme = spec.inverted ? OG_THEME.dark : OG_THEME.light;
  const titleFontSize = spec.titleFontSize ?? 64;
  const titleMaxWidth = spec.titleMaxWidth ?? 880;
  const textAlign = spec.textAlign ?? "left";

  const orbNodes = spec.orbs.map((orb) => renderOrb(orb, image.palette));

  const textBlock = renderTextBlock({
    title: image.title,
    kindLabel: image.kindLabel,
    theme,
    titleFontSize,
    titleMaxWidth,
    textAlign,
  });

  return node("div", {
    style: {
      display: "flex",
      position: "relative",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      background: theme.bg,
      color: theme.ink,
      fontFamily: "Geist",
    },
    children: [
      ...orbNodes,
      node("div", {
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: spec.vAlign,
          alignItems: spec.hAlign,
          padding: 64,
          zIndex: 2,
        },
        children: [textBlock],
      }),
    ],
  });
}

function renderOrb(orb: OrbSpec, palette: OrbPalette): SatoriElement {
  const color = palette[orb.paletteIndex];
  /** Ellipse falloff matches non-square orb boxes - the visual stand-in for `filter: blur` which Satori does not reliably support. */
  const style: Record<string, unknown> = {
    position: "absolute",
    display: "flex",
    width: orb.w,
    height: orb.h,
    borderRadius: Math.max(orb.w, orb.h),
    backgroundImage: `radial-gradient(ellipse at center, ${color} 0%, ${fadeToTransparent(color)} 70%)`,
    opacity: orb.opacity,
  };
  if (orb.top !== undefined) style["top"] = orb.top;
  if (orb.left !== undefined) style["left"] = orb.left;
  if (orb.right !== undefined) style["right"] = orb.right;
  if (orb.bottom !== undefined) style["bottom"] = orb.bottom;
  return node("div", { style, children: [] });
}

function renderTextBlock(options: {
  readonly title: string;
  readonly kindLabel?: string | undefined;
  readonly theme: (typeof OG_THEME)[keyof typeof OG_THEME];
  readonly titleFontSize: number;
  readonly titleMaxWidth: number;
  readonly textAlign: "left" | "right" | "center";
}): SatoriElement {
  const { title, kindLabel, theme, titleFontSize, titleMaxWidth, textAlign } = options;
  const children: SatoriElement[] = [];

  if (kindLabel) {
    children.push(
      node("div", {
        style: {
          display: "flex",
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: theme.inkEyebrow,
          marginBottom: 22,
        },
        children: [kindLabel],
      }),
    );
  }

  children.push(
    node("div", {
      style: {
        display: "flex",
        fontSize: titleFontSize,
        lineHeight: 1.06,
        fontWeight: 500,
        letterSpacing: -1,
        color: theme.ink,
        maxWidth: titleMaxWidth,
        textAlign,
      },
      children: [truncateLine(title, 140)],
    }),
  );

  children.push(
    node("div", {
      style: {
        display: "flex",
        fontSize: 22,
        fontWeight: 500,
        color: theme.inkSoft,
        marginTop: 24,
      },
      children: ["thinkinglabs"],
    }),
  );

  return node("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems:
        textAlign === "right" ? "flex-end" : textAlign === "center" ? "center" : "flex-start",
      maxWidth: titleMaxWidth,
    },
    children,
  });
}

function node(type: string, props: SatoriElement["props"]): SatoriElement {
  return { type, props };
}

function pathToOgSlug(path: string): string {
  return path === "/" ? "index" : path.replace(/^\//, "");
}

function truncateLine(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized
    .slice(0, maxChars - 3)
    .trimEnd()
    .replace(/[.,;:!?]$/, "")}...`;
}

/** Append an `00` alpha byte to a 6-digit hex so Satori interprets it as fully transparent. Avoids `rgba(...)` in source text, which the design-tokens lint catches as a hard-coded color. */
function fadeToTransparent(hexColor: string): string {
  return `${hexColor}00`;
}
