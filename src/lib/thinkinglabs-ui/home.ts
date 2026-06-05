import type { CollectionEntry } from "astro:content";
import type { AboutKind, KindSummary, NowData } from "../../frontend/thinkinglabs-ui/types.ts";
import { detailHref, formatDate, listingHref } from "../entity-routes.ts";
import { KIND_REGISTRY, LISTING_KINDS } from "../registry.ts";
import { type CountByKind, safeDate } from "./ref-lookups.ts";

function seasonLabel(now: Date): string {
  const month = now.toLocaleString("en-US", { month: "long" });
  const year = now.getFullYear();
  const season =
    ["winter", "spring", "summer", "autumn"][Math.floor((now.getMonth() % 12) / 3)] ?? "season";
  return `${month} ${year} — ${season}`;
}

function pulseFromDate(iso: string): number {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return 0.5;
  const days = Math.max(0, (Date.now() - parsed) / (1000 * 60 * 60 * 24));
  const normalized = 1 - Math.min(days, 365) / 365;
  return Number(Math.max(0.2, Math.min(0.95, normalized)).toFixed(2));
}

/** Map collection counts into homepage kind cards in the registry-defined display order. */
export function mapHomeKinds(counts: CountByKind): KindSummary[] {
  return LISTING_KINDS.map((kind) => ({
    slug: kind,
    title: KIND_REGISTRY[kind].listingTitle,
    description: KIND_REGISTRY[kind].description,
    count: counts[kind] ?? 0,
    accent: KIND_REGISTRY[kind].detailTitle,
    href: listingHref(kind),
  }));
}

/** Map listing-kind counts into About page structure rows using registry descriptions and links. */
export function mapAboutKinds(counts: CountByKind): AboutKind[] {
  return LISTING_KINDS.map((kind) => ({
    slug: kind,
    name: KIND_REGISTRY[kind].listingTitle,
    gloss: KIND_REGISTRY[kind].description,
    count: counts[kind] ?? 0,
    href: listingHref(kind),
  }));
}

/** Build `/now` view data from alive projects plus recently consumed inputs. */
export function mapNowData(args: {
  projects: ReadonlyArray<CollectionEntry<"projects">>;
  inputs: ReadonlyArray<CollectionEntry<"inputs">>;
  now?: Date;
}): NowData {
  const activeProjects = args.projects.filter((project) => project.data.status === "alive");
  const dormantProjects = args.projects.filter((project) => project.data.status !== "alive");
  const sortedInputs = [...args.inputs].sort(
    (a, b) => safeDate(b.data.consumed) - safeDate(a.data.consumed),
  );
  const now = args.now ?? new Date();
  const firstQuestion = activeProjects.find((project) => project.data.current_question)?.data
    .current_question;

  return {
    season: seasonLabel(now),
    thesis:
      firstQuestion ??
      (activeProjects.length > 0
        ? `Tracking ${activeProjects.length} active project thread${activeProjects.length === 1 ? "" : "s"}.`
        : "No active projects yet."),
    active: activeProjects.map((project) => ({
      title: project.data.title,
      kind: "project",
      currentQ: project.data.current_question ?? "No current question logged yet.",
      since: formatDate(project.data.started),
      pulse: pulseFromDate(project.data.last_touched ?? project.data.started),
      href: detailHref("projects", project.id),
    })),
    reading: sortedInputs.slice(0, 5).map((input) => {
      const source = input.data.source ? ` — ${input.data.source}` : "";
      return `${input.data.title}${source}`;
    }),
    notReading: dormantProjects.slice(0, 5).map((project) => project.data.title),
  };
}
