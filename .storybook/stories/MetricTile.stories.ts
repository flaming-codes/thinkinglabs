import MetricTile from "../../src/storybook/thinkinglabs-ui/components/MetricTile.astro";

const meta = {
  title: "Thinkinglabs/Primitives/MetricTile",
  component: MetricTile,
  args: {
    label: "Brier",
    value: "0.18",
    hint: "lower is better",
  },
};

export default meta;

export const Default = {};

export const Count = {
  args: {
    label: "Resolved",
    value: "26",
    hint: "of 38 total",
  },
};
