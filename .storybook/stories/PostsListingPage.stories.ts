import { POSTS } from "../../src/frontend/thinkinglabs-ui/mocks";
import PostsListingPageComposition from "../../src/frontend/thinkinglabs-ui/pages/PostsListingPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Posts Listing",
  component: PostsListingPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    posts: POSTS,
  },
};

export default meta;

export const Default = {};
