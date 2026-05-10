import "../src/frontend/thinkinglabs-ui/styles.css";

if (import.meta.env.DEV) {
  await import("../src/frontend/thinkinglabs-ui/storybook/styles");
}

const preview = {
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      default: "studio",
      values: [{ name: "studio", value: "#f4f4f1" }],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
