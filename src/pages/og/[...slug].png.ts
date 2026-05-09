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
  readonly title: string;
  readonly kicker: string;
  readonly description: string;
  readonly palette: readonly string[];
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

const STATIC_IMAGES: ReadonlyArray<{ readonly path: string } & OgImageProps> = [
  {
    path: "/",
    title: "thinkinglabs",
    kicker: "thinkinglabs",
    description: "Personal thinking surface and structured public operating layer.",
    palette: ["#0c1424", "#6dd8ff", "#f7fbff", "#b8f4d8", "#0f2b55"],
  },
  {
    path: "/now",
    title: "Now",
    kicker: "current focus",
    description: "What I am currently focused on.",
    palette: ["#101820", "#f7e7b4", "#f3f7ff", "#9ed8cb", "#314c6b"],
  },
  {
    path: "/about",
    title: "About",
    kicker: "site and author",
    description: "About this site and the author.",
    palette: ["#1c1c1c", "#d8dfe6", "#fff7ed", "#b46d42", "#44515f"],
  },
  {
    path: "/agents",
    title: "For agents",
    kicker: "machine surfaces",
    description: "MCP server, llms.txt, JSON APIs, and feed surfaces.",
    palette: ["#0e1f4f", "#3157d5", "#6dd8ff", "#f4fbff", "#70dfb2"],
  },
  {
    path: "/contact",
    title: "Contact",
    kicker: "human handoff",
    description: "Human-readable contact surface.",
    palette: ["#17202a", "#f0efe8", "#d6b887", "#704c2f", "#102a43"],
  },
  {
    path: "/brain-diff",
    title: "Brain-diff",
    kicker: "corpus deltas",
    description: "Substantive changes across the thinkinglabs corpus.",
    palette: ["#121826", "#ff6b4a", "#f7f0ce", "#7ad7d1", "#284b63"],
  },
  {
    path: "/predictions/calibration",
    title: "Calibration",
    kicker: "predictions",
    description: "Stated confidence versus realized accuracy.",
    palette: ["#172554", "#60a5fa", "#ecfeff", "#22c55e", "#111827"],
  },
];

const KIND_PALETTES: Record<Kind, readonly string[]> = {
  thoughts: ["#274c63", "#d9e8f5", "#f8fbff", "#93c5d7", "#17384d"],
  claims: ["#1f2937", "#eef2ff", "#f7e6f5", "#a5b4fc", "#172554"],
  projects: ["#12313f", "#42b4a7", "#f2ff8c", "#fff4df", "#e85d3f"],
  predictions: ["#111827", "#d1d5db", "#eef4ff", "#9aa9c4", "#1f2937"],
  "changed-my-mind": ["#3d2b56", "#f4d7f0", "#fff7ed", "#c6b4ff", "#594178"],
  decisions: ["#33210f", "#e7c06f", "#fff6dc", "#d87b38", "#1f2937"],
  questions: ["#172554", "#3b82f6", "#ecfeff", "#93c5fd", "#111827"],
  posts: ["#3a2417", "#e6b17e", "#fffaf1", "#d7dce3", "#6b4423"],
  inputs: ["#0e1f4f", "#3157d5", "#6dd8ff", "#f4fbff", "#70dfb2"],
  provenance: ["#20242b", "#d6dde8", "#f7fafc", "#8fa1b8", "#111827"],
};

let fontCache: Promise<ArrayBuffer> | null = null;

/** Build one PNG route for every public HTML page and content detail page. */
export const getStaticPaths: GetStaticPaths = async () => {
  const paths = STATIC_IMAGES.map(({ path, ...props }) => ({
    params: { slug: pathToOgSlug(path) },
    props,
  }));

  for (const kind of LISTING_KINDS) {
    const route = KIND_REGISTRY[kind].route;
    if (!route) continue;
    paths.push({
      params: { slug: pathToOgSlug(route) },
      props: {
        title: KIND_REGISTRY[kind].listingTitle,
        kicker: "thinkinglabs",
        description: KIND_REGISTRY[kind].description,
        palette: KIND_PALETTES[kind],
      },
    });

    const collection = await getKindCollection(kind);
    for (const entry of collection) {
      const data = entry.data as Record<string, unknown>;
      paths.push({
        params: { slug: pathToOgSlug(`${route}/${entry.id}`) },
        props: {
          title: titleFor(kind, data, entry.id),
          kicker: KIND_REGISTRY[kind].listingTitle,
          description: KIND_REGISTRY[kind].description,
          palette: KIND_PALETTES[kind],
        },
      });
    }
  }

  return paths;
};

