import { CLAIMS } from "../../src/storybook/thinkinglabs-ui/mocks";
import ClaimsListingPageComposition from "../../src/storybook/thinkinglabs-ui/pages/ClaimsListingPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Claims Listing",
  component: ClaimsListingPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    themeKey: "forum",
    claims: CLAIMS,
    totalCount: 47,
  },
};

export default meta;

export const Default = {};

export const StarkTheme = {
  args: {
    themeKey: "sans-stark",
  },
};
