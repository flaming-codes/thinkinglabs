import { ABOUT_KINDS } from "../../src/storybook/thinkinglabs-ui/mocks";
import AboutPageComposition from "../../src/storybook/thinkinglabs-ui/pages/AboutPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/About",
  component: AboutPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    themeKey: "forum",
    kinds: ABOUT_KINDS,
  },
};

export default meta;

export const Default = {};
