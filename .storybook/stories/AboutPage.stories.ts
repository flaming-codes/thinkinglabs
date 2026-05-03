import { ABOUT_KINDS } from "../../src/frontend/thinkinglabs-ui/mocks";
import AboutPageComposition from "../../src/frontend/thinkinglabs-ui/pages/AboutPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/About",
  component: AboutPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    kinds: ABOUT_KINDS,
  },
};

export default meta;

export const Default = {};
