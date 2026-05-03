import { FEATURED_CLAIM_DETAIL } from "../../src/storybook/thinkinglabs-ui/mocks";
import ClaimDetailPageComposition from "../../src/storybook/thinkinglabs-ui/pages/ClaimDetailPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Claim Detail",
  component: ClaimDetailPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    themeKey: "forum",
    claim: FEATURED_CLAIM_DETAIL,
  },
};

export default meta;

export const Default = {};
