import { CLAIMS } from "../../src/frontend/thinkinglabs-ui/mocks";
import ClaimsListingPageComposition from "../../src/frontend/thinkinglabs-ui/pages/ClaimsListingPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Claims Listing",
  component: ClaimsListingPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    claims: CLAIMS,
    totalCount: 47,
  },
};

export default meta;

export const Default = {};
