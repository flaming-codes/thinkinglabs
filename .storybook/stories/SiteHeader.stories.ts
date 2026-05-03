import SiteHeader from "../../src/storybook/thinkinglabs-ui/components/SiteHeader.astro";

const meta = {
  title: "Thinkinglabs/Primitives/SiteHeader",
  component: SiteHeader,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    activeNav: "Index",
  },
};

export default meta;

export const Index = {};

export const BrainDiff = {
  args: {
    activeNav: "Brain-diff",
  },
};
