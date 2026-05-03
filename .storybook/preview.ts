import type { Preview } from "@storybook-astro/framework";
import "../src/frontend/thinkinglabs-ui/styles.css";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      default: "studio",
      values: [{ name: "studio", value: "#f4f4f1" }],
    },
  },
};

export default preview;
