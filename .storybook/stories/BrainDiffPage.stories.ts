import { BRAIN_DIFF } from "../../src/frontend/thinkinglabs-ui/mocks";
import BrainDiffPageComposition from "../../src/frontend/thinkinglabs-ui/pages/BrainDiffPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Brain Diff",
  component: BrainDiffPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    days: BRAIN_DIFF,
  },
};

export default meta;

export const Default = {};
