import ConfidenceMeter from "../../src/frontend/thinkinglabs-ui/components/ConfidenceMeter.astro";

const meta = {
  title: "Thinkinglabs/Primitives/ConfidenceMeter",
  component: ConfidenceMeter,
  args: {
    value: 0.82,
    previous: 0.74,
    showDelta: true,
  },
};

export default meta;

export const Increased = {};

export const New = {
  args: {
    value: 0.55,
    previous: null,
  },
};

export const Flat = {
  args: {
    value: 0.55,
    previous: 0.55,
  },
};
