import { PREDICTIONS_VIEW } from "../../src/frontend/thinkinglabs-ui/mocks";
import PredictionsListingPageComposition from "../../src/frontend/thinkinglabs-ui/pages/PredictionsListingPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Predictions Listing",
  component: PredictionsListingPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    view: PREDICTIONS_VIEW,
  },
};

export default meta;

export const Default = {};
