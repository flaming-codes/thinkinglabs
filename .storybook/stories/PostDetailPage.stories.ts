import { POST_DETAIL } from "../../src/frontend/thinkinglabs-ui/mocks";
import PostDetailPageComposition from "../../src/frontend/thinkinglabs-ui/pages/PostDetailPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Post Detail",
  component: PostDetailPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    post: POST_DETAIL,
  },
};

export default meta;

export const Default = {};
