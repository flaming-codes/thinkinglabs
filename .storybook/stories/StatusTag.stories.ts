import StatusTag from "../../src/storybook/thinkinglabs-ui/components/StatusTag.astro";

const meta = {
  title: "Thinkinglabs/Primitives/StatusTag",
  component: StatusTag,
  args: {
    label: "active",
    tone: "active",
  },
};

export default meta;

export const Active = {};

export const Deprecated = {
  args: {
    label: "deprecated",
    tone: "deprecated",
  },
};

export const Pending = {
  args: {
    label: "○ pending",
    tone: "default",
  },
};
