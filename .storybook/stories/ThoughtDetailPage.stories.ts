import { THOUGHT_DETAIL } from "../../src/frontend/thinkinglabs-ui/mocks";
import ThoughtDetailPageComposition from "../../src/frontend/thinkinglabs-ui/pages/ThoughtDetailPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Thought Detail",
  component: ThoughtDetailPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    thought: THOUGHT_DETAIL,
  },
};

export default meta;

export const Default = {};
