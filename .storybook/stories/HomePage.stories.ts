import { KINDS } from "../../src/frontend/thinkinglabs-ui/mocks";
import HomePageComposition from "../../src/frontend/thinkinglabs-ui/pages/HomePageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Home",
  component: HomePageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    kinds: KINDS,
  },
};

export default meta;

export const Default = {};
