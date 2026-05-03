import { INPUTS_VIEW } from "../../src/frontend/thinkinglabs-ui/mocks";
import InputsListingPageComposition from "../../src/frontend/thinkinglabs-ui/pages/InputsListingPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Inputs Listing",
  component: InputsListingPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    view: INPUTS_VIEW,
  },
};

export default meta;

export const Default = {};
