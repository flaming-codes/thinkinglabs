import { INPUT_DETAIL } from "../../src/frontend/thinkinglabs-ui/mocks";
import InputDetailPageComposition from "../../src/frontend/thinkinglabs-ui/pages/InputDetailPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Input Detail",
  component: InputDetailPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    input: INPUT_DETAIL,
  },
};

export default meta;

export const Default = {};
