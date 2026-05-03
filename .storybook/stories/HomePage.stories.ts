import { FEATURED_CLAIM, KINDS, RECENT_DIFFS } from "../../src/storybook/thinkinglabs-ui/mocks";
import HomePageComposition from "../../src/storybook/thinkinglabs-ui/pages/HomePageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Home",
  component: HomePageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    themeKey: "forum",
    kinds: KINDS,
    recentDiffs: RECENT_DIFFS,
    featuredClaim: FEATURED_CLAIM,
  },
};

export default meta;

export const Forum = {};

export const BoneAccent = {
  args: {
    themeKey: "bone-accent",
  },
};
