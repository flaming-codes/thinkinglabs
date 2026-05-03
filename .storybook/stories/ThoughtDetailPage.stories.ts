import { THOUGHT_DETAIL } from "../../src/storybook/thinkinglabs-ui/mocks";
import ThoughtDetailPageComposition from "../../src/storybook/thinkinglabs-ui/pages/ThoughtDetailPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Thought Detail",
  component: ThoughtDetailPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    themeKey: "forum",
    thought: THOUGHT_DETAIL,
  },
};

export default meta;

export const Default = {};
