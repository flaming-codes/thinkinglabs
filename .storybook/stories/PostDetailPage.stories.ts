import { POST_DETAIL } from "../../src/storybook/thinkinglabs-ui/mocks";
import PostDetailPageComposition from "../../src/storybook/thinkinglabs-ui/pages/PostDetailPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Post Detail",
  component: PostDetailPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    themeKey: "forum",
    post: POST_DETAIL,
  },
};

export default meta;

export const Default = {};
