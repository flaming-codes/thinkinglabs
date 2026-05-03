import { NOW } from "../../src/storybook/thinkinglabs-ui/mocks";
import NowPageComposition from "../../src/storybook/thinkinglabs-ui/pages/NowPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Now",
  component: NowPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    themeKey: "forum",
    now: NOW,
  },
};

export default meta;

export const Default = {};
