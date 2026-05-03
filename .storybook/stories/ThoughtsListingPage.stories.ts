import { THOUGHTS } from "../../src/storybook/thinkinglabs-ui/mocks";
import ThoughtsListingPageComposition from "../../src/storybook/thinkinglabs-ui/pages/ThoughtsListingPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Thoughts Listing",
  component: ThoughtsListingPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    themeKey: "forum",
    thoughts: THOUGHTS,
  },
};

export default meta;

export const Default = {};