/** Render the Satori SVG and convert it to PNG with ReSVG for social crawlers. */
export const GET: APIRoute = async ({ props }) => {
  const image = props as OgImageProps;
  const svg = await satori(renderImage(image) as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: "Geist",
        data: await loadFont(),
        weight: 400,
        style: "normal",
      },
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

async function loadFont(): Promise<ArrayBuffer> {
  fontCache ??= readFile("node_modules/@fontsource/geist/files/geist-latin-400-normal.woff").then(
    (buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  );
  return fontCache;
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
  const titleLines = wrapText(image.title, 24, 3);
  const descriptionLines = wrapText(image.description, 56, 2);

  return div(
    styles.root,
    conicSvg({ cx: 190, cy: 140, radius: 520, palette: image.palette, turn: 0.45, opacity: 0.16 }),
    div(
      styles.copy,
      div(styles.kicker, image.kicker.toUpperCase()),
      div(styles.title, ...titleLines.map((line) => div(styles.line, line))),
      div(styles.description, ...descriptionLines.map((line) => div(styles.line, line))),
      div(styles.rule),
      div(styles.domain, "thinkinglabs.run"),
    ),
    div(
      styles.visualShell,
      conicSvg({
        canvasWidth: 370,
        canvasHeight: 370,
        cx: 185,
        cy: 185,
        radius: 300,
        palette: image.palette,
        turn: -0.35,
      }),
      div(styles.visualFrame),
    ),
  );
}

function conicSvg(options: {
  readonly canvasWidth?: number;
  readonly canvasHeight?: number;
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
  readonly palette: readonly string[];
  readonly turn: number;
  readonly opacity?: number;
}): SatoriElement {
  const width = options.canvasWidth ?? 1200;
  const height = options.canvasHeight ?? 630;
  return node("svg", {
    width: "100%",
    height: "100%",
    viewBox: `0 0 ${width} ${height}`,
    style: {
      ...styles.svg,
      opacity: options.opacity ?? 1,
    },
    children: conicWedges(options.cx, options.cy, options.radius, options.palette, options.turn),
  });
}

function conicWedges(
  cx: number,
  cy: number,
  radius: number,
  colors: readonly string[],
  turn: number,
): SatoriElement[] {
  const steps = 96;
  return Array.from({ length: steps }, (_, index) => {
    const start = (index / steps) * Math.PI * 2 + turn;
    const end = ((index + 1) / steps) * Math.PI * 2 + turn;
    const color =
      colors[Math.floor((index / steps) * colors.length) % colors.length] ?? colors[0] ?? "#0c1424";
    const x1 = cx + Math.cos(start) * radius;
    const y1 = cy + Math.sin(start) * radius;
    const x2 = cx + Math.cos(end) * radius;
    const y2 = cy + Math.sin(end) * radius;
    return node("polygon", {
      points: `${cx},${cy} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`,
      fill: color,
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

function wrapText(value: string, maxChars: number, maxLines: number): string[] {
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  let truncated = false;
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (lines.length >= maxLines - 1) {
      truncated = true;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (truncated && lines.length === maxLines) {
    lines[lines.length - 1] = `${(lines[lines.length - 1] ?? "").replace(/[.,;:!?]$/, "")}...`;
  }
  return lines.length > 0 ? lines : ["thinkinglabs"];
}

const styles = {
  root: {
    position: "relative",
    display: "flex",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    background: "radial-gradient(circle at 50% 45%, #ffffff 0%, #fbfaf7 62%, #f4f1ea 100%)",
    color: "#0c1424",
    fontFamily: "Geist",
  },
  svg: {
    position: "absolute",
    inset: 0,
  },
  copy: {
    position: "absolute",
    left: 112,
    top: 112,
    display: "flex",
    flexDirection: "column",
    width: 610,
  },
  kicker: {
    display: "flex",
    fontSize: 28,
    fontWeight: 400,
    letterSpacing: 4,
    marginBottom: 48,
  },
  title: {
    display: "flex",
    flexDirection: "column",
    fontSize: 66,
    fontWeight: 400,
    lineHeight: 1.12,
  },
  line: {
    display: "flex",
  },
  description: {
    display: "flex",
    flexDirection: "column",
    color: "#4b5563",
    fontSize: 28,
    fontWeight: 400,
    lineHeight: 1.22,
    marginTop: 160,
  },
  rule: {
    display: "flex",
    width: 318,
    height: 2,
    marginTop: 28,
    background: "rgba(12, 20, 36, 0.22)",
  },
  domain: {
    display: "flex",
    color: "rgba(12, 20, 36, 0.72)",
    fontSize: 24,
    fontWeight: 400,
  },
  visualShell: {
    position: "absolute",
    display: "flex",
    left: 662,
    top: 122,
    width: 370,
    height: 370,
    overflow: "visible",
    boxShadow: "0 34px 64px rgba(7, 16, 33, 0.18)",
  },
  visualFrame: {
    position: "absolute",
    inset: 0,
    border: "1px solid rgba(255, 255, 255, 0.28)",
  },
} satisfies Record<string, Record<string, unknown>>;
