import { CALIBRATION } from "../../src/frontend/thinkinglabs-ui/mocks";
import CalibrationPageComposition from "../../src/frontend/thinkinglabs-ui/pages/CalibrationPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Calibration",
  component: CalibrationPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    calibration: CALIBRATION,
  },
};

export default meta;

export const Default = {};
