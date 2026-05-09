import { readFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import { getCollection } from "astro:content";
import type { APIRoute, GetStaticPaths } from "astro";
import satori from "satori";
import { KIND_REGISTRY, LISTING_KINDS, titleFor } from "../../lib/registry.ts";
import type { Kind } from "../../schemas/index.ts";

/** Generate social-card PNGs during the static build using Satori plus ReSVG. */
export const prerender = true;

interface OgImageProps {
  readonly subtitle: string;
  readonly gradient: ConicGradient;
}

interface StaticImage {
  readonly path: string;
  readonly subtitle: string;
  readonly gradientKey: EntityGradientKey;
}

interface ConicGradient {
  readonly fromDeg: number;
  readonly atX: number;
  readonly atY: number;
  readonly stops: readonly ConicStop[];
}

interface ConicStop {
  readonly color: string;
  readonly angleDeg: number;
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

type EntityGradientKey = Exclude<Kind, "provenance">;

const SHARED_ENTITY_GRADIENT_KEYS = [
  "thoughts",
  "claims",
  "projects",
  "predictions",
  "changed-my-mind",
  "decisions",
  "questions",
  "posts",
  "inputs",
] as const satisfies ReadonlyArray<EntityGradientKey>;

const STATIC_IMAGES: ReadonlyArray<StaticImage> = [
  {
    path: "/",
    subtitle: "personal thinking surface",
    gradientKey: "thoughts",
  },
  {
    path: "/now",
    subtitle: "Now",
    gradientKey: "projects",
  },
  {
    path: "/about",
    subtitle: "About",
    gradientKey: "posts",
  },
  {
    path: "/agents",
    subtitle: "For agents",
    gradientKey: "inputs",
  },
  {
    path: "/contact",
    subtitle: "Contact",
    gradientKey: "questions",
  },
  {
    path: "/brain-diff",
    subtitle: "Brain-diff",
    gradientKey: "changed-my-mind",
  },
  {
    path: "/predictions/calibration",
    subtitle: "Calibration",
    gradientKey: "predictions",
  },
];

const fontCache = new Map<string, Promise<ArrayBuffer>>();

/** Build one PNG route for every public HTML page and content detail page. */
export const getStaticPaths: GetStaticPaths = async () => {
  const gradients = await loadSharedEntityGradients();
  const paths = STATIC_IMAGES.map(({ path, subtitle, gradientKey }) => ({
    params: { slug: pathToOgSlug(path) },
    props: { subtitle, gradient: gradients[gradientKey] },
  }));

  for (const kind of LISTING_KINDS) {
    if (!isEntityGradientKey(kind)) continue;
    const route = KIND_REGISTRY[kind].route;
    if (!route) continue;
    paths.push({
      params: { slug: pathToOgSlug(route) },
      props: {
        subtitle: KIND_REGISTRY[kind].listingTitle,
        gradient: gradients[kind],
      },
    });

    const collection = await getKindCollection(kind);
    for (const entry of collection) {
      const data = entry.data as Record<string, unknown>;
      paths.push({
        params: { slug: pathToOgSlug(`${route}/${entry.id}`) },
        props: {
          subtitle: titleFor(kind, data, entry.id),
          gradient: gradients[kind],
        },
      });
    }
  }

  return paths;
};

/** Render the Satori SVG and convert it to PNG with ReSVG for social crawlers. */
export const GET: APIRoute = async ({ props }) => {
  const image = props as OgImageProps;
  const [regular, medium] = await Promise.all([loadFont("geist", 400), loadFont("geist", 500)]);
  const svg = await satori(renderImage(image) as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Geist", data: regular, weight: 400, style: "normal" },
      { name: "Geist", data: medium, weight: 500, style: "normal" },
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

async function loadFont(family: "geist", weight: 400 | 500): Promise<ArrayBuffer> {
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

async function loadSharedEntityGradients(): Promise<Record<EntityGradientKey, ConicGradient>> {
  const css = await readFile("src/frontend/thinkinglabs-ui/styles.css", "utf8");
  return Object.fromEntries(
    SHARED_ENTITY_GRADIENT_KEYS.map((key) => {
      const variableName = `--tl-entity-gradient-${key}`;
      const match = css.match(new RegExp(`${variableName}:\\s*(conic-gradient\\([\\s\\S]*?\\));`));
      if (!match?.[1]) {
        throw new Error(`Missing shared entity gradient ${variableName}`);
      }
      return [key, parseConicGradient(match[1])] as const;
    }),
  ) as Record<EntityGradientKey, ConicGradient>;
}

function isEntityGradientKey(kind: Kind): kind is EntityGradientKey {
  return kind !== "provenance";
}

function parseConicGradient(value: string): ConicGradient {
  const match = value
    .trim()
    .match(/^conic-gradient\(\s*from\s+([\d.]+)deg\s+at\s+([\d.]+)%\s+([\d.]+)%,([\s\S]*)\)$/);
  if (!match?.[1] || !match[2] || !match[3] || !match[4]) {
    throw new Error(`Unsupported shared entity gradient: ${value}`);
  }

  const rawStops = match[4]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const explicitStops = rawStops.map((stop) => {
    const stopMatch = stop.match(/^(#[0-9a-fA-F]{3,8})(?:\s+([\d.]+)deg)?$/);
    if (!stopMatch?.[1]) throw new Error(`Unsupported conic color stop: ${stop}`);
    return {
      color: normalizeHex(stopMatch[1]),
      angleDeg: stopMatch[2] ? Number.parseFloat(stopMatch[2]) : undefined,
    };
  });

  const lastIndex = Math.max(explicitStops.length - 1, 1);
  return {
    fromDeg: Number.parseFloat(match[1]),
    atX: Number.parseFloat(match[2]),
    atY: Number.parseFloat(match[3]),
    stops: explicitStops.map((stop, index) => ({
      color: stop.color,
      angleDeg: stop.angleDeg ?? (index / lastIndex) * 360,
    })),
  };
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
    case "provenance":
      return getCollection("provenance");
  }
}

function renderImage(image: OgImageProps): SatoriElement {
  const subtitle = truncateLine(image.subtitle, 54);

  return div(
    styles.root,
    div(
      styles.gradientBlock,
      conicSvg({
        canvasWidth: 1200,
        canvasHeight: 440,
        gradient: image.gradient,
      }),
    ),
    div(
      styles.bottomBlock,
      div(styles.copy, div(styles.title, "thinkinglabs"), div(styles.subtitle, subtitle)),
    ),
  );
}

function conicSvg(options: {
  readonly canvasWidth?: number;
  readonly canvasHeight?: number;
  readonly gradient: ConicGradient;
  readonly opacity?: number;
}): SatoriElement {
  const width = options.canvasWidth ?? 1200;
  const height = options.canvasHeight ?? 630;
  const cx = (options.gradient.atX / 100) * width;
  const cy = (options.gradient.atY / 100) * height;
  const radius =
    Math.max(
      Math.hypot(cx, cy),
      Math.hypot(width - cx, cy),
      Math.hypot(cx, height - cy),
      Math.hypot(width - cx, height - cy),
    ) * 1.05;
  return node("svg", {
    width: "100%",
    height: "100%",
    viewBox: `0 0 ${width} ${height}`,
    style: {
      ...styles.svg,
      opacity: options.opacity ?? 1,
    },
    children: conicWedges(cx, cy, radius, options.gradient),
  });
}

function conicWedges(
  cx: number,
  cy: number,
  radius: number,
  gradient: ConicGradient,
): SatoriElement[] {
  const steps = 180;
  const turn = ((gradient.fromDeg - 90) * Math.PI) / 180;
  return Array.from({ length: steps }, (_, index) => {
    const start = (index / steps) * Math.PI * 2 + turn;
    const end = ((index + 1) / steps) * Math.PI * 2 + turn;
    const color = colorAtAngle((index / steps) * 360, gradient.stops);
    const x1 = cx + Math.cos(start) * radius;
    const y1 = cy + Math.sin(start) * radius;
    const x2 = cx + Math.cos(end) * radius;
    const y2 = cy + Math.sin(end) * radius;
    return node("polygon", {
      points: `${cx},${cy} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`,
      fill: color,
      stroke: color,
      "stroke-width": 1.5,
    });
  });
}

function div(style: Record<string, unknown>, ...children: SatoriNode[]): SatoriElement {
  return node("div", { style: { display: "flex", ...style }, children });
}

function node(type: string, props: SatoriElement["props"]): SatoriElement {
  return { type, props };
}

function pathToOgSlug(path: string): string {
  return path === "/" ? "index" : path.replace(/^\//, "");
}

function normalizeHex(value: string): string {
  if (value.length !== 4) return value.toLowerCase();
  return `#${value
    .slice(1)
    .split("")
    .map((char) => `${char}${char}`)
    .join("")}`;
}

function colorAtAngle(angleDeg: number, stops: readonly ConicStop[]): string {
  if (stops.length === 0) return "#0c1424";
  const sorted = [...stops].sort((a, b) => a.angleDeg - b.angleDeg);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return "#0c1424";
  if (angleDeg <= first.angleDeg) return first.color;
  if (angleDeg >= last.angleDeg) return last.color;

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const left = sorted[index];
    const right = sorted[index + 1];
    if (!left || !right || angleDeg > right.angleDeg) continue;
    const range = right.angleDeg - left.angleDeg || 1;
    return mixHex(left.color, right.color, (angleDeg - left.angleDeg) / range);
  }

  return last.color;
}

function mixHex(left: string, right: string, amount: number): string {
  const leftRgb = hexToRgb(left);
  const rightRgb = hexToRgb(right);
  return rgbToHex({
    r: leftRgb.r + (rightRgb.r - leftRgb.r) * amount,
    g: leftRgb.g + (rightRgb.g - leftRgb.g) * amount,
    b: leftRgb.b + (rightRgb.b - leftRgb.b) * amount,
  });
}

function hexToRgb(value: string): { readonly r: number; readonly g: number; readonly b: number } {
  const normalized = normalizeHex(value).slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex(rgb: { readonly r: number; readonly g: number; readonly b: number }): string {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function truncateLine(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized
    .slice(0, maxChars - 3)
    .trimEnd()
    .replace(/[.,;:!?]$/, "")}...`;
}

const styles = {
  root: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    background: "#ffffff",
    color: "#07090d",
    fontFamily: "Geist",
  },
  gradientBlock: {
    position: "relative",
    display: "flex",
    width: "100%",
    height: 440,
    overflow: "hidden",
  },
  svg: {
    position: "absolute",
    inset: 0,
  },
  bottomBlock: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    width: "100%",
    height: 190,
    background: "#ffffff",
    paddingLeft: 56,
    paddingRight: 56,
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    flexGrow: 1,
  },
  title: {
    display: "flex",
    alignItems: "center",
    color: "#07090d",
    fontFamily: "Geist",
    fontSize: 42,
    fontWeight: 500,
    lineHeight: 1,
    textAlign: "left",
  },
  subtitle: {
    display: "flex",
    alignItems: "center",
    color: "rgba(7, 9, 13, 0.42)",
    fontFamily: "Geist",
    fontSize: 31,
    fontWeight: 400,
    lineHeight: 1,
    marginTop: 6,
    textAlign: "left",
  },
} satisfies Record<string, Record<string, unknown>>;
