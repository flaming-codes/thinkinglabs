import { POSTS } from "../../src/storybook/thinkinglabs-ui/mocks";
import PostsListingPageComposition from "../../src/storybook/thinkinglabs-ui/pages/PostsListingPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Posts Listing",
  component: PostsListingPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    themeKey: "forum",
    posts: POSTS,
  },
};

export default meta;

export const Default = {};
