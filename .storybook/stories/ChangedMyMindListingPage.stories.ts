import { CHANGED_MY_MIND_VIEW } from "../../src/frontend/thinkinglabs-ui/mocks";
import ChangedMyMindListingPageComposition from "../../src/frontend/thinkinglabs-ui/pages/ChangedMyMindListingPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Changed My Mind Listing",
  component: ChangedMyMindListingPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    view: CHANGED_MY_MIND_VIEW,
  },
};

export default meta;

export const Default = {};
