import { BRAIN_DIFF } from "../../src/storybook/thinkinglabs-ui/mocks";
import BrainDiffPageComposition from "../../src/storybook/thinkinglabs-ui/pages/BrainDiffPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Brain Diff",
  component: BrainDiffPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    themeKey: "forum",
    days: BRAIN_DIFF,
  },
};

export default meta;

export const Default = {};
