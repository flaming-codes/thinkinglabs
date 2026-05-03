import { FEATURED_CLAIM_DETAIL } from "../../src/frontend/thinkinglabs-ui/mocks";
import ClaimDetailPageComposition from "../../src/frontend/thinkinglabs-ui/pages/ClaimDetailPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Claim Detail",
  component: ClaimDetailPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    claim: FEATURED_CLAIM_DETAIL,
  },
};

export default meta;

export const Default = {};
