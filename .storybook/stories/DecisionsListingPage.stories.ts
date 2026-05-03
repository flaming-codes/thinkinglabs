import { DECISIONS_VIEW } from "../../src/frontend/thinkinglabs-ui/mocks";
import DecisionsListingPageComposition from "../../src/frontend/thinkinglabs-ui/pages/DecisionsListingPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Decisions Listing",
  component: DecisionsListingPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    view: DECISIONS_VIEW,
  },
};

export default meta;

export const Default = {};
