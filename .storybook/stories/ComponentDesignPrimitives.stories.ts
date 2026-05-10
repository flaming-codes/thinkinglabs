import ComponentDesignPrimitiveStory from "../../src/frontend/thinkinglabs-ui/storybook/ComponentDesignPrimitiveStory.astro";
import { fullscreen, htmlSlot, paddedCanvas } from "./story-helpers";

const calibrationBins = [
  { stated: 0.1, n: 3, hit: 0.08 },
  { stated: 0.3, n: 5, hit: 0.28 },
  { stated: 0.5, n: 7, hit: 0.46 },
  { stated: 0.7, n: 6, hit: 0.78 },
  { stated: 0.9, n: 4, hit: 0.84 },
];

const stats = [
  { label: "Claims", value: "124", sub: "structured assertions" },
  { label: "Predictions", value: "38", sub: "tracked outcomes" },
  { label: "Questions", value: "17", sub: "open loops" },
  { label: "Inputs", value: "91", sub: "source notes" },
];

const meta = {
  title: "Thinkinglabs/Primitives/ComponentDesignPrimitives",
  component: ComponentDesignPrimitiveStory,
  parameters: fullscreen,
  args: {
    story: "app-shell",
    activeNav: "Now",
    hideSelectedHud: true,
    ...htmlSlot(`
      <section class="tl-page-head">
        <div class="tl-page-head-grid">
          <div>
            <p class="tl-eyebrow">Primitive shell</p>
            <h1>Component design primitives</h1>
          </div>
          <p class="tl-mono is-right">Storybook canvas</p>
        </div>
      </section>
    `),
  },
};

export default meta;

export const AppShell = {};

export const AppShellGallery = {
  args: {
    story: "app-shell",
    activeNav: "Calibration",
    mode: "gallery",
    ...htmlSlot(`
      <section class="tl-page-head is-spacious" data-selected-label="Calibration" data-brand-context="Design primitive">
        <div>
          <p class="tl-eyebrow">Gallery mode</p>
          <h1>Wide visual rhythm</h1>
        </div>
      </section>
    `),
  },
};

export const BrandLogo = {
  parameters: paddedCanvas,
  args: {
    story: "brand-logo",
    ariaLabel: "thinkinglabs",
  },
};

export const CalibrationChart = {
  parameters: fullscreen,
  args: {
    story: "calibration-chart",
    bins: calibrationBins,
  },
};

export const DotLabelOpen = {
  parameters: paddedCanvas,
  args: {
    story: "dot-label",
    label: "unresolved",
  },
};

export const DotLabelFilled = {
  parameters: paddedCanvas,
  args: {
    story: "dot-label",
    label: "resolved",
    filled: true,
  },
};

export const FigureChartPlate = {
  parameters: fullscreen,
  args: {
    story: "figure-chart-plate",
  },
};

export const IndexHeroStacked = {
  parameters: fullscreen,
  args: {
    story: "index-hero",
    eyebrow: "Index",
    crumb: "thinkinglabs / primitives",
    title: "Agentic space<br />for public thought",
    deck: "A compact hero treatment for index pages with a terse deck and strong typographic hierarchy.",
  },
};

export const IndexHeroSplit = {
  parameters: fullscreen,
  args: {
    story: "index-hero",
    eyebrow: "Calibration",
    crumb: "thinkinglabs / calibration",
    title: "Forecasting calibration",
    deck: "The split layout keeps the title and explanatory deck in separate columns for scan-heavy pages.",
    layout: "split",
  },
};

export const IndexSectionHeader = {
  parameters: fullscreen,
  args: {
    story: "index-section-header",
    label: "Recent",
    title: "Freshly reviewed surfaces",
  },
};

export const PathWordmarkVariant = {
  parameters: paddedCanvas,
  args: {
    story: "path-wordmark",
  },
};

export const ScrollArrowsPage = {
  parameters: fullscreen,
  args: {
    story: "scroll-arrows",
    label: "Story row",
  },
};

export const ScrollArrowsHeader = {
  parameters: paddedCanvas,
  args: {
    story: "scroll-arrows",
    label: "Header row",
    variant: "header",
    rowOnly: true,
  },
};

export const StatBand = {
  parameters: fullscreen,
  args: {
    story: "stat-band",
    stats,
  },
};
