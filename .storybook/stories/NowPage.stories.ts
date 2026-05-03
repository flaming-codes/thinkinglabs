import { NOW } from "../../src/frontend/thinkinglabs-ui/mocks";
import NowPageComposition from "../../src/frontend/thinkinglabs-ui/pages/NowPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Now",
  component: NowPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    now: NOW,
  },
};

export default meta;

export const Default = {};
