import { QUESTIONS_VIEW } from "../../src/frontend/thinkinglabs-ui/mocks";
import QuestionsListingPageComposition from "../../src/frontend/thinkinglabs-ui/pages/QuestionsListingPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Questions Listing",
  component: QuestionsListingPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    view: QUESTIONS_VIEW,
  },
};

export default meta;

export const Default = {};
