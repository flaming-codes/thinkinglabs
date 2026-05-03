import { CALIBRATION } from "../../src/storybook/thinkinglabs-ui/mocks";
import CalibrationPageComposition from "../../src/storybook/thinkinglabs-ui/pages/CalibrationPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Calibration",
  component: CalibrationPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    themeKey: "forum",
    calibration: CALIBRATION,
  },
};

export default meta;

export const Default = {};
