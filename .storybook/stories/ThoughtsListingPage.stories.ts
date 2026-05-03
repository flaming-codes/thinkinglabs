import { THOUGHTS } from "../../src/frontend/thinkinglabs-ui/mocks";
import ThoughtsListingPageComposition from "../../src/frontend/thinkinglabs-ui/pages/ThoughtsListingPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Thoughts Listing",
  component: ThoughtsListingPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    thoughts: THOUGHTS,
  },
};

export default meta;

export const Default = {};
